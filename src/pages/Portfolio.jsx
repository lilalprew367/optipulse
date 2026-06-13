import React from 'react';
import PortfolioManager from '../components/PortfolioManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Portfolio() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">OptiPulse Portfolio Manager</h1>
      <p className="text-muted-foreground">Automated position tracking, P&amp;L, risk, and Grok-powered explanations. Minimal manual work required.</p>
      <PortfolioManager />
    </div>
  );
}
