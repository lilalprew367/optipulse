import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const DEFAULT_TWITTER_ACCOUNTS = [
  // Core — solid signal, macro/options/thesis focus
  "aleabitoreddit", "NousResearch", "wolfgangkasper", "PeterBerezinBCA",
  "koreavaluehunt", "ParadisLabs", "QuantKaz", "grkportfolio",
  "theaiportfolios", "SantiagoAuFund", "IliaBouchouev", "GavMcCracken",
  "vulturetrades",
  // High-conviction adds — options flow, thesis-heavy
  "Mr_Derivatives", "OptionsHawk", "3PeaksTrading", "jfahmy",
  "KobeissiLetter", "alphatrends", "PeterLBrandt"
];

// Fetch latest tweets from a list of accounts via twitterapi.io
async function fetchTwitterPosts(handles) {
  const apiKey = Deno.env.get("TWITTERAPI_IO_KEY");
  if (!apiKey) return { source: "twitter", data: [], success: false, note: "No API key" };

  const results = [];
  // Paid tier: fetch all accounts in parallel
  await Promise.all(handles.map(async (handle) => {
    try {
      const clean = handle.replace("@", "");
      const url = `https://api.twitterapi.io/twitter/user/last_tweets?userName=${clean}`;
      const res = await fetch(url, {
        headers: { "X-API-Key": apiKey, "Accept": "application/json" }
      });
      const responseText = await res.text();
      console.log(`[Twitter] @${clean} → HTTP ${res.status}: ${responseText.slice(0, 200)}`);
      if (res.ok) {
        const data = JSON.parse(responseText);
        const tweets = (data?.data?.tweets || data?.tweets || []).slice(0, 5);
        tweets.forEach(t => results.push({
          account: `@${clean}`,
          text: t.text || "",
          created_at: t.createdAt || ""
        }));
      }
    } catch (e) {
      console.log(`[Twitter] @${handle} error: ${e.message}`);
    }
  }));

  return { source: "twitter", data: results, success: results.length > 0 };
}

// Fetch unusual options flow via Unusual Whales API
async function fetchUnusualWhales() {
  const apiKey = Deno.env.get("UNUSUAL_WHALES_API_KEY");
  if (!apiKey) return { source: "unusual_whales", data: [], success: false, note: "No API key" };

  try {
    const res = await fetch("https://api.unusualwhales.com/api/option-trades/flow-alerts?limit=30", {
      headers: { "Authorization": `Bearer ${apiKey}`, "Accept": "application/json" }
    });
    const text = await res.text();
    console.log(`[UnusualWhales] HTTP ${res.status}: ${text.slice(0, 300)}`);
    if (res.ok) {
      const data = JSON.parse(text);
      return { source: "unusual_whales", data: data?.data?.slice(0, 20) || [], success: true };
    }
    return { source: "unusual_whales", data: [], success: false, note: `HTTP ${res.status}: ${text.slice(0, 100)}` };
  } catch (e) {
    console.log(`[UnusualWhales] error: ${e.message}`);
    return { source: "unusual_whales", data: [], success: false, note: e.message };
  }
}

// Fetch all major Quiver Quant datasets sequentially to respect rate limits
async function fetchQuiverQuant() {
  const apiKey = Deno.env.get("QUIVER_QUANT_API_KEY");
  if (!apiKey) return { source: "quiver_quant", congress: [], senate: [], house: [], insiders: [], hedgeFunds: [], success: false, note: "No API key" };

  const qqHeaders = { "Authorization": `Token ${apiKey}`, "Accept": "application/json" };

  async function fetchEndpoint(endpoint) {
    try {
      const res = await fetch(`https://api.quiverquant.com/beta/bulk/${endpoint}`, { headers: qqHeaders });
      const text = await res.text();
      console.log(`[QuiverQuant] ${endpoint} HTTP ${res.status}: ${text.slice(0, 200)}`);
      if (res.ok) return JSON.parse(text);
      return [];
    } catch (e) {
      console.log(`[QuiverQuant] ${endpoint} error: ${e.message}`);
      return [];
    }
  }

  // Sequential fetches with delays to avoid rate limiting
  const congress = await fetchEndpoint("congresstrading");
  await new Promise(r => setTimeout(r, 400));
  const senate = await fetchEndpoint("senatetrading");
  await new Promise(r => setTimeout(r, 400));
  const house = await fetchEndpoint("housetrading");
  await new Promise(r => setTimeout(r, 400));
  const insiders = await fetchEndpoint("insidertrading");
  await new Promise(r => setTimeout(r, 400));
  const hedgeFunds = await fetchEndpoint("hedgefunds13f");

  const anySuccess = congress.length > 0 || senate.length > 0 || insiders.length > 0 || hedgeFunds.length > 0;
  return {
    source: "quiver_quant",
    congress: congress.slice(0, 10),
    senate: senate.slice(0, 8),
    house: house.slice(0, 8),
    insiders: insiders.slice(0, 12),
    hedgeFunds: hedgeFunds.slice(0, 12),
    success: anySuccess
  };
}

