import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { Twitter, BarChart2, Landmark, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const signalConfig = {
  tweet: { icon: Twitter, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Tweet' },
  options_flow: { icon: BarChart2, color: 'text-primary', bg: 'bg-primary/10', label: 'Options Flow' },
  political_trade: { icon: Landmark, color: 'text-purple-400', bg: 'bg-purple-400/10', label: 'Political' },
};

function SignalRow({ signal }) {
  const cfg = signalConfig[signal.signal_type] || signalConfig.tweet;
  const Icon = cfg.icon;
  const timeAgo = signal.signal_time
    ? formatDistanceToNow(new Date(signal.signal_time), { addSuffix: true })
    : '';

  return (
    <div className={cn(
      "flex gap-3 p-3 border-b border-border/40 hover:bg-muted/30 transition-colors",
      signal.conviction_flag && "bg-primary/5 border-l-2 border-l-primary"
    )}>
      <div className={cn("w-7 h-7 rounded flex items-center justify-center flex-shrink-0 mt-0.5", cfg.bg)}>
        <Icon className={cn("w-3.5 h-3.5", cfg.color)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-mono font-semibold text-foreground truncate">{signal.source}</span>
          {signal.ticker && (
            <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded flex-shrink-0">{signal.ticker}</span>
          )}
          {signal.conviction_flag && (
            <span className="flex items-center gap-0.5 text-[10px] text-primary font-mono flex-shrink-0">
              <Zap className="w-2.5 h-2.5" />HOT
            </span>
          )}
          <span className="text-[10px] text-muted-foreground/60 font-mono ml-auto flex-shrink-0">{timeAgo}</span>
        </div>
        <p className="text-xs text-foreground/75 leading-relaxed line-clamp-3">{signal.content}</p>
        {signal.conviction_note && (
          <p className="text-[10px] text-primary mt-1 italic">{signal.conviction_note}</p>
        )}
      </div>
    </div>
  );
}

export default function SignalFeed() {
  const [signals, setSignals] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  async function loadSignals() {
    const cutoff = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
    const data = await base44.entities.IntelFeed.filter(
      { signal_time: { $gte: cutoff } },
      '-signal_time',
      100
    );
    setSignals(data);
    setLoading(false);
  }

  useEffect(() => {
    loadSignals();
    const interval = setInterval(loadSignals, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  const filtered = filter === 'all' ? signals : signals.filter(s => s.signal_type === filter);

  const counts = {
    all: signals.length,
    tweet: signals.filter(s => s.signal_type === 'tweet').length,
    options_flow: signals.filter(s => s.signal_type === 'options_flow').length,
    political_trade: signals.filter(s => s.signal_type === 'political_trade').length,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filter tabs */}
      <div className="flex gap-1 p-2 border-b border-border bg-card/50 flex-shrink-0">
        {[
          { key: 'all', label: 'All' },
          { key: 'tweet', label: 'Tweets' },
          { key: 'options_flow', label: 'Flow' },
          { key: 'political_trade', label: 'Political' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors",
              filter === tab.key
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {tab.label}
            <span className="text-[10px] opacity-60">{counts[tab.key]}</span>
          </button>
        ))}
        <button
          onClick={loadSignals}
          className="ml-auto text-[10px] text-muted-foreground hover:text-foreground font-mono px-2"
        >
          refresh
        </button>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-6 text-center text-xs text-muted-foreground font-mono">Loading signals...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground font-mono">
            No signals in the last 8 hours.<br />
            <span className="opacity-60">Next fetch in &lt;15 min</span>
          </div>
        ) : (
          filtered.map(signal => <SignalRow key={signal.id} signal={signal} />)
        )}
      </div>
    </div>
  );
}