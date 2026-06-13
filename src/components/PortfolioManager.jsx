import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import GrokAgentChat from './GrokAgentChat';

export default function PortfolioManager() {
  const [portfolio, setPortfolio] = useState([]);
  const [totalValue, setTotalValue] = useState(0);

  // Mock data for demo - in real version pull from API / local storage
  useEffect(() => {
    const mockPortfolio = [
      { symbol: 'NVDA', type: 'stock', shares: 50, avgPrice: 135, currentPrice: 142, conviction: 85 },
      { symbol: 'TSLA', type: 'options', contracts: 5, strike: 250, expiry: '2025-06-20', avgPrice: 12.5, currentPrice: 18.2, conviction: 78 },
    ];
    setPortfolio(mockPortfolio);
    const value = mockPortfolio.reduce((sum, pos) => sum + (pos.currentPrice * (pos.shares || pos.contracts * 100)), 0);
    setTotalValue(value);
  }, []);

  const addPosition = (newPos) => {
    setPortfolio([...portfolio, newPos]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Overview - Automated Daily Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>Total Value: ${totalValue.toFixed(2)}</div>
            <div>Positions: {portfolio.length}</div>
            <div>Daily P&amp;L: +2.4% (Auto-calculated)</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Positions</CardTitle>
        </CardHeader>
        <CardContent>
          {portfolio.map((pos, index) => (
            <div key={index} className="border p-4 rounded mb-4">
              <div className="flex justify-between">
                <strong>{pos.symbol} ({pos.type})</strong>
                <span>Conviction: {pos.conviction}%</span>
              </div>
              <p>Why this is positioned: High signal from engine + Grok analysis.</p>
              <GrokAgentChat ticker={pos.symbol} compact={true} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={() => addPosition({symbol: 'AAPL', type: 'stock', shares: 100, avgPrice: 220, currentPrice: 225, conviction: 82})}>
        Simulate New Position (Automated)
      </Button>
    </div>
  );
}