import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const alertTypeColors = {
  high_conviction_trade: 'text-primary border-primary/30 bg-primary/10',
  high_conviction_tweet: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  political_trade: 'text-purple-400 border-purple-400/30 bg-purple-400/10',
  options_spike: 'text-bullish border-bullish/30 bg-bullish/10',
};

export default function AlertBell() {
  const [alerts, setAlerts] = useState([]);
  const [open, setOpen] = useState(false);

  async function loadAlerts() {
    const data = await base44.entities.Alert.list('-created_date', 20);
    setAlerts(data);
  }

  async function markAllRead() {
    const unread = alerts.filter(a => !a.is_read);
    await Promise.all(unread.map(a => base44.entities.Alert.update(a.id, { is_read: true })));
    setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
  }

  useEffect(() => {
    loadAlerts();
    // Poll for new alerts every 30s
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (open) markAllRead();
  }, [open]);

  const unreadCount = alerts.filter(a => !a.is_read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell className="w-4 h-4 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-bearish text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-card border-border" align="end">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Alerts</span>
          {alerts.length > 0 && (
            <button onClick={loadAlerts} className="text-xs text-primary font-mono hover:underline">Refresh</button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground font-mono">No alerts yet</div>
          ) : (
            alerts.map(alert => (
              <div key={alert.id} className={cn(
                "p-3 border-b border-border/50 last:border-0",
                !alert.is_read && "bg-primary/5"
              )}>
                <div className="flex items-start gap-2">
                  {!alert.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
                  <div className={alert.is_read ? "pl-3.5" : ""}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn("text-[10px] font-mono border px-1.5 py-0.5 rounded uppercase", alertTypeColors[alert.alert_type] || 'text-muted-foreground border-border')}>
                        {alert.alert_type?.replace(/_/g, ' ')}
                      </span>
                      {alert.ticker && (
                        <span className="text-[10px] font-mono font-bold text-foreground">{alert.ticker}</span>
                      )}
                      {alert.conviction_score && (
                        <span className="text-[10px] font-mono text-primary ml-auto">{alert.conviction_score}/10</span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-foreground">{alert.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{alert.body}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">
                      {alert.created_date ? new Date(alert.created_date).toLocaleString() : ''}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}