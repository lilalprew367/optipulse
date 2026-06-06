import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Only accept POST requests
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const body = await req.json();
    console.log('[Twitter Webhook] Received:', JSON.stringify(body).slice(0, 500));

    // Handle both single tweet and batched tweet events
    const tweets = body.tweets || (body.tweet ? [body.tweet] : []);
    const eventType = body.event_type;

    if (!tweets || tweets.length === 0) {
      console.log('[Twitter Webhook] No tweets in payload');
      return Response.json({ success: true, message: 'No tweets to process' });
    }

    const newSignals = [];
    const processedIds = new Set();

    for (const tweet of tweets) {
      // Skip if no tweet ID or already processed in this batch
      if (!tweet.id || processedIds.has(tweet.id)) continue;
      processedIds.add(tweet.id);

      const signalId = `tweet_${tweet.id}`;

      newSignals.push({
        signal_type: 'tweet',
        source: `@${tweet.screen_name}`,
        content: tweet.text || '',
        ticker: extractTicker(tweet.text),
        signal_id: signalId,
        signal_time: new Date(tweet.created_ms || tweet.snowflake_created_ms || Date.now()).toISOString(),
        metadata: {
          tweet_id: tweet.id,
          screen_name: tweet.screen_name,
          display_name: tweet.display_name,
          type: tweet.type,
          media: tweet.media || [],
          mentions: tweet.mentions || [],
          snow_delay_ms: tweet.snow_delay_ms,
          event_type: eventType
        },
        conviction_flag: false
      });
    }

    if (newSignals.length === 0) {
      return Response.json({ success: true, message: 'No new signals to save' });
    }

    // Dedupe against last 24h of signals
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const existing = await base44.asServiceRole.entities.IntelFeed.filter({
      signal_time: { $gte: cutoff }
    });
    const existingIds = new Set(existing.map(s => s.signal_id));

    const toSave = newSignals.filter(s => !existingIds.has(s.signal_id));

    if (toSave.length > 0) {
      await Promise.all(toSave.map(signal =>
        base44.asServiceRole.entities.IntelFeed.create(signal)
      ));
      console.log(`[Twitter Webhook] Saved ${toSave.length} new tweet signals`);
    } else {
      console.log('[Twitter Webhook] All tweets already exist in database');
    }

    // Trigger real-time analysis if we have high-priority tweets
    if (eventType === 'fast_tweet' && toSave.length > 0) {
      // Optionally trigger analyzeSignals for high-priority tweets
      console.log('[Twitter Webhook] High-priority tweet received, may trigger analysis');
    }

    return Response.json({
      success: true,
      processed: toSave.length,
      total_received: tweets.length,
      duplicates: tweets.length - toSave.length
    });

  } catch (error) {
    console.log('[Twitter Webhook] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Extract ticker symbols from tweet text (e.g., $AAPL, $NVDA)
function extractTicker(text) {
  if (!text) return null;
  const matches = text.match(/\$([A-Z]{1,5})\b/g);
  if (matches && matches.length > 0) {
    return matches[0].replace('$', '');
  }
  return null;
}