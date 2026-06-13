import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import GrokAgentChat from './GrokAgentChat';
import { TrendingUp, TrendingDown, RefreshCw, Zap, DollarSign } from 'lucide-react';

export default function PortfolioManager() {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderForm, setOrderForm] = useState({ ticker: '', qty: '', side: 'buy', type: 'market', limit: '' });
  const [placing, setPlacing] = useState(false);
  const [orderResult, setOrderResult] = useState(null);

  const fetchPortfolio = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('getAlpacaPortfolio', {});
      setPortfolio(res.data);
    } catch (e) {
      setError('Failed to load portfolio. Check your Alpaca API keys.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPortfolio(); }, [fetchPortfolio]);

  async function placeOrder() {
    if (!orderForm.ticker || !orderForm.qty) return;
    setPlacing(true);
    setOrderResult(null);
    try {
      const payload = {
        ticker: orderForm.ticker.toUpperCase(),
        side: orderForm.side,
        qty: parseInt(orderForm.qty),
        type: orderForm.type,
      };
      if (orderForm.type === 'limit' && orderForm.limit) {
        payload.limit_price = parseFloat(orderForm.limit);
      }
      const res = await base44.functions.invoke('placeAlpacaOrder', payload);
      if (res.data.error) {
        setOrderResult({ success: false, message: res.data.error });
      } else {
        setOrderResult({ success: true, message: `${res.data.side} ${res.data.qty} ${res.data.symbol} @ ${res.data.filled_avg_price || 'market'} — ${res.data.status}` });
        fetchPortfolio();
      }
    } catch (e) {
      setOrderResult({ success: false, message: 'Order failed' });
    } finally {
      setPlacing(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="p-6 text-center">
          <p className="text-destructive mb-3">{error}</p>
          <Button onClick={fetchPortfolio} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const pnlColor = portfolio.unrealized_pl >= 0 ? 'text-bullish' : 'text-bearish';
  const PnlIcon = portfolio.unrealized_pl >= 0 ? TrendingUp : TrendingDown;

  return (
    <div className="space-y-6">
      {/* Account Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Portfolio Value', value: `$${(portfolio.portfolio_value || 0).toLocaleString()}`, icon: DollarSign },
          { label: 'Buying Power', value: `$${(portfolio.buying_power || 0).toLocaleString()}`, icon: Zap },
          { label: 'Cash', value: `$${(portfolio.cash || 0).toLocaleString()}`, icon: DollarSign },
          { label: 'Unrealized P&L', value: `$${(portfolio.unrealized_pl || 0).toLocaleString()}`, icon: PnlIcon, color: pnlColor },
        ].map((stat, i) => (
          <Card key={i} className="border-border bg-card/60">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">{stat.label}</p>
              <p className={`text-lg font-mono font-bold mt-1 ${stat.color || 'text-foreground'}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Positions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-mono text-lg">Positions ({portfolio.positions?.length || 0})</CardTitle>
          <Button onClick={fetchPortfolio} variant="ghost" size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {portfolio.positions?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No open positions</p>
          ) : (
            <div className="space-y-3">
              {portfolio.positions?.map((pos, i) => {
                const plColor = pos.unrealized_pl >= 0 ? 'text-bullish' : 'text-bearish';
                return (
                  <div key={i} className="border border-border rounded-lg p-4 bg-muted/20 hover:border-primary/20 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-foreground text-lg">{pos.symbol}</span>
                        <Badge variant="outline" className="font-mono text-xs">{pos.qty} shares</Badge>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-foreground">${pos.market_value?.toLocaleString()}</p>
                        <p className={`font-mono text-xs ${plColor}`}>
                          {pos.unrealized_pl >= 0 ? '+' : ''}{pos.unrealized_plpc?.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground font-mono">
                      <span>Avg: ${pos.avg_entry_price?.toFixed(2)}</span>
                      <span>Current: ${pos.current_price?.toFixed(2)}</span>
                      <span className={plColor}>${pos.unrealized_pl?.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Trade */}
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-lg">Quick Trade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[100px]">
              <label className="text-xs text-muted-foreground font-mono uppercase">Ticker</label>
              <Input
                value={orderForm.ticker}
                onChange={e => setOrderForm({ ...orderForm, ticker: e.target.value })}
                placeholder="NVDA"
                className="mt-1 font-mono"
              />
            </div>
            <div className="w-20">
              <label className="text-xs text-muted-foreground font-mono uppercase">Qty</label>
              <Input
                type="number"
                value={orderForm.qty}
                onChange={e => setOrderForm({ ...orderForm, qty: e.target.value })}
                placeholder="1"
                className="mt-1 font-mono"
              />
            </div>
            <div className="w-24">
              <label className="text-xs text-muted-foreground font-mono uppercase">Side</label>
              <select
                value={orderForm.side}
                onChange={e => setOrderForm({ ...orderForm, side: e.target.value })}
                className="mt-1 w-full bg-muted border border-border rounded-md px-3 py-2 font-mono text-sm"
              >
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </div>
            <div className="w-24">
              <label className="text-xs text-muted-foreground font-mono uppercase">Type</label>
              <select
                value={orderForm.type}
                onChange={e => setOrderForm({ ...orderForm, type: e.target.value })}
                className="mt-1 w-full bg-muted border border-border rounded-md px-3 py-2 font-mono text-sm"
              >
                <option value="market">Market</option>
                <option value="limit">Limit</option>
              </select>
            </div>
            {orderForm.type === 'limit' && (
              <div className="w-24">
                <label className="text-xs text-muted-foreground font-mono uppercase">Limit $</label>
                <Input
                  type="number"
                  value={orderForm.limit}
                  onChange={e => setOrderForm({ ...orderForm, limit: e.target.value })}
                  placeholder="0.00"
                  className="mt-1 font-mono"
                />
              </div>
            )}
            <Button
              onClick={placeOrder}
              disabled={placing || !orderForm.ticker || !orderForm.qty}
              className={orderForm.side === 'buy' ? 'bg-bullish hover:bg-bullish/80' : 'bg-bearish hover:bg-bearish/80'}
            >
              {placing ? 'Placing...' : `Place ${orderForm.side?.toUpperCase()}`}
            </Button>
          </div>
          {orderResult && (
            <p className={`mt-3 text-sm font-mono ${orderResult.success ? 'text-bullish' : 'text-bearish'}`}>
              {orderResult.message}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Open Orders */}
      {portfolio.open_orders?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-lg">Open Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {portfolio.open_orders.map((o, i) => (
                <div key={i} className="flex justify-between text-sm font-mono border-b border-border pb-2">
                  <span>{o.side.toUpperCase()} {o.qty} {o.symbol} ({o.type})</span>
                  <span className="text-muted-foreground">{o.status}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}