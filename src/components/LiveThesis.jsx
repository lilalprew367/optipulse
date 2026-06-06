import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MarketPostureBadge from '@/components/MarketPostureBadge';
import TradeCardComponent from '@/components/TradeCardComponent';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function LiveThesis() {
  const [briefing, setBriefing] = useState(null);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  async function load() {
    const [briefings, allTrades] = await Promise.all([
      base44.entities.DailyBriefing.filter({ date: today }),
      base44.entities.TradeCard.filter({ date: today })
    ]);
    setBriefing(briefings[0] || null);
    setTrades(allTrades.sort((a, b) => b.conviction_score - a.conviction_score));
    setLoading(false);
  }

  async function runAnalysis() {
    setRunning(true);
    toast.info('Running signal analysis...');
    try {
      // First fetch fresh signals, then analyze
      await base44.functions.invoke('fetchSignals', {});
      const res = await base44.functions.invoke('analyzeSignals', {});
      if (res.data?.success) {
        toast.success(`Analysis complete — ${res.data.alerts_fired} alerts, ${res.data.trades_generated} trade ideas`);
        await load();
      }
    } catch (e) {
      toast.error('Analysis failed. Try again.');
    }
    setRunning(false);
  }

  useEffect(() => {
    load();
    // Auto-refresh every 5 min
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Live Thesis</span>
          {briefing?.updated_date && (
            <span className="text-[10px] text-muted-foreground/60 font-mono">
              {formatDistanceToNow(new Date(briefing.updated_date), { addSuffix: true })}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={runAnalysis}
          disabled={running}
          className="h-7 text-xs font-mono border-primary/30 text-primary hover:bg-primary/10 gap-1.5"
        >
          <RefreshCw className={`w-3 h-3 ${running ? 'animate-spin' : ''}`} />
          {running ? 'Analyzing...' : 'Run Now'}
        </Button>
      </div>

      {loading ? (
        <div className="p-4 space-y-3">
          <Skeleton className="h-8 w-32 bg-muted" />
          <Skeleton className="h-24 w-full bg-muted" />
          <Skeleton className="h-16 w-full bg-muted" />
        </div>
      ) : !briefing ? (
        <div className="p-6 text-center">
          <p className="text-xs text-muted-foreground font-mono mb-3">No analysis yet today</p>
          <Button size="sm" onClick={runAnalysis} disabled={running} className="font-mono text-xs bg-primary hover:bg-primary/90">
            Run First Analysis
          </Button>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Posture */}
          {briefing.market_posture && (
            <MarketPostureBadge posture={briefing.market_posture} size="lg" />
          )}

          {/* Thesis narrative */}
          {briefing.narrative && (
            <div>
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Thesis</span>
              <div className="mt-2 space-y-2">
                {briefing.narrative.split('\n').filter(p => p.trim()).map((para, i) => (
                  <p key={i} className="text-xs text-foreground/85 leading-relaxed">{para}</p>
                ))}
              </div>
            </div>
          )}

          {/* Signal summary */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Options Flow', value: briefing.options_flow_summary },
              { label: 'Political', value: briefing.political_trades_summary },
              { label: 'FinTwit', value: briefing.fintwit_summary },
            ].filter(s => s.value).map(s => (
              <div key={s.label} className="border border-border rounded p-2">
                <span className="font-mono text-[10px] text-muted-foreground uppercase block mb-1">{s.label}</span>
                <p className="text-[10px] text-foreground/75 leading-relaxed">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Trade ideas */}
          {trades.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">High-Conviction Plays</span>
                <span className="text-[10px] font-mono bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded">
                  {trades.length}
                </span>
              </div>
              <div className="space-y-2">
                {trades.map(trade => (
                  <TradeCardComponent key={trade.id} trade={trade} onUpdate={load} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}