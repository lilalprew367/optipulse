import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALPACA_DATA = 'https://data.alpaca.markets';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { ticker, type } = await req.json();

    if (!ticker) return Response.json({ error: 'ticker is required' }, { status: 400 });

    const apiKey = Deno.env.get('ALPACA_API_KEY');
    const secretKey = Deno.env.get('ALPACA_SECRET_KEY');

    const headers = {
      'APCA-API-KEY-ID': apiKey,
      'APCA-API-SECRET-KEY': secretKey,
      'Accept': 'application/json',
    };

    if (type === 'bars') {
      const res = await fetch(
        `${ALPACA_DATA}/v2/stocks/${ticker.toUpperCase()}/bars?timeframe=1Day&limit=30&adjustment=raw`,
        { headers }
      );
      const data = await res.json();
      if (!res.ok) return Response.json({ error: data.message }, { status: res.status });
      return Response.json({ ticker: ticker.toUpperCase(), bars: data.bars || [] });
    }

    // Default: latest quote
    const res = await fetch(
      `${ALPACA_DATA}/v2/stocks/${ticker.toUpperCase()}/quotes/latest`,
      { headers }
    );
    const data = await res.json();
    if (!res.ok) return Response.json({ error: data.message }, { status: res.status });

    return Response.json({
      ticker: ticker.toUpperCase(),
      quote: data.quote ? {
        bid: data.quote.bp,
        ask: data.quote.ap,
        bid_size: data.quote.bs,
        ask_size: data.quote.as,
      } : null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});