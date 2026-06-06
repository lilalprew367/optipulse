import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const TWITTER_ACCOUNTS = [
  // Core — solid signal, macro/options/thesis focus
  "aleabitoreddit", "NousResearch", "wolfgangkasper", "PeterBerezinBCA",
  "koreavaluehunt", "ParadisLabs", "QuantKaz", "grkportfolio",
  "theaiportfolios", "SantiagoAuFund", "IliaBouchouev", "GavMcCracken",
  "vulturetrades",
  // High-conviction adds — options flow, thesis-heavy
  "Mr_Derivatives", "OptionsHawk", "3PeaksTrading", "jfahmy",
  "KobeissiLetter", "alphatrends", "PeterLBrandt"
];

const SUBSTACK_FEEDS = [
  { name: "Doomberg", url: "https://doomberg.substack.com/feed" },
  { name: "The Diff", url: "https://www.thediff.co/feed" },
  { name: "Phenom Capital", url: "https://phenomcapital.substack.com/feed" },
  { name: "Kyla's Newsletter", url: "https://kyla.substack.com/feed" },
  { name: "Concoda", url: "https://concoda.substack.com/feed" }
];

// Parse RSS XML into simple post objects
function parseRSS(xml, sourceName) {
  const items = [];
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
  for (const match of itemMatches) {
    const block = match[1];
    const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || block.match(/<title>(.*?)<\/title>/))?.[1] || "";
    const link = (block.match(/<link>(.*?)<\/link>/))?.[1] || "";
    const pubDate = (block.match(/<pubDate>(.*?)<\/pubDate>/))?.[1] || "";
    const description = (block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || block.match(/<description>(.*?)<\/description>/))?.[1] || "";
    // Strip HTML tags from description for clean text
    const cleanDesc = description.replace(/<[^>]+>/g, "").slice(0, 500);
    if (title) items.push({ title, link, pubDate, summary: cleanDesc, source: sourceName });
  }
  return items.slice(0, 3);
}

async function fetchSubstackFeeds() {
  const results = [];
  await Promise.all(SUBSTACK_FEEDS.map(async ({ name, url }) => {
    try {
      const res = await fetch(url, { headers: { "Accept": "application/rss+xml, application/xml, text/xml" } });
      if (!res.ok) return;
      const xml = await res.text();
      const posts = parseRSS(xml, name);
      posts.forEach(p => results.push(p));
    } catch (e) {
      console.log(`[Substack] ${name} error: ${e.message}`);
    }
  }));
  return results;
}

async function fetchMarketauxNews() {
  const apiKey = Deno.env.get("MARKETAUX_API_KEY");
  if (!apiKey) {
    // Fallback: fetch financial news via free RSS from Seeking Alpha / Reuters
    try {
      const res = await fetch("https://feeds.finance.yahoo.com/rss/2.0/headline?s=SPY,QQQ,AAPL,NVDA,META&region=US&lang=en-US");
      if (!res.ok) return [];
      const xml = await res.text();
      return parseRSS(xml, "Yahoo Finance").map(p => ({ ...p, isNews: true }));
    } catch (e) {
      console.log(`[News] Yahoo RSS error: ${e.message}`);
      return [];
    }
  }
  try {
    const res = await fetch(
      `https://api.marketaux.com/v1/news/all?symbols=SPY,QQQ,AAPL,NVDA,META,MSFT,AMZN,TSLA&filter_entities=true&language=en&limit=10&api_token=${apiKey}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.data || []).map(a => ({
      title: a.title,
      link: a.url,
      pubDate: a.published_at,
      summary: a.description || "",
      source: "Marketaux",
      isNews: true
    }));
  } catch (e) {
    console.log(`[Marketaux] error: ${e.message}`);
    return [];
  }
}

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

    // --- TWITTER ---
    // Tweets now arrive via webhook from stream subscription (no polling needed)
    // Webhook endpoint: functions/twitterWebhook
    console.log('[Twitter] Stream subscription active - tweets arrive via webhook');

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

    // --- SUBSTACK (24/7) ---
    const substackPosts = await fetchSubstackFeeds();
    for (const post of substackPosts) {
      const signalId = `substack_${btoa(encodeURIComponent(post.link || post.title)).slice(0, 32)}`;
      newSignals.push({
        signal_type: "substack",
        source: post.source,
        content: `${post.title} — ${post.summary}`,
        signal_id: signalId,
        signal_time: post.pubDate ? new Date(post.pubDate).toISOString() : new Date().toISOString(),
        metadata: { title: post.title, link: post.link }
      });
    }

    // --- NEWS (24/7) ---
    const newsItems = await fetchMarketauxNews();
    for (const item of newsItems) {
      const signalId = `news_${btoa(encodeURIComponent(item.link || item.title)).slice(0, 32)}`;
      newSignals.push({
        signal_type: "news",
        source: item.source,
        content: `${item.title} — ${item.summary}`,
        signal_id: signalId,
        signal_time: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        metadata: { title: item.title, link: item.link }
      });
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
      savedCount.substack = toSave.filter(s => s.signal_type === 'substack').length;
      savedCount.news = toSave.filter(s => s.signal_type === 'news').length;
    }

    console.log(`[fetchSignals] Saved ${toSave.length} new signals (${savedCount.tweets} tweets, ${savedCount.options} options, ${savedCount.political} political, ${savedCount.substack} substack, ${savedCount.news} news)`);

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