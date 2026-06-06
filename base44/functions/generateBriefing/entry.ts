import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const DEFAULT_TWITTER_ACCOUNTS = [
  "NoLimitGains", "InTheAssembly", "aleabitoreddit", "NousResearch",
  "wolfgangkasper", "PhotonBull", "regardingsemi", "DoctorTrades1",
  "BryzonX", "StonkChris", "sunxliao", "LucyBuilding",
  "PeterBerezinBCA", "StockcoachPB", "koreavaluehunt", "ParadisLabs",
  "QuantKaz", "grkportfolio", "theaiportfolios", "SantiagoAuFund",
  "ralliesarena", "patricknill", "IliaBouchouev", "GavMcCracken",
  "vulturetrades", "CKCapitalxx"
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

// Fetch congressional trades via Quiver Quant API
async function fetchQuiverQuant() {
  const apiKey = Deno.env.get("QUIVER_QUANT_API_KEY");
  if (!apiKey) return { source: "quiver_quant", data: [], success: false, note: "No API key" };

  try {
    const res = await fetch("https://api.quiverquant.com/beta/bulk/congresstrading", {
      headers: { "Authorization": `Token ${apiKey}`, "Accept": "application/json" }
    });
    const text = await res.text();
    console.log(`[QuiverQuant] HTTP ${res.status}: ${text.slice(0, 300)}`);
    if (res.ok) {
      const data = JSON.parse(text);
      return { source: "quiver_quant", data: data?.slice(0, 15) || [], success: true };
    }
    return { source: "quiver_quant", data: [], success: false, note: `HTTP ${res.status}: ${text.slice(0, 100)}` };
  } catch (e) {
    console.log(`[QuiverQuant] error: ${e.message}`);
    return { source: "quiver_quant", data: [], success: false, note: e.message };
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

    // Parallel data collection from all 3 sources
    const [unusualWhalesData, quiverData, twitterData] = await Promise.all([
      fetchUnusualWhales(),
      fetchQuiverQuant(),
      fetchTwitterPosts(allTwitterHandles)
    ]);

    const rawData = {
      unusual_whales: unusualWhalesData,
      quiver_quant: quiverData,
      twitter: twitterData,
      collection_timestamp: new Date().toISOString()
    };

    // Build prompt with real data
    const analysisPrompt = `You are AlphaEdge, an elite options trading intelligence system for a retail trader with a <$50K account.

Today's date: ${today}

LIVE DATA COLLECTED:
--- Unusual Whales Options Flow (${unusualWhalesData.success ? 'LIVE' : 'unavailable'}):
${JSON.stringify(unusualWhalesData.data?.slice(0, 10))}

--- Congressional Trades - Quiver Quant (${quiverData.success ? 'LIVE' : 'unavailable'}):
${JSON.stringify(quiverData.data?.slice(0, 10))}

--- Twitter/X Posts from monitored accounts (${twitterData.success ? 'LIVE' : 'unavailable'}):
${twitterData.data?.slice(0, 20).map(t => `${t.account}: "${t.text}"`).join('\n')}

Monitored accounts: ${allTwitterHandles.map(h => '@' + h).join(', ')}

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
        quiverData.success ? "quiver_quant_live" : "quiver_quant_ai",
        twitterData.success ? "twitter_live" : "twitter_ai",
        ...allTwitterHandles.slice(0, 6).map(h => "@" + h)
      ],
      raw_data: rawData
    });

    // Create trade cards
    const tradeIdeas = (aiResponse.trade_ideas || []).filter(t => t.conviction_score >= 8);
    await Promise.all(tradeIdeas.map(trade =>
      base44.asServiceRole.entities.TradeCard.create({
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
        supporting_sources: trade.supporting_sources || [],
        risk_level: trade.risk_level,
        sector: trade.sector,
        catalyst: trade.catalyst,
        outcome_status: "open"
      })
    ));

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