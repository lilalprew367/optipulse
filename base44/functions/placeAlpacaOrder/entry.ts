import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALPACA_BASE = 'https://paper-api.alpaca.markets';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { ticker, side, qty, type, limit_price, time_in_force } = await req.json();

    if (!ticker || !side || !qty) {
      return Response.json({ error: 'ticker, side, and qty are required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('ALPACA_API_KEY');
    const secretKey = Deno.env.get('ALPACA_SECRET_KEY');

    const body = {
      symbol: ticker.toUpperCase(),
      qty: String(qty),
      side: side, // 'buy' or 'sell'
      type: type || 'market',
      time_in_force: time_in_force || 'day',
    };

    if (type === 'limit' && limit_price) {
      body.limit_price = String(limit_price);
    }

    const res = await fetch(`${ALPACA_BASE}/v2/orders`, {
      method: 'POST',
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': secretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return Response.json({ error: data.message || 'Order failed' }, { status: res.status });
    }

    return Response.json({
      id: data.id,
      symbol: data.symbol,
      side: data.side,
      qty: data.qty,
      type: data.type,
      limit_price: data.limit_price,
      status: data.status,
      filled_avg_price: data.filled_avg_price,
      created_at: data.created_at,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});