import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Zap, RefreshCw, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import EntryOpportunityCard from '@/components/EntryOpportunityCard';

export default function Alerts() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const res = await base44.functions.invoke('getEntryOpportunities', {});
    setOpportunities(res.data?.opportunities || []);
    setLastUpdated(new Date());

    if (isRefresh) setRefreshing(false);
    else setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [load]);

  const atEntry = opportunities.filter(o => o.entry_status === 'at_entry');
  const nearEntry = opportunities.filter(o => o.entry_status === 'below_entry');
  const other = opportunities.filter(o => o.entry_status === 'above_entry' || o.entry_status === 'unknown');

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Entry Opportunities</h1>
          </div>
          <p className="text-sm text-muted-foreground font-mono">
            High-conviction trades (≥8/10) with live price proximity to suggested entry
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[10px] font-mono text-muted-foreground/60">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs font-mono gap-1.5 border-border"
            onClick={() => load(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Quotes
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 bg-muted rounded-xl" />)}
        </div>
      ) : opportunities.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-16 text-center">
          <Target className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-mono">No high-conviction open trades found.</p>
          <p className="text-xs text-muted-foreground/60 font-mono mt-1">Run a briefing to generate new trade ideas.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {atEntry.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-bullish animate-pulse" />
                <h2 className="font-mono text-xs uppercase tracking-widest text-bullish font-semibold">At Entry Zone ({atEntry.length})</h2>
              </div>
              <div className="space-y-3">
                {atEntry.map(o => <EntryOpportunityCard key={o.id} opp={o} onAction={() => load(true)} />)}
              </div>
            </section>
          )}

          {nearEntry.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-yellow-400" />
                <h2 className="font-mono text-xs uppercase tracking-widest text-yellow-400 font-semibold">Approaching Entry ({nearEntry.length})</h2>
              </div>
              <div className="space-y-3">
                {nearEntry.map(o => <EntryOpportunityCard key={o.id} opp={o} onAction={() => load(true)} />)}
              </div>
            </section>
          )}

          {other.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground font-semibold">Monitoring ({other.length})</h2>
              </div>
              <div className="space-y-3">
                {other.map(o => <EntryOpportunityCard key={o.id} opp={o} onAction={() => load(true)} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}