import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALPACA_DATA = 'https://data.alpaca.markets';

async function getAlpacaKeys(base44) {
  const keys = await base44.asServiceRole.entities.ApiKey.filter({ service: 'alpaca' });
  if (!keys?.length) return null;
  return { apiKey: keys[0].api_key, secretKey: keys[0].secret_key };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { ticker, type } = await req.json();

    if (!ticker) return Response.json({ error: 'ticker is required' }, { status: 400 });

    const keys = await getAlpacaKeys(base44);
    if (!keys) {
      return Response.json({ error: 'Alpaca API keys not configured', needs_keys: true }, { status: 400 });
    }

    const headers = {
      'APCA-API-KEY-ID': keys.apiKey,
      'APCA-API-SECRET-KEY': keys.secretKey,
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