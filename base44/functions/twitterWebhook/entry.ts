import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Only accept POST requests
    if (req.method !== 'POST') {
      console.log('[Twitter Webhook] Rejected non-POST request');
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    // Parse payload quickly
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.log('[Twitter Webhook] Invalid JSON:', e.message);
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    console.log('[Twitter Webhook] Received event:', body.event_type, 'Tweets:', Array.isArray(body.tweets) ? body.tweets.length : body.tweet ? 1 : 0);

    // Extract tweets from payload (handle different formats)
    const tweets = Array.isArray(body.tweets) 
      ? body.tweets 
      : body.tweet 
        ? [body.tweet] 
        : [];

    if (tweets.length === 0) {
      console.log('[Twitter Webhook] No tweets to process');
      return Response.json({ success: true, message: 'No tweets' });
    }

    // Build signals array
    const signalsToSave = [];
    const seenIds = new Set();

    for (const tweet of tweets) {
      try {
        const tweetId = tweet.id || tweet.tweet_id || tweet.snowflake_id;
        if (!tweetId || seenIds.has(tweetId)) continue;
        seenIds.add(tweetId);

        const screenName = tweet.screen_name || tweet.user?.screen_name || tweet.author?.username || 'unknown';
        const tweetText = tweet.text || tweet.full_text || '';
        const createdAt = tweet.created_at || tweet.created_ms || tweet.snowflake_created_ms || new Date().toISOString();

        signalsToSave.push({
          signal_type: 'tweet',
          source: `@${screenName.replace('@', '')}`,
          content: tweetText,
          ticker: extractTicker(tweetText),
          signal_id: `tweet_${tweetId}`,
          signal_time: new Date(createdAt).toISOString(),
          metadata: {
            tweet_id: tweetId,
            screen_name: screenName,
            display_name: tweet.display_name || tweet.user?.name || '',
            tweet_type: tweet.type || body.event_type || 'standard',
            media: tweet.media || [],
            mentions: tweet.mentions || [],
            hashtags: tweet.hashtags || [],
            snow_delay_ms: tweet.snow_delay_ms
          },
          conviction_flag: false
        });
      } catch (tweetError) {
        console.log('[Twitter Webhook] Error processing tweet:', tweetError.message);
      }
    }

    if (signalsToSave.length === 0) {
      console.log('[Twitter Webhook] No valid signals extracted');
      return Response.json({ success: true, processed: 0 });
    }

    // CRITICAL: Return 200 immediately to avoid delivery timeout
    // Then save asynchronously (fire-and-forget)
    const savePromise = (async () => {
      try {
        // Quick dedupe check against last 6 hours only (faster query)
        const cutoff = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
        const existing = await base44.asServiceRole.entities.IntelFeed.filter({
          signal_time: { $gte: cutoff }
        });
        const existingIds = new Set(existing.map(s => s.signal_id));

        const newSignals = signalsToSave.filter(s => !existingIds.has(s.signal_id));

        if (newSignals.length > 0) {
          await Promise.all(newSignals.map(signal =>
            base44.asServiceRole.entities.IntelFeed.create(signal)
          ));
          console.log(`[Twitter Webhook] ✓ Saved ${newSignals.length} new signals`);
        } else {
          console.log('[Twitter Webhook] All tweets already exist (deduped)');
        }
      } catch (saveError) {
        console.log('[Twitter Webhook] Save error:', saveError.message);
      }
    })();

    // Don't wait for save to complete
    savePromise.catch(e => console.log('[Twitter Webhook] Background save failed:', e.message));

    console.log('[Twitter Webhook] Returning 200 immediately');
    return Response.json({
      success: true,
      received: tweets.length,
      valid: signalsToSave.length,
      message: 'Processing'
    });

  } catch (error) {
    console.log('[Twitter Webhook] Critical error:', error.message);
    // Still return 200 to prevent retry storms on bad payloads
    return Response.json({ success: true, error_logged: true });
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