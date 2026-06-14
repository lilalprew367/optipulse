import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { Key, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AlpacaKeySetup({ onKeysSet }) {
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const [existingId, setExistingId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.ApiKey.filter({ service: 'alpaca' })
      .then(keys => {
        if (keys?.length > 0) {
          setExistingId(keys[0].id);
          setApiKey(keys[0].api_key || '');
          setSecretKey(keys[0].secret_key || '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const saveKeys = async () => {
    if (!apiKey || !secretKey) return;
    setSaving(true);
    setStatus(null);
    try {
      if (existingId) {
        await base44.entities.ApiKey.update(existingId, { api_key: apiKey, secret_key: secretKey });
      } else {
        const created = await base44.entities.ApiKey.create({ service: 'alpaca', api_key: apiKey, secret_key: secretKey });
        setExistingId(created.id);
      }
      setStatus('saved');
      if (onKeysSet) onKeysSet();
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <Card className="border-primary/30 bg-card/80">
      <CardHeader>
        <CardTitle className="font-mono text-lg flex items-center gap-2">
          <Key className="w-5 h-5 text-primary" />
          Alpaca API Keys
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground font-mono uppercase">API Key ID</label>
          <div className="relative mt-1">
            <Input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="PK..."
              className="font-mono pr-10"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground font-mono uppercase">Secret Key</label>
          <div className="relative mt-1">
            <Input
              type={showSecret ? 'text' : 'password'}
              value={secretKey}
              onChange={e => setSecretKey(e.target.value)}
              placeholder="SK..."
              className="font-mono pr-10"
            />
            <button
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <Button
          onClick={saveKeys}
          disabled={saving || !apiKey || !secretKey}
          className="w-full"
        >
          {saving ? 'Saving...' : existingId ? 'Update Keys' : 'Save Keys'}
        </Button>
        {status === 'saved' && (
          <p className="text-bullish text-xs font-mono flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Keys saved — reloading portfolio...
          </p>
        )}
        {status === 'error' && (
          <p className="text-bearish text-xs font-mono flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Failed to save keys
          </p>
        )}
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Get your keys from{' '}
          <a href="https://app.alpaca.markets/paper/dashboard/overview" target="_blank" rel="noopener noreferrer" className="text-primary underline">
            Alpaca Paper Trading Dashboard
          </a>
          {' '}→ API Keys. Use Paper Trading keys only.
        </p>
      </CardContent>
    </Card>
  );
}