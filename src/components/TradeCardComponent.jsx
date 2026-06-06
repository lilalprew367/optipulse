import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { TrendingUp, TrendingDown, Star, Clock, Target, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import TradingViewChart from '@/components/TradingViewChart';

const horizonColors = {
  'intraday': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'weekly': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'monthly': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  '1-3 months': 'bg-primary/10 text-primary border-primary/20',
};

const riskColors = {
  low: 'text-bullish bg-bullish/10 border-bullish/20',
  medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  high: 'text-bearish bg-bearish/10 border-bearish/20',
};

const outcomeColors = {
  open: 'text-muted-foreground',
  entered: 'text-primary',
  closed_win: 'text-bullish',
  closed_loss: 'text-bearish',
  expired: 'text-muted-foreground',
};

export default function TradeCardComponent({ trade, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [outcomeDialog, setOutcomeDialog] = useState(false);
  const [pnlNotes, setPnlNotes] = useState(trade.pnl_notes || '');
  const [pnlAmount, setPnlAmount] = useState(trade.pnl_amount || '');
  const [saving, setSaving] = useState(false);

  const isHighConviction = trade.conviction_score >= 9;
  const isCall = trade.direction === 'call';

  async function updateOutcome(status) {
    setSaving(true);
    await base44.entities.TradeCard.update(trade.id, {
      outcome_status: status,
      pnl_notes: pnlNotes,
      pnl_amount: pnlAmount ? parseFloat(pnlAmount) : null
    });
    setSaving(false);
    setOutcomeDialog(false);
    onUpdate && onUpdate();
  }

  return (
    <>
      <div className={cn(
        "border rounded-lg p-4 bg-card transition-all duration-200 hover:border-primary/30 cursor-pointer",
        isHighConviction && "border-primary/40 animate-pulse-glow",
        trade.outcome_status === 'closed_win' && "border-bullish/20",
        trade.outcome_status === 'closed_loss' && "border-bearish/20",
      )}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Direction Badge */}
            <div className={cn(
              "w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0",
              isCall ? "bg-bullish/15 text-bullish" : "bg-bearish/15 text-bearish"
            )}>
              {isCall ? <TrendingUp className="w-4.5 h-4.5" /> : <TrendingDown className="w-4.5 h-4.5" />}
            </div>

            {/* Ticker + Details */}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-foreground text-lg tracking-widest">{trade.ticker}</span>
                <span className={cn("font-mono font-semibold text-sm uppercase", isCall ? "text-bullish" : "text-bearish")}>
                  {trade.direction}
                </span>
                {isHighConviction && (
                  <span className="flex items-center gap-0.5 text-yellow-400 text-xs">
                    <Star className="w-3 h-3 fill-yellow-400" />
                    HOT
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-xs text-muted-foreground">
                  {trade.strike && `$${trade.strike}`}
                  {trade.expiry && ` · ${trade.expiry}`}
                </span>
                {trade.entry_range && (
                  <span className="font-mono text-xs text-foreground">@ {trade.entry_range}</span>
                )}
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Conviction Score */}
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <Zap className="w-3 h-3 text-primary" />
                <span className="font-mono font-bold text-primary text-lg">{trade.conviction_score}</span>
                <span className="font-mono text-muted-foreground text-xs">/10</span>
              </div>
              <span className="text-xs text-muted-foreground">conviction</span>
            </div>
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>

        {/* Tags Row */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {trade.time_horizon && (
            <span className={cn("text-xs font-mono border px-2 py-0.5 rounded", horizonColors[trade.time_horizon] || horizonColors['1-3 months'])}>
              <Clock className="w-3 h-3 inline mr-1" />{trade.time_horizon}
            </span>
          )}
          {trade.risk_level && (
            <span className={cn("text-xs font-mono border px-2 py-0.5 rounded uppercase", riskColors[trade.risk_level])}>
              {trade.risk_level} risk
            </span>
          )}
          {trade.sector && (
            <span className="text-xs font-mono border border-border px-2 py-0.5 rounded text-muted-foreground">
              {trade.sector}
            </span>
          )}
          {trade.outcome_status !== 'open' && (
            <span className={cn("text-xs font-mono border border-border px-2 py-0.5 rounded uppercase", outcomeColors[trade.outcome_status])}>
              {trade.outcome_status.replace('_', ' ')}
            </span>
          )}
        </div>

        {/* Expanded Content */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-border space-y-3" onClick={e => e.stopPropagation()}>
            {/* Mini chart for this ticker */}
            {trade.ticker && (
              <TradingViewChart ticker={trade.ticker} height={200} defaultInterval="D" />
            )}

            {trade.catalyst && (
              <div className="flex gap-2">
                <Target className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-xs text-muted-foreground font-mono uppercase tracking-wide">Catalyst</span>
                  <p className="text-sm text-foreground mt-0.5">{trade.catalyst}</p>
                </div>
              </div>
            )}
            {trade.thesis && (
              <div>
                <span className="text-xs text-muted-foreground font-mono uppercase tracking-wide">Thesis</span>
                <p className="text-sm text-foreground/90 mt-1 leading-relaxed">{trade.thesis}</p>
              </div>
            )}
            {trade.supporting_sources?.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground font-mono uppercase tracking-wide">Sources</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {trade.supporting_sources.map((s, i) => (
                    <span key={i} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded font-mono">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Outcome Actions */}
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="outline" className="text-xs font-mono border-primary/30 text-primary hover:bg-primary/10"
                onClick={() => setOutcomeDialog(true)}>
                Track Outcome
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={outcomeDialog} onOpenChange={setOutcomeDialog}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-mono text-foreground">Track Outcome — {trade.ticker} {trade.direction?.toUpperCase()}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground font-mono uppercase">P&L Notes</label>
              <Textarea
                value={pnlNotes}
                onChange={e => setPnlNotes(e.target.value)}
                placeholder="Notes on this trade..."
                className="mt-1 bg-muted border-border text-sm font-mono"
                rows={3}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-mono uppercase">P&L Amount ($)</label>
              <Input
                type="number"
                value={pnlAmount}
                onChange={e => setPnlAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1 bg-muted border-border font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button size="sm" variant="outline" className="border-primary/30 text-primary text-xs"
                onClick={() => updateOutcome('entered')} disabled={saving}>Entered</Button>
              <Button size="sm" className="bg-bullish/20 text-bullish border border-bullish/30 hover:bg-bullish/30 text-xs"
                onClick={() => updateOutcome('closed_win')} disabled={saving}>Closed Win</Button>
              <Button size="sm" className="bg-bearish/20 text-bearish border border-bearish/30 hover:bg-bearish/30 text-xs"
                onClick={() => updateOutcome('closed_loss')} disabled={saving}>Closed Loss</Button>
              <Button size="sm" variant="outline" className="text-xs border-border"
                onClick={() => updateOutcome('expired')} disabled={saving}>Expired</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}