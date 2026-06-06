import { useState } from 'react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { TrendingUp, TrendingDown, Pencil, Check, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const outcomeColors = {
  open: 'text-muted-foreground border-border',
  entered: 'text-primary border-primary/30',
  closed_win: 'text-bullish border-bullish/30',
  closed_loss: 'text-bearish border-bearish/30',
  expired: 'text-muted-foreground border-border',
};

const OUTCOMES = ['all', 'open', 'entered', 'closed_win', 'closed_loss', 'expired'];
const DIRECTIONS = ['all', 'call', 'put'];

export default function TradesTable({ trades, loading, onUpdate }) {
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [dirFilter, setDirFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  const filtered = trades.filter(t => {
    const matchOutcome = outcomeFilter === 'all' || t.outcome_status === outcomeFilter;
    const matchDir = dirFilter === 'all' || t.direction === dirFilter;
    const matchSearch = !search || t.ticker?.toLowerCase().includes(search.toLowerCase());
    return matchOutcome && matchDir && matchSearch;
  });

  function startEdit(trade) {
    setEditId(trade.id);
    setEditData({
      outcome_status: trade.outcome_status || 'open',
      pnl_amount: trade.pnl_amount ?? '',
      pnl_notes: trade.pnl_notes || '',
    });
  }

  async function saveEdit(tradeId) {
    setSaving(true);
    try {
      await base44.entities.TradeCard.update(tradeId, {
        outcome_status: editData.outcome_status,
        pnl_amount: editData.pnl_amount !== '' ? parseFloat(editData.pnl_amount) : null,
        pnl_notes: editData.pnl_notes,
      });
      setEditId(null);
      onUpdate();
      toast.success('Trade updated');
    } catch (e) {
      toast.error('Failed to save');
    }
    setSaving(false);
  }

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border bg-card/50">
        <Input
          placeholder="Search ticker..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-36 h-8 text-xs font-mono bg-muted border-border"
        />
        <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
          <SelectTrigger className="w-36 h-8 text-xs font-mono bg-muted border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OUTCOMES.map(o => (
              <SelectItem key={o} value={o} className="text-xs font-mono">
                {o === 'all' ? 'All Outcomes' : o.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dirFilter} onValueChange={setDirFilter}>
          <SelectTrigger className="w-28 h-8 text-xs font-mono bg-muted border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DIRECTIONS.map(d => (
              <SelectItem key={d} value={d} className="text-xs font-mono">
                {d === 'all' ? 'All Dirs' : d.charAt(0).toUpperCase() + d.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground font-mono ml-auto">{filtered.length} trades</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              {['Date', 'Ticker', 'Dir', 'Strike', 'Expiry', 'Entry', 'Conv.', 'Outcome', 'P&L', 'Notes', ''].map(h => (
                <th key={h} className="px-3 py-2 text-left font-normal uppercase tracking-wider text-[10px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-border/40">
                  {[...Array(10)].map((_, j) => (
                    <td key={j} className="px-3 py-2.5"><Skeleton className="h-3 w-full bg-muted" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-muted-foreground">No trades match filters</td>
              </tr>
            ) : filtered.map(trade => {
              const isEditing = editId === trade.id;
              return (
                <tr key={trade.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-2.5 text-muted-foreground">{trade.date}</td>
                  <td className="px-3 py-2.5 font-bold text-foreground tracking-widest">{trade.ticker}</td>
                  <td className="px-3 py-2.5">
                    <span className={cn("flex items-center gap-1", trade.direction === 'call' ? 'text-bullish' : 'text-bearish')}>
                      {trade.direction === 'call' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {trade.direction?.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-foreground">{trade.strike ? `$${trade.strike}` : '—'}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{trade.expiry || '—'}</td>
                  <td className="px-3 py-2.5 text-foreground">{trade.entry_range || '—'}</td>
                  <td className="px-3 py-2.5">
                    <span className="text-primary">{trade.conviction_score || '—'}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    {isEditing ? (
                      <Select value={editData.outcome_status} onValueChange={v => setEditData(d => ({ ...d, outcome_status: v }))}>
                        <SelectTrigger className="h-6 w-28 text-[10px] bg-muted border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OUTCOMES.filter(o => o !== 'all').map(o => (
                            <SelectItem key={o} value={o} className="text-[10px]">{o.replace('_', ' ')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className={cn("border rounded px-1.5 py-0.5 text-[10px] uppercase", outcomeColors[trade.outcome_status])}>
                        {trade.outcome_status?.replace('_', ' ')}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editData.pnl_amount}
                        onChange={e => setEditData(d => ({ ...d, pnl_amount: e.target.value }))}
                        className="h-6 w-20 text-[10px] bg-muted border-border px-1"
                        placeholder="$0"
                      />
                    ) : (
                      <span className={cn(trade.pnl_amount > 0 ? 'text-bullish' : trade.pnl_amount < 0 ? 'text-bearish' : 'text-muted-foreground')}>
                        {trade.pnl_amount != null ? `${trade.pnl_amount >= 0 ? '+' : ''}$${trade.pnl_amount}` : '—'}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 max-w-[140px]">
                    {isEditing ? (
                      <Input
                        value={editData.pnl_notes}
                        onChange={e => setEditData(d => ({ ...d, pnl_notes: e.target.value }))}
                        className="h-6 text-[10px] bg-muted border-border px-1"
                        placeholder="Notes..."
                      />
                    ) : (
                      <span className="text-muted-foreground truncate block">{trade.pnl_notes || '—'}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {isEditing ? (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="w-5 h-5 text-bullish hover:bg-bullish/10"
                          onClick={() => saveEdit(trade.id)} disabled={saving}>
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="w-5 h-5 text-muted-foreground hover:bg-muted"
                          onClick={() => setEditId(null)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="icon" variant="ghost" className="w-5 h-5 text-muted-foreground hover:text-foreground"
                        onClick={() => startEdit(trade)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* CSV hint */}
      <div className="px-4 py-2 border-t border-border text-[10px] text-muted-foreground font-mono">
        CSV columns: ticker, direction, strike, expiry, entry_range, conviction_score, time_horizon, thesis, sector, catalyst, risk_level, outcome_status, pnl_amount, pnl_notes, date, id (optional, for updates)
      </div>
    </div>
  );
}