const SUBSTACK_FEEDS = [
  { name: "Doomberg", url: "https://doomberg.substack.com/feed" },
  { name: "The Diff", url: "https://www.thediff.co/feed" },
  { name: "Phenom Capital", url: "https://phenomcapital.substack.com/feed" },
  { name: "Kyla's Newsletter", url: "https://kyla.substack.com/feed" },
  { name: "Concoda", url: "https://concoda.substack.com/feed" }
];

function parseRSS(xml, sourceName) {
  const items = [];
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
  for (const match of itemMatches) {
    const block = match[1];
    const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || block.match(/<title>(.*?)<\/title>/))?.[1] || "";
    const link = (block.match(/<link>(.*?)<\/link>/))?.[1] || "";
    const pubDate = (block.match(/<pubDate>(.*?)<\/pubDate>/))?.[1] || "";
    const description = (block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || block.match(/<description>(.*?)<\/description>/))?.[1] || "";
    const cleanDesc = description.replace(/<[^>]+>/g, "").slice(0, 600);
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
      parseRSS(xml, name).forEach(p => results.push(p));
    } catch (e) {
      console.log(`[Substack] ${name} error: ${e.message}`);
    }
  }));
  return results;
}

async function fetchMarketauxNews() {
  const apiKey = Deno.env.get("MARKETAUX_API_KEY");
  if (!apiKey) {
    try {
      const res = await fetch("https://feeds.finance.yahoo.com/rss/2.0/headline?s=SPY,QQQ,AAPL,NVDA,META&region=US&lang=en-US");
      if (!res.ok) return [];
      const xml = await res.text();
      return parseRSS(xml, "Yahoo Finance");
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
      title: a.title, link: a.url, pubDate: a.published_at, summary: a.description || "", source: "Marketaux"
    }));
  } catch (e) {
    console.log(`[Marketaux] error: ${e.message}`);
    return [];
  }
}

