import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Fetch real-time quote + key stats from Alpha Vantage for a ticker
async function fetchQuote(ticker) {
  const apiKey = Deno.env.get("ALPHA_VANTAGE_API_KEY");
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${apiKey}`
    );
    const data = await res.json();
    const q = data["Global Quote"];
    if (!q || !q["05. price"]) return null;
    return {
      ticker,
      price: parseFloat(q["05. price"]),
      change_pct: q["10. change percent"],
      volume: parseInt(q["06. volume"] || "0"),
      prev_close: parseFloat(q["08. previous close"]),
      high: parseFloat(q["03. high"]),
      low: parseFloat(q["04. low"]),
    };
  } catch (e) {
    console.log(`[AlphaVantage] ${ticker} error: ${e.message}`);
    return null;
  }
}

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

    // Extract unique tickers mentioned across all signals and fetch live quotes
    const LIQUID_TICKERS = ["SPY", "QQQ", "AAPL", "NVDA", "MSFT", "AMZN", "TSLA", "META", "GOOGL", "AMD", "NFLX", "JPM", "GS", "BAC", "XLF", "XLK", "IWM"];
    const mentionedTickers = new Set();
    recentSignals.forEach(s => {
      if (s.ticker) mentionedTickers.add(s.ticker.toUpperCase());
      // Extract $TICKER mentions from content
      const matches = (s.content || "").match(/\$([A-Z]{1,5})\b/g) || [];
      matches.forEach(m => mentionedTickers.add(m.replace("$", "")));
    });
    // Union with liquid list, cap at 8 quotes to stay within free-tier rate limits
    const tickersToFetch = [...new Set([...mentionedTickers, ...LIQUID_TICKERS])]
      .filter(t => LIQUID_TICKERS.includes(t))
      .slice(0, 8);

    const quoteResults = await Promise.all(tickersToFetch.map(t => fetchQuote(t)));
    const liveQuotes = quoteResults.filter(Boolean);
    const quotesBlock = liveQuotes.length > 0
      ? liveQuotes.map(q =>
          `${q.ticker}: $${q.price} (${q.change_pct}) | Vol: ${q.volume.toLocaleString()} | H/L: $${q.high}/$${q.low}`
        ).join('\n')
      : "No live quotes available (API limit or off-hours)";

    const prompt = `You are AlphaEdge, an elite options trading intelligence system. Your ONLY job is to surface the highest-conviction, most actionable options setups for a retail trader with a sub-$50K account. Be ruthlessly selective.

Current time: ${new Date().toISOString()}

=== LIVE MARKET QUOTES (Alpha Vantage — use these for accurate strike/entry calculations) ===
${quotesBlock}

RECENT SIGNALS (last 2 hours):

=== FINTWIT TWEETS (${tweetSignals.length} signals) ===
${tweetSignals.slice(0, 30).map(s => `[${s.signal_time}] ${s.source}: "${s.content}"`).join('\n')}

=== OPTIONS FLOW (${flowSignals.length} signals) ===
${flowSignals.slice(0, 20).map(s => `[${s.signal_time}] ${s.content}`).join('\n')}

=== POLITICAL/INSIDER TRADES (${politicalSignals.length} signals) ===
${politicalSignals.slice(0, 15).map(s => `[${s.signal_time}] ${s.content}`).join('\n')}

===================================================================
ANALYSIS RULES — FOLLOW STRICTLY:
===================================================================

SIGNAL CONVERGENCE: Only generate a trade idea when 2+ independent signal types align on the same ticker/thesis (e.g., unusual flow + FinTwit mention + political buy = very high conviction). Single-source ideas should be scored lower and only included if extraordinarily strong.

LIQUIDITY FILTER (hard gate — reject anything that fails):
- Only well-known, heavily traded names: SPY, QQQ, AAPL, NVDA, MSFT, AMZN, TSLA, META, GOOGL, AMD, NFLX, JPM, GS, BAC, XLF, XLK, IWM, etc.
- Avoid micro-caps, thinly traded stocks, or names with wide bid/ask spreads.
- No 0DTE plays. Minimum 3 weeks to expiry.

STRIKE SELECTION (use the LIVE QUOTES above for precise calculations):
- Calls: 5-10% OTM for aggressive, ATM for moderate, slightly ITM for conservative.
- Puts: 5-10% OTM for aggressive, ATM for moderate.
- Always calculate and state a specific dollar strike based on the live price provided above.
- If a live quote is unavailable for a ticker, do not generate a trade idea for it.

EXPIRY: Prefer 30-60 DTE for weeklies/monthlies. Max 90 DTE. State exact month and approximate date.

POSITION SIZING (mandatory):
- Max risk per trade: $500-$1,500 for a <$50K account (1-3% max risk).
- Suggest number of contracts based on estimated premium (e.g., "$800 risk = 2 contracts at ~$4.00 premium").
- Never suggest more than $1,500 total at risk on a single idea.

CONVICTION SCORING (be honest, don't inflate):
- 10: Extraordinary — multiple strong signals, clear catalyst, liquid name, perfect setup
- 9: Excellent — strong multi-signal convergence
- 8: Good — solid signal(s), clear thesis, liquid name
- 7: Marginal — include only if setup is unusually clean
- Below 7: DO NOT include

THESIS QUALITY: Each trade idea must have:
1. Clear "why now" catalyst
2. Which specific signals from the feed are supporting it
3. What invalidates the trade (stop-loss logic)

===================================================================
TASKS:
1. Fire high-conviction alerts for any 8+ signals worth noting immediately
2. Update market posture and thesis
3. Output 0-3 trade ideas (quality over quantity — 0 is valid if nothing clears the bar)

OUTPUT — STRICT JSON, NO PROSE OUTSIDE JSON:
{
  "market_posture": "bullish|bearish|neutral|cautiously_bullish|cautiously_bearish",
  "thesis": "2-3 paragraph thesis grounded in the actual signals above",
  "macro_summary": "1-2 sentences on macro backdrop",
  "high_conviction_alerts": [
    {
      "title": "Concise alert headline (max 10 words)",
      "body": "1-2 sentences on why this signal is significant right now",
      "alert_type": "high_conviction_tweet|high_conviction_trade|political_trade|options_spike",
      "ticker": "TICKER or null",
      "conviction_score": 9,
      "source_content": "exact signal text that triggered this alert"
    }
  ],
  "trade_ideas": [
    {
      "ticker": "TICKER",
      "direction": "call|put",
      "strike": "exact strike price (e.g. 195)",
      "expiry": "e.g. Jul 18 2025",
      "entry_range": "$X.XX - $X.XX (estimated premium range)",
      "position_size": "e.g. 2 contracts (~$900 total risk)",
      "risk_reward": "e.g. 1:3 (risk $900 to make ~$2700)",
      "conviction_score": 8,
      "time_horizon": "weekly|monthly|1-3 months",
      "thesis": "3-4 sentences: why this trade, what signals support it, what invalidates it",
      "supporting_sources": ["exact source handles or signal types from the feed"],
      "risk_level": "low|medium|high",
      "sector": "Sector",
      "catalyst": "Specific upcoming catalyst or reason for near-term move"
    }
  ]
}

REMINDER: Return ONLY the JSON object. No commentary before or after. Empty arrays for alerts/trades are acceptable and preferred over low-quality entries.`;

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
                position_size: { type: "string" },
                risk_reward: { type: "string" },
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
    const tradeIdeas = (aiResponse.trade_ideas || []).filter(t => t.conviction_score >= 8);
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
        thesis: `${trade.thesis}${trade.position_size ? `\n\nPosition: ${trade.position_size}` : ''}${trade.risk_reward ? ` | R/R: ${trade.risk_reward}` : ''}`,
        supporting_sources: trade.supporting_sources || [],
        risk_level: trade.risk_level,
        sector: trade.sector,
        catalyst: trade.catalyst,
        outcome_status: "open"
      })
    ));

    console.log(`[analyzeSignals] Posture: ${aiResponse.market_posture}, Alerts: ${alerts.length}, Trades: ${tradeIdeas.length}, Live quotes: ${liveQuotes.length}`);

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