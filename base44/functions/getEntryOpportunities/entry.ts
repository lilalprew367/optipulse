import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const avKey = Deno.env.get("ALPHA_VANTAGE_API_KEY");

    // Get recent open trades with high conviction
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const allTrades = await base44.asServiceRole.entities.TradeCard.filter({ outcome_status: 'open' });
    const highConviction = allTrades.filter(t => (t.conviction_score || 0) >= 8 && t.date >= since);

    if (highConviction.length === 0) {
      return Response.json({ opportunities: [] });
    }

    // Fetch live quotes for unique tickers
    const tickers = [...new Set(highConviction.map(t => t.ticker).filter(Boolean))];

    const quotes = {};
    if (avKey) {
      await Promise.all(tickers.map(async (ticker) => {
        try {
          const res = await fetch(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${avKey}`
          );
          if (!res.ok) return;
          const data = await res.json();
          const q = data['Global Quote'];
          if (q && q['05. price']) {
            quotes[ticker] = {
              price: parseFloat(q['05. price']),
              change_pct: parseFloat(q['10. change percent']?.replace('%', '') || 0),
              volume: parseInt(q['06. volume'] || 0),
            };
          }
        } catch (e) {
          console.log(`[Quote] ${ticker} error: ${e.message}`);
        }
      }));
    }

    // Evaluate nearness to entry for each trade
    const opportunities = highConviction.map(trade => {
      const quote = quotes[trade.ticker] || null;
      let nearEntry = false;
      let entryStatus = 'unknown';
      let distancePct = null;

      if (quote && trade.entry_range) {
        // Parse entry range like "$2.50 - $3.00" or "$195 - $200"
        const nums = trade.entry_range.match(/[\d.]+/g)?.map(Number) || [];
        if (nums.length >= 2) {
          const low = Math.min(...nums);
          const high = Math.max(...nums);
          const mid = (low + high) / 2;
          distancePct = ((quote.price - mid) / mid) * 100;
          nearEntry = Math.abs(distancePct) <= 5;
          if (quote.price >= low && quote.price <= high) {
            entryStatus = 'at_entry';
          } else if (quote.price < low) {
            entryStatus = 'below_entry';
          } else {
            entryStatus = 'above_entry';
          }
        }
      }

      return {
        ...trade,
        live_price: quote?.price || null,
        price_change_pct: quote?.change_pct || null,
        near_entry: nearEntry,
        entry_status: entryStatus,
        distance_pct: distancePct,
      };
    });

    // Sort: at_entry first, then near, then others
    const sorted = opportunities.sort((a, b) => {
      const rank = { at_entry: 0, below_entry: 1, above_entry: 2, unknown: 3 };
      if (rank[a.entry_status] !== rank[b.entry_status]) return rank[a.entry_status] - rank[b.entry_status];
      return (b.conviction_score || 0) - (a.conviction_score || 0);
    });

    return Response.json({ opportunities: sorted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});