import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALPACA_BASE = 'https://paper-api.alpaca.markets';
const MIN_CONVICTION = 9;
const DEFAULT_QTY = 10;

async function getAlpacaKeys(base44) {
  const keys = await base44.asServiceRole.entities.ApiKey.filter({ service: 'alpaca' });
  if (!keys?.length) return null;
  return { apiKey: keys[0].api_key, secretKey: keys[0].secret_key };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { event, data } = await req.json();

    if (event.type !== 'create') {
      return Response.json({ message: 'Skipped — not a create event' });
    }

    const trade = data;
    const conviction = trade.conviction_score || 0;

    if (conviction < MIN_CONVICTION) {
      return Response.json({ message: `Skipped — conviction ${conviction} below threshold ${MIN_CONVICTION}` });
    }

    if (trade.direction === 'put') {
      return Response.json({ message: 'Skipped — options require manual execution' });
    }

    const ticker = trade.ticker;
    if (!ticker) {
      return Response.json({ error: 'No ticker specified' }, { status: 400 });
    }

    const keys = await getAlpacaKeys(base44);
    if (!keys) {
      return Response.json({ error: 'Alpaca API keys not configured' }, { status: 400 });
    }

    const orderRes = await fetch(`${ALPACA_BASE}/v2/orders`, {
      method: 'POST',
      headers: {
        'APCA-API-KEY-ID': keys.apiKey,
        'APCA-API-SECRET-KEY': keys.secretKey,
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
      await base44.asServiceRole.entities.TradeCard.update(trade.id, {
        pnl_notes: `Auto-execute failed: ${orderData.message}`,
      });
      return Response.json({ error: orderData.message }, { status: orderRes.status });
    }

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