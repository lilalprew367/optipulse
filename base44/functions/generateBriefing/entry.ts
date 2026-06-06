import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const DEFAULT_SOURCES = {
  twitter_accounts: [
    "@unusual_whales", "@DeItaone", "@jimcramer", "@chamath",
    "@elonmusk", "@LeopoldAschenb", "@nancy_pelosi_trades", "@SpeakerPelosi"
  ],
  options_flow_urls: [
    "https://unusualwhales.com/flow",
    "https://www.quiverquant.com/congresstrading/"
  ],
  political_disclosure: [
    "https://www.quiverquant.com/congresstrading/",
    "https://efts.sec.gov/LATEST/search-index?q=%22Form+4%22&dateRange=custom&startdt=TODAY"
  ]
};

async function scrapeUnusualWhales() {
  const apiKey = Deno.env.get("UNUSUAL_WHALES_API_KEY");
  try {
    const res = await fetch("https://api.unusualwhales.com/api/option-trades/flow-alerts?limit=50", {
      headers: {
        "Accept": "application/json",
        ...(apiKey ? { "Authorization": `Bearer ${apiKey}` } : {})
      }
    });
    if (res.ok) {
      const data = await res.json();
      return { source: "unusual_whales", data: data?.data?.slice(0, 20) || [], success: true };
    }
    const errText = await res.text();
    return { source: "unusual_whales", data: [], success: false, note: `API error ${res.status}: ${errText.slice(0, 100)}` };
  } catch (e) {
    return { source: "unusual_whales", data: [], success: false, note: e.message };
  }
}

async function scrapeQuiverQuant() {
  const apiKey = Deno.env.get("QUIVER_QUANT_API_KEY");
  try {
    const res = await fetch("https://api.quiverquant.com/beta/bulk/congresstrading", {
      headers: {
        "Accept": "application/json",
        ...(apiKey ? { "Authorization": `Token ${apiKey}` } : {})
      }
    });
    if (res.ok) {
      const data = await res.json();
      return { source: "quiver_quant", data: data?.slice(0, 15) || [], success: true };
    }
    const errText = await res.text();
    return { source: "quiver_quant", data: [], success: false, note: `API error ${res.status}: ${errText.slice(0, 100)}` };
  } catch (e) {
    return { source: "quiver_quant", data: [], success: false, note: e.message };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow both scheduled (no auth) and manual (user auth) triggers
    let isManual = false;
    let manualUser = null;
    try {
      manualUser = await base44.auth.me();
      isManual = true;
    } catch (e) {
      // Scheduled trigger — no user auth expected
    }

    const today = new Date().toISOString().split("T")[0];

    // Check if briefing already exists for today
    const existing = await base44.asServiceRole.entities.DailyBriefing.filter({ date: today });
    if (existing.length > 0 && !isManual) {
      return Response.json({ message: "Briefing already exists for today", briefing_id: existing[0].id });
    }

    // Create a placeholder briefing with "generating" status
    const briefing = await base44.asServiceRole.entities.DailyBriefing.create({
      date: today,
      status: "generating",
      is_manual_trigger: isManual,
      market_posture: "neutral"
    });

    // Fetch tracked sources from DB
    const trackedSources = await base44.asServiceRole.entities.TrackedSource.filter({ is_active: true });
    const twitterHandles = trackedSources
      .filter(s => s.source_type === "twitter")
      .map(s => s.identifier);

    const allTwitter = [...new Set([...DEFAULT_SOURCES.twitter_accounts, ...twitterHandles])];

    // Parallel data collection
    const [unusualWhalesData, quiverData] = await Promise.all([
      scrapeUnusualWhales(),
      scrapeQuiverQuant()
    ]);

    const rawData = {
      unusual_whales: unusualWhalesData,
      quiver_quant: quiverData,
      twitter_accounts_monitored: allTwitter,
      collection_timestamp: new Date().toISOString()
    };

    // AI Analysis — generate briefing + trade cards
    const analysisPrompt = `You are AlphaEdge, an elite options trading intelligence system for a retail trader with a <$50K account.

Today's date: ${today}

DATA COLLECTED:
- Unusual Whales Flow Data: ${JSON.stringify(unusualWhalesData.data?.slice(0, 10))}
- Congressional Trading (Quiver Quant): ${JSON.stringify(quiverData.data?.slice(0, 10))}
- Monitored Twitter/X accounts: ${allTwitter.join(", ")}

TASK: Generate a comprehensive trading intelligence briefing and 3-5 HIGH-CONVICTION option trade ideas.

RISK PROFILE:
- Account size: <$50K retail trader
- Focus: Options with 1-3 month expiry
- Style: High conviction only (score 7+ out of 10)
- Risk: Defined risk plays, liquid options only
- NO 0DTE plays unless extreme conviction
- Max suggested position: $500-1500 per trade

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

Use your knowledge of current market conditions, recent earnings, macro events, and typical institutional flow patterns to generate realistic, actionable trade ideas. Factor in the monitored sources. Only include ideas with conviction score >= 7.`;

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

    // Update the briefing with AI results
    await base44.asServiceRole.entities.DailyBriefing.update(briefing.id, {
      status: "complete",
      market_posture: aiResponse.market_posture || "neutral",
      narrative: aiResponse.narrative || "",
      options_flow_summary: aiResponse.options_flow_summary || "",
      political_trades_summary: aiResponse.political_trades_summary || "",
      fintwit_summary: aiResponse.fintwit_summary || "",
      macro_summary: aiResponse.macro_summary || "",
      sources_used: ["unusual_whales", "quiver_quant", "twitter_x", ...allTwitter.slice(0, 5)],
      raw_data: rawData
    });

    // Create trade cards
    const tradeIdeas = (aiResponse.trade_ideas || []).filter(t => t.conviction_score >= 7);
    const tradeCardPromises = tradeIdeas.map(trade =>
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
    );

    await Promise.all(tradeCardPromises);

    return Response.json({
      success: true,
      briefing_id: briefing.id,
      trades_generated: tradeIdeas.length,
      market_posture: aiResponse.market_posture
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});