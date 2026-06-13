import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Twitter, BarChart2, Landmark, Zap, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const signalConfig = {
  tweet: { icon: Twitter, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Tweet' },
  options_flow: { icon: BarChart2, color: 'text-primary', bg: 'bg-primary/10', label: 'Options Flow' },
  political_trade: { icon: Landmark, color: 'text-purple-400', bg: 'bg-purple-400/10', label: 'Political' },
  news: { icon: BarChart2, color: 'text-amber-400', bg: 'bg-amber-400/10', label: 'News' },
  substack: { icon: Twitter, color: 'text-orange-400', bg: 'bg-orange-400/10', label: 'Substack' },
};

function CompactSignalCard({ signal, onSelect }) {
  const cfg = signalConfig[signal.signal_type] || signalConfig.tweet;
  const Icon = cfg.icon;
  const timeAgo = signal.signal_time
    ? formatDistanceToNow(new Date(signal.signal_time), { addSuffix: true })
    : '';
  const isHighConviction = signal.conviction_flag;

  return (
    <div
      onClick={() => onSelect?.(signal)}
      className={cn(
        "border rounded-lg p-3 bg-card hover:border-primary/30 transition-all cursor-pointer",
        "flex flex-col max-h-[160px] overflow-hidden",
        isHighConviction && "border-primary/40 animate-pulse-glow"
      )}
    >
      {/* Header: Icon + Source + Ticker + Conviction */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className={cn("w-6 h-6 rounded flex items-center justify-center flex-shrink-0", cfg.bg)}>
            <Icon className={cn("w-3.5 h-3.5", cfg.color)} />
          </div>
          <span className="font-mono font-bold text-xs truncate">{signal.source}</span>
          {signal.ticker && (
            <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded flex-shrink-0">
              ${signal.ticker}
            </span>
          )}
        </div>
        {isHighConviction && (
          <div className="flex items-center gap-0.5 text-yellow-400 text-[10px] font-mono flex-shrink-0">
            <Zap className="w-3 h-3 fill-yellow-400" />
            HOT
          </div>
        )}
      </div>

      {/* Content preview */}
      {signal.content && (
        <p className="text-xs text-foreground/75 leading-relaxed line-clamp-3 mb-auto">
          {signal.content}
        </p>
      )}

      {/* Footer: Type tag + Time */}
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
        <span className={cn(
          "text-[10px] font-mono px-1.5 py-0.5 rounded flex-shrink-0",
          cfg.bg, cfg.color
        )}>
          {cfg.label}
        </span>

        {signal.conviction_note && (
          <span className="text-[10px] text-primary/80 italic truncate font-mono">
            {signal.conviction_note}
          </span>
        )}

        <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground/60 ml-auto flex-shrink-0">
          <Clock className="w-2.5 h-2.5" />
          {timeAgo}
        </span>
      </div>
    </div>
  );
}

export default function CompactSignalFeed({ title = "Signals Today", signals = [], loading, onSelect }) {
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all'
    ? signals
    : signals.filter(s => s.signal_type === filter);

  const counts = {
    all: signals?.length || 0,
    tweet: signals?.filter(s => s.signal_type === 'tweet').length || 0,
    options_flow: signals?.filter(s => s.signal_type === 'options_flow').length || 0,
    political_trade: signals?.filter(s => s.signal_type === 'political_trade').length || 0,
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="font-mono text-lg font-bold text-foreground">{title}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="border border-border rounded-lg p-3 bg-card animate-pulse">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded bg-muted" />
                <div className="h-3 w-16 bg-muted rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full bg-muted rounded" />
                <div className="h-3 w-3/4 bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Title + Filter */}
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-lg font-bold text-foreground">{title}</h2>
        <div className="flex gap-1">
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
                "text-[10px] font-mono px-2 py-0.5 rounded transition-colors",
                filter === tab.key
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label} <span className="opacity-50">{counts[tab.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground font-mono">
          No signals to display
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(signal => (
            <CompactSignalCard key={signal.id} signal={signal} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}