// Build a performance feedback block from historical closed trade cards
async function getPerformanceContext(base44) {
  try {
    const allTrades = await base44.asServiceRole.entities.TradeCard.list();
    const closed = allTrades.filter(t => t.outcome_status === 'closed_win' || t.outcome_status === 'closed_loss' || t.outcome_status === 'expired');
    if (closed.length === 0) return null;

    const total = closed.length;
    const wins = closed.filter(t => t.outcome_status === 'closed_win').length;
    const losses = closed.filter(t => t.outcome_status === 'closed_loss').length;
    const expired = closed.filter(t => t.outcome_status === 'expired').length;
    const winRate = ((wins / total) * 100).toFixed(1);

    // Win rate by conviction score bucket
    const byConviction = {};
    for (const t of closed) {
      const score = t.conviction_score;
      if (!score) continue;
      if (!byConviction[score]) byConviction[score] = { wins: 0, total: 0 };
      byConviction[score].total++;
      if (t.outcome_status === 'closed_win') byConviction[score].wins++;
    }
    const convictionLines = Object.entries(byConviction)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([score, d]) => `  Score ${score}: ${d.wins}W / ${d.total - d.wins}L (${((d.wins / d.total) * 100).toFixed(0)}% win rate)`);

    // Win rate by direction
    const calls = closed.filter(t => t.direction === 'call');
    const puts = closed.filter(t => t.direction === 'put');
    const callWinRate = calls.length ? ((calls.filter(t => t.outcome_status === 'closed_win').length / calls.length) * 100).toFixed(0) : 'N/A';
    const putWinRate = puts.length ? ((puts.filter(t => t.outcome_status === 'closed_win').length / puts.length) * 100).toFixed(0) : 'N/A';

    // Win rate by sector
    const bySector = {};
    for (const t of closed) {
      const s = t.sector || 'Unknown';
      if (!bySector[s]) bySector[s] = { wins: 0, total: 0 };
      bySector[s].total++;
      if (t.outcome_status === 'closed_win') bySector[s].wins++;
    }
    const sectorLines = Object.entries(bySector)
      .filter(([, d]) => d.total >= 2)
      .map(([sector, d]) => `  ${sector}: ${((d.wins / d.total) * 100).toFixed(0)}% win rate (${d.total} trades)`);

    // Recent losses (last 5) for pattern recognition
    const recentLosses = closed
      .filter(t => t.outcome_status === 'closed_loss' || t.outcome_status === 'expired')
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5)
      .map(t => `  ${t.date} | ${t.ticker} ${t.direction?.toUpperCase()} | Score ${t.conviction_score} | ${t.pnl_notes || 'no notes'}`);

    return `=== YOUR HISTORICAL PERFORMANCE (use this to self-calibrate) ===
Overall: ${wins}W / ${losses}L / ${expired} expired — ${winRate}% win rate across ${total} closed trades
Calls: ${callWinRate}% win rate | Puts: ${putWinRate}% win rate

Win Rate by Conviction Score:
${convictionLines.join('\n') || '  Insufficient data'}

Win Rate by Sector:
${sectorLines.join('\n') || '  Insufficient data'}

Recent Losses (learn from these):
${recentLosses.join('\n') || '  None'}

SELF-CALIBRATION RULES (mandatory):
- If your conviction 8 trades have <50% win rate historically, be MORE selective — raise the bar to 9+ for new ideas
- If calls are underperforming puts, scrutinize bullish setups more carefully
- If a sector has <40% win rate, require stronger multi-source confirmation before including it
- Reference your past losses above: are there patterns (wrong expiry, wrong direction, single-source signals)? Avoid repeating them
===================================================================`;
  } catch (e) {
    console.log('[Performance] Failed to load context:', e.message);
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow both scheduled (no auth) and manual (user auth) triggers
    let isManual = false;
    try {
      await base44.auth.me();
      isManual = true;
    } catch (e) {}

    const today = new Date().toISOString().split("T")[0];

    // Check if briefing already exists for today (skip if scheduled, allow manual re-run)
    const existing = await base44.asServiceRole.entities.DailyBriefing.filter({ date: today });
    if (existing.length > 0 && !isManual) {
      return Response.json({ message: "Briefing already exists for today", briefing_id: existing[0].id });
    }

    // Create placeholder briefing with "generating" status
    const briefing = await base44.asServiceRole.entities.DailyBriefing.create({
      date: today,
      status: "generating",
      is_manual_trigger: isManual,
      market_posture: "neutral"
    });

    // Fetch tracked sources from DB
    const trackedSources = await base44.asServiceRole.entities.TrackedSource.filter({ is_active: true });
    const dbTwitterHandles = trackedSources
      .filter(s => s.source_type === "twitter")
      .map(s => s.identifier.replace("@", ""));

    const allTwitterHandles = [...new Set([...DEFAULT_TWITTER_ACCOUNTS, ...dbTwitterHandles])];

    // Parallel data collection from all sources + historical performance context
    const [unusualWhalesData, quiverData, twitterData, substackData, newsData, perfContext] = await Promise.all([
      fetchUnusualWhales(),
      fetchQuiverQuant(),
      fetchTwitterPosts(allTwitterHandles),
      fetchSubstackFeeds(),
      fetchMarketauxNews(),
      getPerformanceContext(base44)
    ]);

    const rawData = {
      unusual_whales: unusualWhalesData,
      quiver_quant: quiverData,
      twitter: twitterData,
      substack: { data: substackData, success: substackData.length > 0 },
      news: { data: newsData, success: newsData.length > 0 },
      collection_timestamp: new Date().toISOString()
    };

    // Build prompt with real data
    const analysisPrompt = `You are AlphaEdge, an elite options trading intelligence system for a retail trader with a <$50K account.

Today's date: ${today}

${perfContext || '(No historical trade data yet — this is early in your learning cycle)'}

LIVE DATA COLLECTED:
--- Unusual Whales Options Flow (${unusualWhalesData.success ? 'LIVE' : 'unavailable'}):
${JSON.stringify(unusualWhalesData.data?.slice(0, 10))}

--- Congressional Trades (${quiverData.success ? 'LIVE' : 'unavailable'}):
${JSON.stringify(quiverData.congress)}

--- Senate Trades (${quiverData.success ? 'LIVE' : 'unavailable'}):
${JSON.stringify(quiverData.senate)}

--- House Trades (${quiverData.success ? 'LIVE' : 'unavailable'}):
${JSON.stringify(quiverData.house)}

--- Insider Trades - C-Suite (${quiverData.success ? 'LIVE' : 'unavailable'}):
${JSON.stringify(quiverData.insiders)}

--- Hedge Fund 13F Filings (${quiverData.success ? 'LIVE' : 'unavailable'}):
${JSON.stringify(quiverData.hedgeFunds)}

--- Twitter/X Posts from monitored accounts (${twitterData.success ? 'LIVE' : 'unavailable'}):
${twitterData.data?.slice(0, 20).map(t => `${t.account}: "${t.text}"`).join('\n')}

Monitored accounts: ${allTwitterHandles.map(h => '@' + h).join(', ')}

--- Substack Long-Form Theses (${substackData.length > 0 ? 'LIVE' : 'unavailable'}):
${substackData.map(p => `[${p.source}] "${p.title}" — ${p.summary}`).join('\n')}

--- Market News Headlines (${newsData.length > 0 ? 'LIVE' : 'unavailable'}):
${newsData.map(n => `[${n.source}] "${n.title}" — ${n.summary}`).join('\n')}

TWITTER SIGNAL FILTER: Focus heavily on high-conviction tweets that mention specific tickers, strikes, expiry, entry ideas, or clear theses. Prioritize posts with language like "sized in", "high conviction", "loading", "thesis", or risk discussion. Aggressively filter out vague hype, memes, self-promo, and low-substance noise. Only surface ideas with real edge when combined with options flow or political data.

HEDGE FUND 13F WEIGHTING (HIGHEST INSTITUTIONAL SIGNAL):
A hedge fund adding a significant position is one of the strongest bullish signals. When a hedge fund buy aligns with unusual options flow on the same ticker, treat as near-maximum conviction (+2 to score). Tier-1 funds (Bridgewater, Citadel, Point72, Millennium, Renaissance, Tiger, etc.) carry more weight. Exits/reductions are bearish signals.

INSIDER TRADE WEIGHTING (VERY STRONG SIGNAL):
C-suite insider BUYS are among the most reliable bullish signals — insiders only buy when they have genuine conviction. Prioritize CEO, CFO, COO, Director buys. Large amounts (>$500K) are especially meaningful. Insider buys + unusual options flow = very high conviction (+1 to score). Insider SELLS are weak unless multiple C-suite members selling simultaneously.

POLITICAL TRADE WEIGHTING:
Congressional trades (Senate + House combined) are meaningful but secondary to hedge fund and insider signals. Cross-party buys on the same ticker are stronger than single-party activity.

SUBSTACK WEIGHTING: Long-form Substack theses (Doomberg, The Diff, Phenom Capital, etc.) represent deep independent research. When a Substack thesis aligns with unusual options flow AND/OR FinTwit conviction on the same ticker or macro theme, treat it as a strong corroborating signal — worth +1 to conviction score. A Substack piece alone is not a trade trigger, but in combination with flow or political data it significantly elevates conviction. Quote the publication name and thesis angle when referencing.

TECHNICAL CHART ANALYSIS — apply to every trade idea candidate:
For each ticker under consideration, reason through chart structure using your knowledge of technical analysis and the current macro environment (today: ${today}):
- SUPPORT/RESISTANCE: Identify the nearest key levels. Is price at/near a major support, resistance, prior high/low, or round number? Is it mid-range or extended?
- MOVING AVERAGES: Reason about where price likely sits relative to key MAs (20, 50, 200-day). Recently crossed? Holding above/below?
- MOMENTUM: Is momentum building or fading based on recent price action? Volume expanding or contracting?
- BREAKOUT/BREAKDOWN: Any pattern forming — bull flag, ascending triangle, double top, wedge? What confirms or negates it?
- ENTRY TRIGGER: Suggest a precise entry condition (e.g. "Enter on pullback to $X with volume drying up", "Enter on break above $Y on strong volume", "Wait for daily close above $Z").
- STRIKE ALIGNMENT: Does the suggested strike align with chart structure? Adjust if the chart suggests a cleaner level.
- TECHNICAL FLAG: State clearly if the technical setup STRENGTHENS or WEAKENS the thesis.

NEWS WEIGHTING: Breaking market news should be cross-referenced with options flow. Unusual flow that precedes or coincides with a news catalyst is one of the highest-signal combinations. Flag any cases where flow appears to "front-run" a news item.

TASK: Aggressively filter for HIGH-CONVICTION signals only.

SIGNAL QUALITY FILTER — apply before generating any trade idea:
✅ INCLUDE signals that have: specific ticker + strike/expiry + clear thesis or catalyst + risk discussion
✅ INCLUDE signals confirmed by 2+ independent data sources (e.g., unusual flow + congressional buy + FinTwit mention)
❌ DISCARD: hype, memes, "to the moon", vague sentiment, paid promo language, no price levels, no catalyst
❌ DISCARD: single-source signals with no corroborating flow or political data
❌ DISCARD: illiquid names, micro-caps, or anything with wide bid/ask spreads

CONVICTION GATE — mandatory hard filter:
- Minimum conviction score to include a trade: 8/10
- Below 8 = do not include, even if setup looks decent
- 0 trade ideas is a valid and preferred output over padding with weak setups

RISK PROFILE:
- Account size: <$50K retail trader
- Focus: Options with 1-3 month expiry (30–90 DTE preferred)
- Liquid names only: SPY, QQQ, AAPL, NVDA, MSFT, AMZN, TSLA, META, GOOGL, AMD, NFLX, JPM, GS, BAC, XLF, XLK, IWM, and similar large-caps
- Defined risk plays only — long calls/puts, no naked positions
- NO 0DTE plays
- Max position risk: $500–$1,500 per trade (suggest contracts accordingly)

CONFLUENCE SCORING (use this to set conviction_score):
- 1 signal source only → max score 7 (do not include)
- 2 sources aligned → score 8 possible
- 3+ sources aligned with clear catalyst → score 9–10

OUTPUT FORMAT (strict JSON):
{
  "market_posture": "bullish|bearish|neutral|cautiously_bullish|cautiously_bearish",
  "narrative": "2-4 paragraph morning briefing narrative covering macro, options flow, political trades, fintwit sentiment",
  "options_flow_summary": "2-3 sentences on notable options flow",
  "political_trades_summary": "2-3 sentences on political/insider activity",
  "fintwit_summary": "2-3 sentences on social media signals from monitored accounts",
  "macro_summary": "2-3 sentences on macro backdrop",
  "trade_ideas": [
  {
  "ticker": "TICKER",
  "direction": "call|put",
  "strike": "price",
  "expiry": "month year or date range",
  "entry_range": "$X.XX - $X.XX",
  "conviction_score": 8,
  "time_horizon": "1-3 months",
  "thesis": "2-3 sentence explanation of the trade",
  "technical_confluence": "Chart analysis: key support/resistance levels, MA positioning, momentum, breakout pattern if any, precise entry trigger, and whether technical setup STRENGTHENS or WEAKENS the thesis",
  "supporting_sources": ["unusual_whales", "congressional_trades"],
  "risk_level": "low|medium|high",
  "sector": "Technology",
  "catalyst": "Key upcoming catalyst"
  }
  ]
  }

Only include trade ideas with conviction_score >= 8. Quality over quantity — 0 ideas is better than weak ones. Use the live data above as primary signal, supplemented by your market knowledge.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          market_posture: { type: "string" },
          narrative: { type: "string" },
          options_flow_summary: { type: "string" },
          political_trades_summary: { type: "string" },
          fintwit_summary: { type: "string" },
          macro_summary: { type: "string" },
          trade_ideas: {
            type: "array",
            items: {
              type: "object",
              properties: {
                ticker: { type: "string" },
                direction: { type: "string" },
                strike: { type: "string" },
                expiry: { type: "string" },
                entry_range: { type: "string" },
                conviction_score: { type: "number" },
                time_horizon: { type: "string" },
                thesis: { type: "string" },
                technical_confluence: { type: "string" },
                supporting_sources: { type: "array", items: { type: "string" } },
                risk_level: { type: "string" },
                sector: { type: "string" },
                catalyst: { type: "string" }
              }
            }
          }
        }
      }
    });

    // Update briefing with results
    await base44.asServiceRole.entities.DailyBriefing.update(briefing.id, {
      status: "complete",
      market_posture: aiResponse.market_posture || "neutral",
      narrative: aiResponse.narrative || "",
      options_flow_summary: aiResponse.options_flow_summary || "",
      political_trades_summary: aiResponse.political_trades_summary || "",
      fintwit_summary: aiResponse.fintwit_summary || "",
      macro_summary: aiResponse.macro_summary || "",
      sources_used: [
        unusualWhalesData.success ? "unusual_whales_live" : "unusual_whales_ai",
        quiverData.success ? "quiver_quant_live (congress+senate+house+insiders+hedgefunds)" : "quiver_quant_ai",
        twitterData.success ? "twitter_live" : "twitter_ai",
        substackData.length > 0 ? "substack_live" : "substack_unavailable",
        newsData.length > 0 ? "news_live" : "news_unavailable",
        ...allTwitterHandles.slice(0, 6).map(h => "@" + h)
      ],
      raw_data: rawData
    });

    // Create trade cards and send Telegram alerts
    const tradeIdeas = (aiResponse.trade_ideas || []).filter(t => t.conviction_score >= 8);
    await Promise.all(tradeIdeas.map(async (trade) => {
      await base44.asServiceRole.entities.TradeCard.create({
        briefing_id: briefing.id,
        date: today,
        ticker: trade.ticker,
        direction: trade.direction,
        strike: trade.strike,
        expiry: trade.expiry,
        entry_range: trade.entry_range,
        conviction_score: trade.conviction_score,
        time_horizon: trade.time_horizon,
        thesis: trade.thesis,
        technical_confluence: trade.technical_confluence || null,
        supporting_sources: trade.supporting_sources || [],
        risk_level: trade.risk_level,
        sector: trade.sector,
        catalyst: trade.catalyst,
        outcome_status: "open"
      });
    }));

    // Send daily briefing summary via Telegram to users who enabled it
    try {
      const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
      if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN not set');

      const allUsers = await base44.asServiceRole.entities.User.list();
      const optedInUsers = allUsers.filter(u => u.telegram_chat_id && u.telegram_daily_briefing === true);

      if (optedInUsers.length === 0) {
        console.log('[Telegram] No users opted in for daily briefing');
      } else {
        const emoji = aiResponse.market_posture === 'bullish' ? '🟢' : aiResponse.market_posture === 'bearish' ? '🔴' : '🟡';
        const tradesText = tradeIdeas.length > 0
          ? `${tradeIdeas.length} high-conviction setup${tradeIdeas.length > 1 ? 's' : ''}\n` +
            tradeIdeas.slice(0, 3).map(t => `• ${t.ticker} ${t.direction.toUpperCase()} (${t.conviction_score}/10)`).join('\n')
          : 'No trades today';

        const message = `${emoji} <b>AlphaEdge Daily Briefing</b> — ${today}\n\n` +
          `<b>Market Posture:</b> ${aiResponse.market_posture.replace(/_/g, ' ').toUpperCase()}\n\n` +
          `<b>Summary:</b> ${(aiResponse.narrative || '').slice(0, 300)}...\n\n` +
          `<b>Trade Ideas:</b>\n${tradesText}\n\n` +
          `<b>Options Flow:</b> ${aiResponse.options_flow_summary?.slice(0, 150) || 'See app'}\n\n` +
          `Open the app to view full details.`;

        await Promise.all(optedInUsers.map(async (user) => {
          try {
            const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: user.telegram_chat_id, text: message, parse_mode: 'HTML' })
            });
            const result = await res.json();
            if (!result.ok) {
              console.log('[Telegram] Failed for user', user.id, result.description);
            }
          } catch (e) {
            console.log('[Telegram] Error for user', user.id, e.message);
          }
        }));
        console.log('[Telegram] Daily briefing sent to', optedInUsers.length, 'users');
      }
    } catch (e) {
      console.log('[Telegram] Failed to send daily briefing:', e.message);
    }

    return Response.json({
      success: true,
      briefing_id: briefing.id,
      trades_generated: tradeIdeas.length,
      market_posture: aiResponse.market_posture,
      data_sources: {
        unusual_whales: unusualWhalesData.success ? "live" : "ai_fallback",
        quiver_quant: quiverData.success ? "live" : "ai_fallback",
        twitter: twitterData.success ? `live (${twitterData.data.length} tweets)` : "ai_fallback"
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});