import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Info, Clock, Zap, Shield, Send, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function Settings() {
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [dailyBriefingEnabled, setDailyBriefingEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserSettings();
  }, []);

  async function loadUserSettings() {
    try {
      const user = await base44.auth.me();
      setTelegramChatId(user.telegram_chat_id || '');
      setTelegramEnabled(!!user.telegram_chat_id);
      setDailyBriefingEnabled(user.telegram_daily_briefing || false);
    } catch (e) {
      console.error('Failed to load user settings:', e);
    }
    setLoading(false);
  }

  async function saveSettings() {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        telegram_chat_id: telegramEnabled ? telegramChatId : null,
        telegram_daily_briefing: dailyBriefingEnabled
      });
      toast.success('Telegram settings saved!');
    } catch (e) {
      toast.error('Failed to save: ' + e.message);
    }
    setSaving(false);
  }

  async function testTelegram() {
    try {
      await base44.functions.invoke('sendTelegramAlert', {
        message: '🔔 <b>AlphaEdge Test Alert</b>\n\nYour Telegram notifications are working correctly!'
      });
      toast.success('Test message sent! Check your Telegram.');
    } catch (e) {
      toast.error('Failed to send test: ' + e.message);
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">Settings</h1>
        <p className="text-sm text-muted-foreground font-mono">AlphaEdge configuration</p>
      </div>

      <div className="space-y-4">
        <SettingSection icon={Send} title="Telegram Notifications" description="Get high-conviction trade alerts and daily briefings sent directly to your Telegram.">
          <div className="mt-3 space-y-3">
            <div className="text-xs text-muted-foreground bg-muted border border-border rounded p-3">
              <b className="text-foreground">How to get your Chat ID:</b>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Open Telegram and search for <b className="text-primary">@userinfobot</b></li>
                <li>Click Start and it will show your Chat ID</li>
                <li>Copy the numeric ID and paste it below</li>
              </ol>
              <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-primary text-xs hover:underline">
                Open @userinfobot <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-foreground">Enable Telegram</label>
                <p className="text-xs text-muted-foreground">Receive alerts for conviction 8+ trades</p>
              </div>
              <Switch checked={telegramEnabled} onCheckedChange={setTelegramEnabled} />
            </div>

            {telegramEnabled && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground font-mono uppercase mb-1 block">Telegram Chat ID</label>
                  <Input 
                    value={telegramChatId} 
                    onChange={e => setTelegramChatId(e.target.value)}
                    placeholder="e.g. 123456789"
                    className="font-mono bg-muted border-border"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-foreground">Daily Briefing</label>
                    <p className="text-xs text-muted-foreground">Get morning summary at 9:00 AM EST</p>
                  </div>
                  <Switch checked={dailyBriefingEnabled} onCheckedChange={setDailyBriefingEnabled} />
                </div>

                <div className="flex gap-2">
                  <Button onClick={saveSettings} disabled={saving || !telegramChatId} className="flex-1">
                    Save Settings
                  </Button>
                  <Button onClick={testTelegram} variant="outline" disabled={saving || !telegramChatId}>
                    Send Test
                  </Button>
                </div>
              </>
            )}
          </div>
        </SettingSection>

        <SettingSection icon={Clock} title="Auto-Schedule" description="Daily briefings auto-generate at 10:00 AM EST every trading day. No configuration needed.">
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full bg-bullish animate-pulse" />
            <span className="font-mono text-xs text-bullish">Active — 10:00 AM EST daily</span>
          </div>
        </SettingSection>

        <SettingSection icon={Shield} title="Risk Profile" description="Your risk profile is configured for retail options trading with a sub-$50K account. Focuses on high-conviction plays (7+ score), liquid options, and defined-risk setups. 1-3 month expiry preferred. Max suggested position: $500-1,500.">
          <div className="flex flex-wrap gap-2 mt-2">
            <Tag>Retail &lt;$50K</Tag>
            <Tag>Conviction 7+</Tag>
            <Tag>Liquid Options Only</Tag>
            <Tag>1–3 Month Expiry</Tag>
            <Tag>No 0DTE</Tag>
          </div>
        </SettingSection>

        <SettingSection icon={Zap} title="Data Sources" description="AlphaEdge pulls from Unusual Whales (options flow), Quiver Quantitative (congressional trades), monitored Twitter/X accounts, and public investment disclosures. Manage tracked accounts in the Sources tab.">
          <div className="flex flex-wrap gap-2 mt-2">
            <Tag>Unusual Whales</Tag>
            <Tag>Quiver Quant</Tag>
            <Tag>Twitter/X</Tag>
            <Tag>Political Disclosures</Tag>
          </div>
        </SettingSection>

        <SettingSection icon={Info} title="About AlphaEdge" description="AlphaEdge is a personal trading intelligence dashboard that aggregates market signals and uses AI to synthesize high-conviction options trade ideas. This is not financial advice. Always do your own research and manage risk appropriately.">
          <p className="font-mono text-xs text-muted-foreground mt-2 border border-border rounded px-3 py-2 bg-muted">
            ⚠️ For educational and informational purposes only. Not financial advice. All trading involves risk.
          </p>
        </SettingSection>
      </div>
    </div>
  );
}

function SettingSection({ icon: Icon, title, description, children }) {
  return (
    <div className="border border-border rounded-lg p-4 bg-card">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-primary" />
        <span className="font-semibold text-foreground text-sm">{title}</span>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      {children}
    </div>
  );
}

function Tag({ children }) {
  return (
    <span className="font-mono text-xs border border-border text-muted-foreground bg-muted px-2 py-0.5 rounded">
      {children}
    </span>
  );
}