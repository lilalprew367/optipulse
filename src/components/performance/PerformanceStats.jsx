import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Target, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PerformanceStats({ trades, loading }) {
  const closed = trades.filter(t => ['closed_win', 'closed_loss', 'expired'].includes(t.outcome_status));
  const wins = trades.filter(t => t.outcome_status === 'closed_win');
  const losses = trades.filter(t => t.outcome_status === 'closed_loss');
  const winRate = closed.length > 0 ? Math.round((wins.length / closed.length) * 100) : 0;

  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl_amount || 0), 0);

  const highConv = trades.filter(t => t.conviction_score >= 8 && ['closed_win', 'closed_loss'].includes(t.outcome_status));
  const highConvWins = highConv.filter(t => t.outcome_status === 'closed_win');
  const highConvWinRate = highConv.length > 0 ? Math.round((highConvWins.length / highConv.length) * 100) : null;

  const avgConviction = closed.length > 0
    ? (closed.reduce((s, t) => s + (t.conviction_score || 0), 0) / closed.length).toFixed(1)
    : null;

  const stats = [
    {
      label: 'Win Rate',
      value: closed.length > 0 ? `${winRate}%` : '—',
      sub: `${wins.length}W / ${losses.length}L of ${closed.length} closed`,
      icon: Target,
      color: winRate >= 50 ? 'text-bullish' : winRate > 0 ? 'text-bearish' : 'text-muted-foreground',
    },
    {
      label: 'Total P&L',
      value: totalPnl !== 0 ? `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toLocaleString()}` : '—',
      sub: 'Realized + unrealized entered',
      icon: totalPnl >= 0 ? TrendingUp : TrendingDown,
      color: totalPnl > 0 ? 'text-bullish' : totalPnl < 0 ? 'text-bearish' : 'text-muted-foreground',
    },
    {
      label: 'High-Conv Win Rate',
      value: highConvWinRate !== null ? `${highConvWinRate}%` : '—',
      sub: `Score 8+ trades: ${highConv.length} closed`,
      icon: Zap,
      color: highConvWinRate >= 60 ? 'text-bullish' : highConvWinRate !== null ? 'text-yellow-400' : 'text-muted-foreground',
    },
    {
      label: 'Avg Conviction (Closed)',
      value: avgConviction ? `${avgConviction}/10` : '—',
      sub: `Open: ${trades.filter(t => t.outcome_status === 'open').length} | Entered: ${trades.filter(t => t.outcome_status === 'entered').length}`,
      icon: Zap,
      color: 'text-primary',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 bg-muted rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(s => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="border border-border rounded-lg p-4 bg-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">{s.label}</span>
              <Icon className={cn("w-4 h-4", s.color)} />
            </div>
            <div className={cn("font-mono font-bold text-2xl", s.color)}>{s.value}</div>
            <div className="text-[10px] text-muted-foreground font-mono mt-1">{s.sub}</div>
          </div>
        );
      })}
    </div>
  );
}