import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import { Calendar, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import MarketPostureBadge from '@/components/MarketPostureBadge';
import TradeCardComponent from '@/components/TradeCardComponent';

export default function History() {
  const [briefings, setBriefings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTrades, setLoadingTrades] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await base44.entities.DailyBriefing.list('-date', 60);
      const complete = data.filter(b => b.status === 'complete');
      setBriefings(complete);
      setLoading(false);
    }
    load();
  }, []);

  async function selectBriefing(b) {
    setSelected(b);
    setLoadingTrades(true);
    const t = await base44.entities.TradeCard.filter({ briefing_id: b.id });
    setTrades(t.sort((a, b) => b.conviction_score - a.conviction_score));
    setLoadingTrades(false);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">History</h1>
        <p className="text-sm text-muted-foreground font-mono">Past briefings and trade ideas</p>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Left - Briefing List */}
        <div className="col-span-4 space-y-1.5">
          {loading ? (
            Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 bg-muted" />)
          ) : briefings.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg p-6 text-center">
              <Calendar className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground font-mono">No history yet</p>
            </div>
          ) : (
            briefings.map(b => (
              <button
                key={b.id}
                onClick={() => selectBriefing(b)}
                className={`w-full text-left border rounded-lg p-3 transition-all ${
                  selected?.id === b.id
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border bg-card hover:border-primary/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-medium text-foreground">
                    {format(parseISO(b.date), 'MMM d, yyyy')}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="mt-1">
                  <MarketPostureBadge posture={b.market_posture} />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Right - Selected Briefing */}
        <div className="col-span-8">
          {!selected ? (
            <div className="border border-dashed border-border rounded-xl p-12 text-center h-full flex items-center justify-center">
              <div>
                <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground font-mono">Select a date to view briefing</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border border-border rounded-lg p-4 bg-card">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-mono font-semibold text-foreground">
                    {format(parseISO(selected.date), 'EEEE, MMMM d yyyy')}
                  </span>
                  <MarketPostureBadge posture={selected.market_posture} />
                </div>
                <div className="text-sm text-foreground/80 leading-relaxed">
                  {selected.narrative?.split('\n').filter(p => p.trim()).map((para, i) => (
                    <p key={i} className="mb-3 last:mb-0">{para}</p>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-mono font-semibold text-sm text-muted-foreground uppercase tracking-widest mb-2">
                  Trade Ideas ({trades.length})
                </h3>
                {loadingTrades ? (
                  <div className="space-y-2">
                    {[1, 2].map(i => <Skeleton key={i} className="h-20 bg-muted" />)}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {trades.map(trade => (
                      <TradeCardComponent key={trade.id} trade={trade} onUpdate={() => {}} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}