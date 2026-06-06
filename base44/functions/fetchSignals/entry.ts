import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const TWITTER_ACCOUNTS = [
  "NoLimitGains", "InTheAssembly", "aleabitoreddit", "NousResearch",
  "wolfgangkasper", "PhotonBull", "regardingsemi", "DoctorTrades1",
  "BryzonX", "StonkChris", "sunxliao", "LucyBuilding",
  "PeterBerezinBCA", "StockcoachPB", "koreavaluehunt", "ParadisLabs",
  "QuantKaz", "grkportfolio", "theaiportfolios", "SantiagoAuFund",
  "ralliesarena", "patricknill", "IliaBouchouev", "GavMcCracken",
  "vulturetrades", "CKCapitalxx"
];

function isMarketHours() {
  const now = new Date();
  // Convert to ET
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = et.getDay(); // 0=Sun, 6=Sat
  const hour = et.getHours();
  const minute = et.getMinutes();
  const timeVal = hour * 60 + minute;
  const open = 9 * 60 + 30;  // 9:30am
  const close = 16 * 60;     // 4:00pm
  return day >= 1 && day <= 5 && timeVal >= open && timeVal < close;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const twitterApiKey = Deno.env.get("TWITTERAPI_IO_KEY");
    const uwApiKey = Deno.env.get("UNUSUAL_WHALES_API_KEY");
    const qqApiKey = Deno.env.get("QUIVER_QUANT_API_KEY");

    const newSignals = [];
    const savedCount = { tweets: 0, options: 0, political: 0 };

    // --- TWITTER (24/7) ---
    if (twitterApiKey) {
      const tweetFetches = TWITTER_ACCOUNTS.map(async (handle) => {
        try {
          const res = await fetch(`https://api.twitterapi.io/twitter/user/last_tweets?userName=${handle}`, {
            headers: { "X-API-Key": twitterApiKey, "Accept": "application/json" }
          });
          if (!res.ok) return;
          const data = await res.json();
          const tweets = (data?.data?.tweets || data?.tweets || []).slice(0, 3);
          for (const t of tweets) {
            if (!t.id || !t.text) continue;
            newSignals.push({
              signal_type: "tweet",
              source: `@${handle}`,
              content: t.text,
              signal_id: `tweet_${t.id}`,
              signal_time: t.createdAt || new Date().toISOString(),
              metadata: { tweet_id: t.id, url: t.url }
            });
          }
        } catch (e) {
          console.log(`[Twitter] @${handle} error: ${e.message}`);
        }
      });
      await Promise.all(tweetFetches);
    }

    // --- OPTIONS FLOW (market hours only) ---
    if (uwApiKey && isMarketHours()) {
      try {
        const res = await fetch("https://api.unusualwhales.com/api/option-trades/flow-alerts?limit=30", {
          headers: { "Authorization": `Bearer ${uwApiKey}`, "Accept": "application/json" }
        });
        if (res.ok) {
          const data = await res.json();
          for (const flow of (data?.data || []).slice(0, 20)) {
            const signalId = `flow_${flow.option_chain}_${flow.start_time}`;
            newSignals.push({
              signal_type: "options_flow",
              source: "unusual_whales",
              content: `${flow.ticker} ${flow.option_chain} — ${flow.total_size} contracts, $${flow.total_premium || '?'} premium`,
              ticker: flow.ticker,
              signal_id: signalId,
              signal_time: new Date(flow.start_time).toISOString(),
              metadata: flow
            });
          }
        }
      } catch (e) {
        console.log(`[UnusualWhales] error: ${e.message}`);
      }
    }

    // --- POLITICAL TRADES (24/7) ---
    if (qqApiKey) {
      try {
        const res = await fetch("https://api.quiverquant.com/beta/bulk/congresstrading", {
          headers: { "Authorization": `Token ${qqApiKey}`, "Accept": "application/json" }
        });
        if (res.ok) {
          const data = await res.json();
          for (const trade of (data || []).slice(0, 15)) {
            const signalId = `political_${trade.BioGuideID}_${trade.Ticker}_${trade.Traded}`;
            newSignals.push({
              signal_type: "political_trade",
              source: trade.Name || "Unknown",
              content: `${trade.Name} (${trade.Party}) — ${trade.Transaction} ${trade.Ticker} on ${trade.Traded}, ~$${trade.Trade_Size_USD}`,
              ticker: trade.Ticker,
              signal_id: signalId,
              signal_time: trade.Traded ? `${trade.Traded}T00:00:00Z` : new Date().toISOString(),
              metadata: trade
            });
          }
        }
      } catch (e) {
        console.log(`[QuiverQuant] error: ${e.message}`);
      }
    }

    // --- DEDUPE & SAVE ---
    // Load existing signal_ids from last 24h to avoid duplicates
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const existing = await base44.asServiceRole.entities.IntelFeed.filter({
      signal_time: { $gte: cutoff }
    });
    const existingIds = new Set(existing.map(s => s.signal_id).filter(Boolean));

    const toSave = newSignals.filter(s => s.signal_id && !existingIds.has(s.signal_id));

    if (toSave.length > 0) {
      await Promise.all(toSave.map(signal =>
        base44.asServiceRole.entities.IntelFeed.create(signal)
      ));
      savedCount.tweets = toSave.filter(s => s.signal_type === 'tweet').length;
      savedCount.options = toSave.filter(s => s.signal_type === 'options_flow').length;
      savedCount.political = toSave.filter(s => s.signal_type === 'political_trade').length;
    }

    console.log(`[fetchSignals] Saved ${toSave.length} new signals (${savedCount.tweets} tweets, ${savedCount.options} options, ${savedCount.political} political)`);

    return Response.json({
      success: true,
      new_signals: toSave.length,
      breakdown: savedCount,
      market_hours: isMarketHours()
    });

  } catch (error) {
    console.log(`[fetchSignals] Fatal error: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});