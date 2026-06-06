import { Link, useLocation, Outlet } from 'react-router-dom';
import { BarChart2, Zap, History, BookOpen, Settings, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import AlertBell from '@/components/AlertBell';

const navItems = [
  { icon: Zap, label: 'Today', path: '/' },
  { icon: TrendingUp, label: 'Trades', path: '/trades' },
  { icon: History, label: 'History', path: '/history' },
  { icon: BookOpen, label: 'Sources', path: '/sources' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-border bg-sidebar flex flex-col">
        {/* Logo */}
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <span className="font-mono font-bold text-foreground text-sm tracking-wider">ALPHA</span>
              <span className="font-mono font-bold text-primary text-sm tracking-wider">EDGE</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-mono">Trading Intelligence</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(({ icon: Icon, label, path }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-bullish animate-pulse" />
              <span className="text-xs text-muted-foreground font-mono">LIVE</span>
            </div>
            <AlertBell />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}