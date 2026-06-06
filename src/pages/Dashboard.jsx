import SignalFeed from '@/components/SignalFeed';
import LiveThesis from '@/components/LiveThesis';

export default function Dashboard() {
  return (
    <div className="flex h-full">
      {/* Left: Signal Feed */}
      <div className="w-80 flex-shrink-0 border-r border-border flex flex-col">
        <div className="p-3 border-b border-border flex-shrink-0">
          <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Signal Feed</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <SignalFeed />
        </div>
      </div>

      {/* Right: Live Thesis */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <LiveThesis />
      </div>
    </div>
  );
}