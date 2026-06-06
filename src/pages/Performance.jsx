import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Brain, Upload, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import PerformanceStats from '@/components/performance/PerformanceStats';
import TradesTable from '@/components/performance/TradesTable';
import AIReview from '@/components/performance/AIReview';

export default function Performance() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiReview, setAiReview] = useState(null);
  const [reviewing, setReviewing] = useState(false);
  const fileRef = useRef();

  async function loadTrades() {
    setLoading(true);
    const data = await base44.entities.TradeCard.list('-created_date', 200);
    setTrades(data);
    setLoading(false);
  }

  async function runAIReview() {
    setReviewing(true);
    setAiReview(null);
    toast.info('Running AI performance review...');
    try {
      const closedTrades = trades.filter(t => ['closed_win', 'closed_loss', 'expired'].includes(t.outcome_status));
      if (closedTrades.length === 0) {
        toast.error('No closed trades to review yet.');
        setReviewing(false);
        return;
      }

      const tradesSummary = closedTrades.map(t =>
        `${t.ticker} ${t.direction?.toUpperCase()} $${t.strike} ${t.expiry} | Conviction: ${t.conviction_score}/10 | ` +
        `Outcome: ${t.outcome_status} | P&L: ${t.pnl_amount != null ? '$' + t.pnl_amount : 'N/A'} | ` +
        `Thesis: ${t.thesis?.slice(0, 150)} | Catalyst: ${t.catalyst || 'N/A'}`
      ).join('\n');

      const openTrades = trades.filter(t => t.outcome_status === 'open');

      const prompt = `You are a professional options trading coach reviewing a retail trader's actual trade history vs their original signal-based theses.

CLOSED TRADES (${closedTrades.length} total):
${tradesSummary}

OPEN TRADES (${openTrades.length}):
${openTrades.map(t => `${t.ticker} ${t.direction?.toUpperCase()} ${t.strike} | Conviction: ${t.conviction_score}/10 | ${t.thesis?.slice(0, 100)}`).join('\n')}

Provide a comprehensive performance review covering:
1. WIN/LOSS PATTERNS — What types of setups are working? Which are failing? Any sector, direction, or time-horizon bias?
2. CONVICTION vs REALITY — Are high-conviction trades (8-10) outperforming lower-conviction ones? If not, why?
3. RISK MANAGEMENT — Position sizing issues? Holding too long/short? Entry timing problems?
4. THESIS QUALITY — Were the original theses sound? Where did the analysis break down?
5. ACTIONABLE IMPROVEMENTS — 3-5 specific, concrete suggestions to improve future trade selection and management.
6. OPEN TRADE ASSESSMENT — Quick take on the open positions: any red flags?

Be direct, honest, and specific. Reference actual tickers and trades from the data above.`;

      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      setAiReview(res);
      toast.success('AI review complete');
    } catch (e) {
      toast.error('Review failed: ' + e.message);
    }
    setReviewing(false);
  }

  async function handleCSVUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    let created = 0, updated = 0, errors = 0;

    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row = {};
      headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });
      try {
        const record = {
          ticker: row.ticker?.toUpperCase(),
          direction: row.direction?.toLowerCase(),
          strike: row.strike,
          expiry: row.expiry,
          entry_range: row.entry_range,
          conviction_score: row.conviction_score ? parseFloat(row.conviction_score) : undefined,
          time_horizon: row.time_horizon,
          thesis: row.thesis,
          sector: row.sector,
          catalyst: row.catalyst,
          risk_level: row.risk_level?.toLowerCase(),
          outcome_status: row.outcome_status?.toLowerCase() || 'open',
          pnl_notes: row.pnl_notes,
          pnl_amount: row.pnl_amount ? parseFloat(row.pnl_amount) : undefined,
          date: row.date || new Date().toISOString().split('T')[0],
        };
        // Strip undefined
        Object.keys(record).forEach(k => record[k] === undefined && delete record[k]);

        if (row.id) {
          await base44.entities.TradeCard.update(row.id, record);
          updated++;
        } else if (record.ticker && record.direction) {
          await base44.entities.TradeCard.create(record);
          created++;
        }
      } catch {
        errors++;
      }
    }

    toast.success(`CSV imported: ${created} created, ${updated} updated${errors ? `, ${errors} errors` : ''}`);
    fileRef.current.value = '';
    await loadTrades();
  }

  useEffect(() => { loadTrades(); }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-mono font-bold text-foreground text-2xl tracking-wide">Performance</h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">Track, review, and improve your trade outcomes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadTrades} disabled={loading}
            className="font-mono text-xs gap-1.5 border-border">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}
            className="font-mono text-xs gap-1.5 border-border">
            <Upload className="w-3.5 h-3.5" />
            Import CSV
          </Button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
          <Button size="sm" onClick={runAIReview} disabled={reviewing}
            className="font-mono text-xs gap-1.5 bg-primary hover:bg-primary/90">
            <Brain className={`w-3.5 h-3.5 ${reviewing ? 'animate-pulse' : ''}`} />
            {reviewing ? 'Analyzing...' : 'AI Performance Review'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <PerformanceStats trades={trades} loading={loading} />

      {/* AI Review */}
      {(aiReview || reviewing) && (
        <AIReview review={aiReview} loading={reviewing} />
      )}

      {/* Trades Table */}
      <TradesTable trades={trades} loading={loading} onUpdate={loadTrades} />
    </div>
  );
}