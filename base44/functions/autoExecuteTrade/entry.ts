import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALPACA_BASE = 'https://paper-api.alpaca.markets';
const MIN_CONVICTION = 9;
const DEFAULT_QTY = 10;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { event, data } = await req.json();

    // Only auto-execute on create events
    if (event.type !== 'create') {
      return Response.json({ message: 'Skipped — not a create event' });
    }

    const trade = data;
    const conviction = trade.conviction_score || 0;

    // Only execute high-conviction trades
    if (conviction < MIN_CONVICTION) {
      return Response.json({ message: `Skipped — conviction ${conviction} below threshold ${MIN_CONVICTION}` });
    }

    // Don't auto-execute options
    if (trade.direction === 'put') {
      return Response.json({ message: 'Skipped — options require manual execution' });
    }

    const ticker = trade.ticker;
    if (!ticker) {
      return Response.json({ error: 'No ticker specified' }, { status: 400 });
    }

    const apiKey = Deno.env.get('ALPACA_API_KEY');
    const secretKey = Deno.env.get('ALPACA_SECRET_KEY');

    // Place market buy order
    const orderRes = await fetch(`${ALPACA_BASE}/v2/orders`, {
      method: 'POST',
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': secretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symbol: ticker.toUpperCase(),
        qty: String(DEFAULT_QTY),
        side: 'buy',
        type: 'market',
        time_in_force: 'day',
      }),
    });

    const orderData = await orderRes.json();

    if (!orderRes.ok) {
      // Update trade card with failure note
      await base44.asServiceRole.entities.TradeCard.update(trade.id, {
        pnl_notes: `Auto-execute failed: ${orderData.message}`,
      });
      return Response.json({ error: orderData.message }, { status: orderRes.status });
    }

    // Update trade card outcome
    await base44.asServiceRole.entities.TradeCard.update(trade.id, {
      outcome_status: 'entered',
      pnl_notes: `Auto-executed: BUY ${DEFAULT_QTY} ${ticker.toUpperCase()} @ market. Order ID: ${orderData.id}`,
    });

    return Response.json({
      message: `Auto-executed ${ticker} — ${orderData.side} ${orderData.qty} @ ${orderData.filled_avg_price || 'market'}`,
      order_id: orderData.id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});