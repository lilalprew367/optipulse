import { Info, Clock, Zap, Shield } from 'lucide-react';

export default function Settings() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">Settings</h1>
        <p className="text-sm text-muted-foreground font-mono">AlphaEdge configuration</p>
      </div>

      <div className="space-y-4">
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