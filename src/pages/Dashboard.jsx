import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { RefreshCw, Zap, TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import MarketPostureBadge from '@/components/MarketPostureBadge';
import TradeCardComponent from '@/components/TradeCardComponent';
import { toast } from 'sonner';

export default function Dashboard() {
  const [briefing, setBriefing] = useState(null);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  async function loadTodayData() {
    setLoading(true);
    const [briefings, allTrades] = await Promise.all([
      base44.entities.DailyBriefing.filter({ date: today }),
      base44.entities.TradeCard.filter({ date: today })
    ]);
    setBriefing(briefings[0] || null);
    setTrades(allTrades.sort((a, b) => b.conviction_score - a.conviction_score));
    setLoading(false);
  }

  async function triggerGeneration() {
    setGenerating(true);
    toast.info('Generating briefing... This may take 30-60 seconds.');
    const res = await base44.functions.invoke('generateBriefing', {});
    if (res.data?.success) {
      toast.success('Briefing generated!');
      await loadTodayData();
    } else {
      toast.error('Generation failed: ' + (res.data?.error || 'Unknown error'));
    }
    setGenerating(false);
  }

  useEffect(() => { loadTodayData(); }, []);

  // Poll if status is "generating"
  useEffect(() => {
    if (briefing?.status === 'generating') {
      const interval = setInterval(loadTodayData, 5000);
      return () => clearInterval(interval);
    }
  }, [briefing?.status]);

  const postureColors = {
    bullish: 'from-bullish/5', bearish: 'from-bearish/5',
    neutral: 'from-muted/5', cautiously_bullish: 'from-yellow-500/5', cautiously_bearish: 'from-orange-500/5'
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
              {format(new Date(), 'EEEE, MMMM d yyyy')}
            </span>
            {briefing?.market_posture && (
              <MarketPostureBadge posture={briefing.market_posture} />
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground">Morning Briefing</h1>
        </div>
        <Button
          onClick={triggerGeneration}
          disabled={generating || briefing?.status === 'generating'}
          size="sm"
          className="font-mono gap-2 bg-primary hover:bg-primary/90"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${(generating || briefing?.status === 'generating') ? 'animate-spin' : ''}`} />
          {generating || briefing?.status === 'generating' ? 'Generating...' : 'Run Analysis'}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full bg-muted" />
          <div className="grid gap-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full bg-muted" />)}
          </div>
        </div>
      ) : !briefing ? (
        <EmptyState onGenerate={triggerGeneration} generating={generating} />
      ) : briefing.status === 'generating' ? (
        <GeneratingState />
      ) : briefing.status === 'failed' ? (
        <FailedState onRetry={triggerGeneration} />
      ) : (
        <BriefingContent briefing={briefing} trades={trades} onUpdate={loadTodayData} postureColors={postureColors} />
      )}
    </div>
  );
}

function BriefingContent({ briefing, trades, onUpdate, postureColors }) {
  const sectionStyle = "border border-border rounded-lg p-4 bg-card";

  return (
    <div className="space-y-5">
      {/* Narrative */}
      <div className={`${sectionStyle} bg-gradient-to-br ${postureColors[briefing.market_posture] || 'from-muted/5'} to-card`}>
        <div className="flex items-center gap-2 mb-3">
          <MarketPostureBadge posture={briefing.market_posture} size="lg" />
          <span className="text-xs text-muted-foreground font-mono ml-auto">
            {briefing.is_manual_trigger ? 'Manual Run' : 'Auto-generated 10:00 AM EST'}
          </span>
        </div>
        <div className="prose prose-invert prose-sm max-w-none">
          {briefing.narrative?.split('\n').filter(p => p.trim()).map((para, i) => (
            <p key={i} className="text-foreground/85 text-sm leading-relaxed mb-3 last:mb-0">{para}</p>
          ))}
        </div>
      </div>

      {/* Signal Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SignalCard title="Options Flow" content={briefing.options_flow_summary} icon={Zap} iconColor="text-primary" />
        <SignalCard title="Political Trades" content={briefing.political_trades_summary} icon={AlertCircle} iconColor="text-yellow-400" />
        <SignalCard title="FinTwit Pulse" content={briefing.fintwit_summary} icon={TrendingUp} iconColor="text-bullish" />
      </div>

      {/* Macro Summary */}
      {briefing.macro_summary && (
        <div className={sectionStyle}>
          <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Macro Backdrop</span>
          <p className="text-sm text-foreground/80 mt-2 leading-relaxed">{briefing.macro_summary}</p>
        </div>
      )}

      {/* Trade Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-mono font-semibold text-foreground tracking-wide">HIGH-CONVICTION PLAYS</h2>
            <span className="font-mono text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded">
              {trades.length} ideas
            </span>
          </div>
          <span className="text-xs text-muted-foreground font-mono">7+ conviction only</span>
        </div>
        {trades.length === 0 ? (
          <div className="border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground font-mono text-sm">No high-conviction plays generated today.</p>
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
  );
}

function SignalCard({ title, content, icon: Icon, iconColor }) {
  return (
    <div className="border border-border rounded-lg p-3.5 bg-card">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">{title}</span>
      </div>
      <p className="text-xs text-foreground/80 leading-relaxed">{content || 'No data available.'}</p>
    </div>
  );
}

function EmptyState({ onGenerate, generating }) {
  return (
    <div className="border border-dashed border-border rounded-xl p-16 text-center space-y-4">
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
        <Zap className="w-6 h-6 text-primary" />
      </div>
      <div>
        <h3 className="font-semibold text-foreground mb-1">No briefing yet today</h3>
        <p className="text-sm text-muted-foreground">Auto-generates at 10 AM EST. Run manually to get started.</p>
      </div>
      <Button onClick={onGenerate} disabled={generating} className="font-mono bg-primary hover:bg-primary/90">
        <RefreshCw className={`w-3.5 h-3.5 mr-2 ${generating ? 'animate-spin' : ''}`} />
        Generate Now
      </Button>
    </div>
  );
}

function GeneratingState() {
  return (
    <div className="border border-primary/20 rounded-xl p-16 text-center space-y-4 bg-primary/5">
      <RefreshCw className="w-10 h-10 text-primary animate-spin mx-auto" />
      <div>
        <h3 className="font-semibold text-foreground mb-1">Analyzing markets...</h3>
        <p className="text-sm text-muted-foreground">Scraping options flow, political trades, and FinTwit signals.</p>
      </div>
    </div>
  );
}

function FailedState({ onRetry }) {
  return (
    <div className="border border-bearish/20 rounded-xl p-16 text-center space-y-4">
      <AlertCircle className="w-10 h-10 text-bearish mx-auto" />
      <div>
        <h3 className="font-semibold text-foreground mb-1">Generation failed</h3>
        <p className="text-sm text-muted-foreground">Something went wrong. Try again.</p>
      </div>
      <Button onClick={onRetry} variant="outline" className="font-mono border-bearish/30 text-bearish">
        Retry
      </Button>
    </div>
  );
}