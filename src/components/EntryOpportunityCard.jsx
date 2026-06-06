import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Zap, Target, CheckCircle, BookmarkPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const statusConfig = {
  at_entry: { label: '🎯 AT ENTRY', color: 'text-bullish border-bullish/40 bg-bullish/10', pulse: true },
  below_entry: { label: '⬇ BELOW ENTRY', color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/5', pulse: false },
  above_entry: { label: '⬆ ABOVE ENTRY', color: 'text-muted-foreground border-border bg-muted/20', pulse: false },
  unknown: { label: 'PRICE PENDING', color: 'text-muted-foreground border-border bg-muted/20', pulse: false },
};

export default function EntryOpportunityCard({ opp, onAction }) {
  const [logging, setLogging] = useState(false);
  const [saving, setSaving] = useState(false);
  const status = statusConfig[opp.entry_status] || statusConfig.unknown;

  async function logTrade() {
    setLogging(true);
    await base44.entities.TradeCard.update(opp.id, { outcome_status: 'entered' });
    toast.success(`${opp.ticker} logged as entered`);
    setLogging(false);
    onAction();
  }

  async function saveToWatchlist() {
    setSaving(true);
    await base44.entities.Alert.create({
      title: `Watchlist: ${opp.ticker} ${opp.direction?.toUpperCase()} ${opp.strike}`,
      body: `Added to watchlist. Entry range: ${opp.entry_range}. Conviction: ${opp.conviction_score}/10`,
      alert_type: 'high_conviction_trade',
      ticker: opp.ticker,
      conviction_score: opp.conviction_score,
      is_read: false,
    });
    toast.success(`${opp.ticker} saved to watchlist`);
    setSaving(false);
  }

  return (
    <div className={cn(
      "border rounded-xl p-4 bg-card transition-all",
      opp.entry_status === 'at_entry' ? 'border-bullish/40 shadow-[0_0_12px_rgba(34,197,94,0.12)]' : 'border-border'
    )}>
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-lg text-foreground">{opp.ticker}</span>
          <span className={cn(
            "font-mono text-xs px-1.5 py-0.5 rounded border font-semibold",
            opp.direction === 'call' ? 'text-bullish border-bullish/30 bg-bullish/10' : 'text-bearish border-bearish/30 bg-bearish/10'
          )}>
            {opp.direction?.toUpperCase()}
          </span>
          <span className="font-mono text-xs text-muted-foreground">@{opp.strike} · {opp.expiry}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-primary font-bold">{opp.conviction_score}/10</span>
          <span className={cn("text-[10px] font-mono border px-1.5 py-0.5 rounded uppercase font-semibold", status.color,
            status.pulse && "animate-pulse")}>
            {status.label}
          </span>
        </div>
      </div>

      {/* Price row */}
      <div className="flex items-center gap-4 mb-3">
        <div>
          <span className="text-[10px] text-muted-foreground font-mono uppercase block">Live Price</span>
          <span className="font-mono font-bold text-foreground">
            {opp.live_price ? `$${opp.live_price.toFixed(2)}` : '—'}
          </span>
          {opp.price_change_pct !== null && (
            <span className={cn("font-mono text-xs ml-1.5", opp.price_change_pct >= 0 ? 'text-bullish' : 'text-bearish')}>
              {opp.price_change_pct >= 0 ? '+' : ''}{opp.price_change_pct?.toFixed(2)}%
            </span>
          )}
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground font-mono uppercase block">Entry Range</span>
          <span className="font-mono text-sm text-foreground">{opp.entry_range || '—'}</span>
        </div>
        {opp.distance_pct !== null && (
          <div>
            <span className="text-[10px] text-muted-foreground font-mono uppercase block">Distance</span>
            <span className={cn("font-mono text-sm font-semibold",
              Math.abs(opp.distance_pct) <= 2 ? 'text-bullish' :
              Math.abs(opp.distance_pct) <= 5 ? 'text-yellow-400' : 'text-muted-foreground')}>
              {opp.distance_pct > 0 ? '+' : ''}{opp.distance_pct.toFixed(1)}%
            </span>
          </div>
        )}
        <div className="ml-auto text-right">
          <span className="text-[10px] text-muted-foreground font-mono uppercase block">Horizon</span>
          <span className="font-mono text-xs text-foreground">{opp.time_horizon || '—'}</span>
        </div>
      </div>

      {/* Thesis */}
      {opp.thesis && (
        <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">{opp.thesis}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs font-mono gap-1.5 border-border"
          onClick={saveToWatchlist}
          disabled={saving}
        >
          <BookmarkPlus className="w-3 h-3" />
          {saving ? 'Saving...' : 'Watchlist'}
        </Button>
        <Button
          size="sm"
          className="h-7 text-xs font-mono gap-1.5 bg-primary/90 hover:bg-primary"
          onClick={logTrade}
          disabled={logging || opp.outcome_status === 'entered'}
        >
          <CheckCircle className="w-3 h-3" />
          {opp.outcome_status === 'entered' ? 'Entered ✓' : logging ? 'Logging...' : 'Log Trade'}
        </Button>
        <span className="font-mono text-[10px] text-muted-foreground/60 ml-auto">
          {opp.date}
        </span>
      </div>
    </div>
  );
}