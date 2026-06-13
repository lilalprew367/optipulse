import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALPACA_BASE = 'https://paper-api.alpaca.markets';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKey = Deno.env.get('ALPACA_API_KEY');
    const secretKey = Deno.env.get('ALPACA_SECRET_KEY');

    const headers = {
      'APCA-API-KEY-ID': apiKey,
      'APCA-API-SECRET-KEY': secretKey,
      'Accept': 'application/json',
    };

    // Fetch account, positions, and orders in parallel
    const [accountRes, positionsRes, ordersRes] = await Promise.all([
      fetch(`${ALPACA_BASE}/v2/account`, { headers }),
      fetch(`${ALPACA_BASE}/v2/positions`, { headers }),
      fetch(`${ALPACA_BASE}/v2/orders?status=open`, { headers }),
    ]);

    const [account, positions, orders] = await Promise.all([
      accountRes.json(),
      positionsRes.json(),
      ordersRes.json(),
    ]);

    if (!accountRes.ok) {
      return Response.json({ error: account.message || 'Alpaca API error' }, { status: accountRes.status });
    }

    const portfolio = {
      cash: parseFloat(account.cash),
      portfolio_value: parseFloat(account.portfolio_value),
      equity: parseFloat(account.equity),
      buying_power: parseFloat(account.buying_power),
      daytrade_count: account.daytrade_count,
      positions: Array.isArray(positions) ? positions.map(p => ({
        symbol: p.symbol,
        qty: parseInt(p.qty),
        avg_entry_price: parseFloat(p.avg_entry_price),
        current_price: parseFloat(p.current_price),
        market_value: parseFloat(p.market_value),
        unrealized_pl: parseFloat(p.unrealized_pl),
        unrealized_plpc: parseFloat(p.unrealized_plpc),
        change_today: parseFloat(p.change_today),
      })) : [],
      open_orders: Array.isArray(orders) ? orders.map(o => ({
        id: o.id,
        symbol: o.symbol,
        qty: o.qty,
        side: o.side,
        type: o.type,
        limit_price: o.limit_price,
        status: o.status,
        created_at: o.created_at,
      })) : [],
    };

    return Response.json(portfolio);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});