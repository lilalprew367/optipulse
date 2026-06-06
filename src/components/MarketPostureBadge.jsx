import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, ChevronUp, ChevronDown } from 'lucide-react';

const postureConfig = {
  bullish: { label: 'BULLISH', color: 'text-bullish bg-bullish/10 border-bullish/30', icon: TrendingUp },
  bearish: { label: 'BEARISH', color: 'text-bearish bg-bearish/10 border-bearish/30', icon: TrendingDown },
  neutral: { label: 'NEUTRAL', color: 'text-muted-foreground bg-muted/50 border-border', icon: Minus },
  cautiously_bullish: { label: 'CAUTIOUSLY BULLISH', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30', icon: ChevronUp },
  cautiously_bearish: { label: 'CAUTIOUSLY BEARISH', color: 'text-orange-400 bg-orange-400/10 border-orange-400/30', icon: ChevronDown },
};

export default function MarketPostureBadge({ posture, size = 'md' }) {
  const config = postureConfig[posture] || postureConfig.neutral;
  const Icon = config.icon;

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 font-mono font-semibold border rounded px-2 py-1 tracking-wider",
      config.color,
      size === 'lg' ? 'text-sm px-3 py-1.5' : 'text-xs'
    )}>
      <Icon className={size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'} />
      {config.label}
    </span>
  );
}