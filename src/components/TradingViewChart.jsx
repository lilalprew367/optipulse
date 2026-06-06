import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const TIMEFRAMES = [
  { label: '1D', interval: 'D' },
  { label: '1W', interval: 'W' },
  { label: '1M', interval: 'M' },
];

export default function TradingViewChart({ ticker, height = 300, defaultInterval = 'D', className }) {
  const containerRef = useRef(null);
  const widgetRef = useRef(null);
  const [interval, setInterval] = useState(defaultInterval);
  const idRef = useRef(`tv_${ticker}_${Math.random().toString(36).slice(2, 8)}`);

  useEffect(() => {
    if (!ticker || !containerRef.current) return;

    // Clean up previous widget
    if (widgetRef.current) {
      containerRef.current.innerHTML = '';
      widgetRef.current = null;
    }

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: ticker,
      interval,
      timezone: 'America/New_York',
      theme: 'dark',
      style: '1',
      locale: 'en',
      backgroundColor: 'rgba(13, 17, 23, 0)',
      gridColor: 'rgba(42, 54, 71, 0.5)',
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      support_host: 'https://www.tradingview.com',
      container_id: containerRef.current.id,
    });

    const wrapper = document.createElement('div');
    wrapper.className = 'tradingview-widget-container__widget';
    wrapper.style.height = '100%';
    wrapper.style.width = '100%';

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(wrapper);
    containerRef.current.appendChild(script);
    widgetRef.current = script;

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [ticker, interval]);

  if (!ticker) return null;

  return (
    <div className={cn('flex flex-col rounded-lg overflow-hidden border border-border bg-card', className)}>
      {/* Timeframe Toggle */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <span className="font-mono text-xs text-muted-foreground tracking-widest uppercase">{ticker}</span>
        <div className="flex gap-1">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf.label}
              onClick={() => setInterval(tf.interval)}
              className={cn(
                'font-mono text-[10px] px-2 py-0.5 rounded transition-colors',
                interval === tf.interval
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div
        ref={containerRef}
        id={idRef.current}
        className="tradingview-widget-container"
        style={{ height, width: '100%' }}
      />
    </div>
  );
}