import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Pull signals from the last 2 hours for analysis
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const recentSignals = await base44.asServiceRole.entities.IntelFeed.filter({
      signal_time: { $gte: cutoff }
    });

    if (recentSignals.length === 0) {
      return Response.json({ success: true, message: "No recent signals to analyze" });
    }

    const today = new Date().toISOString().split("T")[0];

    // Format signals for the prompt
    const tweetSignals = recentSignals.filter(s => s.signal_type === 'tweet');
    const flowSignals = recentSignals.filter(s => s.signal_type === 'options_flow');
    const politicalSignals = recentSignals.filter(s => s.signal_type === 'political_trade');

    const prompt = `You are AlphaEdge, an elite options trading intelligence system for a retail trader with <$50K account.

Current time: ${new Date().toISOString()}

RECENT SIGNALS (last 2 hours):

=== TWEETS FROM MONITORED FINTWIT ACCOUNTS (${tweetSignals.length} signals) ===
${tweetSignals.slice(0, 30).map(s => `[${s.signal_time}] ${s.source}: "${s.content}"`).join('\n')}

=== OPTIONS FLOW (${flowSignals.length} signals) ===
${flowSignals.slice(0, 20).map(s => `[${s.signal_time}] ${s.content}`).join('\n')}

=== POLITICAL TRADES (${politicalSignals.length} signals) ===
${politicalSignals.slice(0, 15).map(s => `[${s.signal_time}] ${s.content}`).join('\n')}

TASKS:
1. Identify any HIGH-CONVICTION signals (score 8+/10) that warrant immediate alerts — these could fire outside market hours
2. Generate updated market thesis based on all signals
3. Generate 0-3 trade ideas with conviction 7+ only

RISK PROFILE:
- Account: <$50K retail
- Options with 1-3 month expiry preferred
- Defined risk, liquid options only
- Max position: $500-1500

OUTPUT FORMAT (strict JSON):
{
  "market_posture": "bullish|bearish|neutral|cautiously_bullish|cautiously_bearish",
  "thesis": "2-3 paragraph updated thesis based on recent signals",
  "macro_summary": "1-2 sentences on macro backdrop",
  "high_conviction_alerts": [
    {
      "title": "Short alert headline (max 10 words)",
      "body": "1-2 sentence explanation of why this is significant",
      "alert_type": "high_conviction_tweet|high_conviction_trade|political_trade|options_spike",
      "ticker": "TICKER or null",
      "conviction_score": 9,
      "source_content": "the exact signal content that triggered this"
    }
  ],
  "trade_ideas": [
    {
      "ticker": "TICKER",
      "direction": "call|put",
      "strike": "price",
      "expiry": "month year",
      "entry_range": "$X.XX - $X.XX",
      "conviction_score": 8,
      "time_horizon": "1-3 months",
      "thesis": "2-3 sentence trade thesis",
      "supporting_sources": ["source1"],
      "risk_level": "low|medium|high",
      "sector": "Sector",
      "catalyst": "Key catalyst"
    }
  ]
}

Only include high_conviction_alerts for genuinely noteworthy signals. Empty arrays are fine if nothing stands out.
Only include trade_ideas with conviction 7+.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          market_posture: { type: "string" },
          thesis: { type: "string" },
          macro_summary: { type: "string" },
          high_conviction_alerts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                body: { type: "string" },
                alert_type: { type: "string" },
                ticker: { type: "string" },
                conviction_score: { type: "number" },
                source_content: { type: "string" }
              }
            }
          },
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

    // Update today's briefing with fresh thesis, or create one
    const existing = await base44.asServiceRole.entities.DailyBriefing.filter({ date: today });
    const briefingData = {
      date: today,
      status: "complete",
      market_posture: aiResponse.market_posture || "neutral",
      narrative: aiResponse.thesis || "",
      macro_summary: aiResponse.macro_summary || "",
      sources_used: ["twitter_live", "unusual_whales_live", "quiver_quant_live"],
      fintwit_summary: `${tweetSignals.length} tweets analyzed`,
      options_flow_summary: `${flowSignals.length} flow alerts analyzed`,
      political_trades_summary: `${politicalSignals.length} political trades analyzed`
    };

    let briefingId;
    if (existing.length > 0) {
      await base44.asServiceRole.entities.DailyBriefing.update(existing[0].id, briefingData);
      briefingId = existing[0].id;
    } else {
      const created = await base44.asServiceRole.entities.DailyBriefing.create(briefingData);
      briefingId = created.id;
    }

    // Save high-conviction alerts
    const alerts = aiResponse.high_conviction_alerts || [];
    await Promise.all(alerts.map(alert =>
      base44.asServiceRole.entities.Alert.create({
        title: alert.title,
        body: alert.body,
        alert_type: alert.alert_type,
        ticker: alert.ticker || null,
        conviction_score: alert.conviction_score,
        is_read: false
      })
    ));

    // Save new trade ideas (conviction 7+)
    const tradeIdeas = (aiResponse.trade_ideas || []).filter(t => t.conviction_score >= 7);
    await Promise.all(tradeIdeas.map(trade =>
      base44.asServiceRole.entities.TradeCard.create({
        briefing_id: briefingId,
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

    console.log(`[analyzeSignals] Posture: ${aiResponse.market_posture}, Alerts: ${alerts.length}, Trades: ${tradeIdeas.length}`);

    return Response.json({
      success: true,
      market_posture: aiResponse.market_posture,
      alerts_fired: alerts.length,
      trades_generated: tradeIdeas.length,
      signals_analyzed: recentSignals.length
    });

  } catch (error) {
    console.log(`[analyzeSignals] Fatal error: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});