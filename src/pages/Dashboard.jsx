import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import GrokAgentChat from '../components/GrokAgentChat';
import SignalFeed from '../components/SignalFeed';
import LiveThesis from '../components/LiveThesis';
import AlertBell from '../components/AlertBell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Zap, BarChart2, Newspaper } from 'lucide-react';

export default function Dashboard() {
  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['alerts-count'],
    queryFn: () => base44.entities.Alert.filter({ is_read: false }),
    refetchInterval: 30000,
  });

  const { data: signals, isLoading: signalsLoading } = useQuery({
    queryKey: ['signals-dashboard'],
    queryFn: () => base44.entities.IntelFeed.list('-created_date', 10),
    refetchInterval: 60000,
  });

  const { data: trades, isLoading: tradesLoading } = useQuery({
    queryKey: ['trades-open'],
    queryFn: () => base44.entities.TradeCard.filter({ outcome_status: 'open' }, '-created_date', 5),
    refetchInterval: 60000,
  });

  const { data: latestBriefing } = useQuery({
    queryKey: ['latest-briefing'],
    queryFn: () => base44.entities.DailyBriefing.list('-created_date', 1),
    refetchInterval: 300000,
  });

  const highConvictionSignals = signals?.filter(s => s.conviction_flag) || [];
  const briefing = latestBriefing?.[0];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-heading text-foreground">AlphaEdge Terminal</h1>
          <p className="text-muted-foreground text-sm mt-1">Social signal intelligence & automated trade ideas</p>
        </div>
        <AlertBell />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Signals Today', value: signals?.length || 0, icon: Newspaper, color: 'text-primary' },
          { label: 'High Conviction', value: highConvictionSignals.length, icon: Zap, color: 'text-yellow-400' },
          { label: 'Open Trades', value: trades?.length || 0, icon: TrendingUp, color: 'text-bullish' },
          { label: 'Market Posture', value: briefing?.market_posture || '—', icon: BarChart2, color: 'text-purple-400' },
        ].map((stat, i) => (
          <Card key={i} className="border-border bg-card/60">
            <CardContent className="p-4 flex items-center gap-3">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <div>
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">{stat.label}</p>
                <p className={`text-lg font-mono font-bold ${stat.color}`}>
                  {typeof stat.value === 'string' ? stat.value.replace(/_/g, ' ').toUpperCase() : stat.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Signal Feed */}
        <div className="xl:col-span-2 space-y-6">
          <SignalFeed signals={signals} loading={signalsLoading} />

          {/* Active Trade Ideas */}
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-lg">Active Trade Ideas</CardTitle>
            </CardHeader>
            <CardContent>
              {tradesLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                </div>
              ) : trades?.length === 0 ? (
                <p className="text-muted-foreground text-center py-6 text-sm">No open trade ideas. Run a briefing to generate some.</p>
              ) : (
                <div className="space-y-3">
                  {trades?.map(trade => (
                    <div key={trade.id} className="border border-border rounded-lg p-3 hover:border-primary/20 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-foreground">{trade.ticker}</span>
                          <span className={`text-xs font-mono uppercase ${trade.direction === 'call' ? 'text-bullish' : 'text-bearish'}`}>
                            {trade.direction}
                          </span>
                          {trade.conviction_score >= 9 && (
                            <span className="text-yellow-400 text-xs flex items-center gap-0.5">
                              <Zap className="w-3 h-3" /> HOT
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-sm text-muted-foreground">
                          {trade.conviction_score}/10
                        </span>
                      </div>
                      {trade.thesis && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{trade.thesis}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Briefing + Grok */}
        <div className="space-y-6">
          {/* Latest Briefing */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="font-mono text-lg">Today's Briefing</CardTitle>
            </CardHeader>
            <CardContent>
              {briefing ? (
                <LiveThesis briefing={briefing} />
              ) : (
                <p className="text-muted-foreground text-sm text-center py-6">No briefing yet. Trigger one from the backoffice.</p>
              )}
            </CardContent>
          </Card>

          {/* Grok Co-Pilot */}
          <div>
            <h2 className="text-lg font-mono font-bold mb-3 text-foreground">Grok Trading Co-Pilot</h2>
            <GrokAgentChat />
          </div>
        </div>
      </div>
    </div>
  );
}