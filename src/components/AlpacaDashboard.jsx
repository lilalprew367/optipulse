import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PortfolioManager from './PortfolioManager';
import { TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function AutomatedTradesFeed() {
  const { data: trades, isLoading } = useQuery({
    queryKey: ['auto-trades'],
    queryFn: () => base44.entities.TradeCard.filter(
      { outcome_status: 'entered' },
      '-updated_date',
      20
    ),
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-lg">Automated Trade History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-lg">Automated Trade History ({trades?.length || 0})</CardTitle>
      </CardHeader>
      <CardContent>
        {!trades?.length ? (
          <p className="text-muted-foreground text-center py-8 text-sm font-mono">
            No automated trades executed yet. Trades with conviction 9+ will auto-execute.
          </p>
        ) : (
          <div className="space-y-2">
            {trades.map(trade => (
              <div
                key={trade.id}
                className="border border-border rounded-lg p-3 bg-muted/20 hover:border-primary/20 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-foreground">{trade.ticker}</span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {trade.direction?.toUpperCase()}
                    </Badge>
                    {trade.conviction_score >= 9 && (
                      <span className="text-yellow-400 text-[10px] font-mono flex items-center gap-0.5">
                        <Zap className="w-3 h-3" /> {trade.conviction_score}/10
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {trade.updated_date ? formatDistanceToNow(new Date(trade.updated_date), { addSuffix: true }) : ''}
                  </span>
                </div>
                {trade.pnl_notes && (
                  <p className="text-xs text-primary/80 font-mono mt-1">{trade.pnl_notes}</p>
                )}
                {trade.thesis && !trade.pnl_notes && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{trade.thesis}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AlpacaDashboard() {
  return (
    <div className="space-y-6">
      <PortfolioManager />
      <AutomatedTradesFeed />
    </div>
  );
}