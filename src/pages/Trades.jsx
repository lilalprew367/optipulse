import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Filter, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import TradeCardComponent from '@/components/TradeCardComponent';

export default function Trades() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDirection, setFilterDirection] = useState('all');

  async function loadTrades() {
    setLoading(true);
    const all = await base44.entities.TradeCard.list('-date', 100);
    setTrades(all);
    setLoading(false);
  }

  useEffect(() => { loadTrades(); }, []);

  const filtered = trades.filter(t => {
    if (filterStatus !== 'all' && t.outcome_status !== filterStatus) return false;
    if (filterDirection !== 'all' && t.direction !== filterDirection) return false;
    return true;
  });

  // Stats
  const totalTrades = trades.filter(t => t.outcome_status !== 'open').length;
  const wins = trades.filter(t => t.outcome_status === 'closed_win').length;
  const losses = trades.filter(t => t.outcome_status === 'closed_loss').length;
  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl_amount || 0), 0);
  const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">All Trades</h1>
        <p className="text-sm text-muted-foreground font-mono">Track and manage all generated trade ideas</p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard label="Win Rate" value={`${winRate}%`} color={winRate >= 50 ? 'text-bullish' : 'text-bearish'} />
        <StatCard label="Total Wins" value={wins} color="text-bullish" icon={TrendingUp} />
        <StatCard label="Total Losses" value={losses} color="text-bearish" icon={TrendingDown} />
        <StatCard label="Total P&L" value={`${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(0)}`} color={totalPnl >= 0 ? 'text-bullish' : 'text-bearish'} icon={DollarSign} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 bg-card border-border font-mono text-xs h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="entered">Entered</SelectItem>
            <SelectItem value="closed_win">Win</SelectItem>
            <SelectItem value="closed_loss">Loss</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterDirection} onValueChange={setFilterDirection}>
          <SelectTrigger className="w-32 bg-card border-border font-mono text-xs h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="call">Calls</SelectItem>
            <SelectItem value="put">Puts</SelectItem>
          </SelectContent>
        </Select>
        <span className="font-mono text-xs text-muted-foreground ml-auto">{filtered.length} trades</span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 bg-muted" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-12 text-center">
          <p className="text-muted-foreground font-mono text-sm">No trades found matching your filters.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(trade => (
            <TradeCardComponent key={trade.id} trade={trade} onUpdate={loadTrades} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, icon: Icon }) {
  return (
    <div className="border border-border rounded-lg p-3.5 bg-card">
      <span className="text-xs text-muted-foreground font-mono uppercase tracking-wide">{label}</span>
      <div className="flex items-center gap-1.5 mt-1">
        {Icon && <Icon className={`w-3.5 h-3.5 ${color}`} />}
        <span className={`font-mono font-bold text-xl ${color}`}>{value}</span>
      </div>
    </div>
  );
}