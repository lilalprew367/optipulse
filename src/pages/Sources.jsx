import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Twitter, Globe, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const DEFAULT_SOURCES = [
  { name: 'Unusual Whales', source_type: 'options_flow', identifier: 'unusualwhales.com', category: 'flow_data', priority: 10 },
  { name: 'Quiver Quant (All Data)', source_type: 'political_disclosure', identifier: 'quiverquant.com (congress+senate+house+insiders+hedgefunds)', category: 'institution', priority: 10 },
  { name: '@unusual_whales', source_type: 'twitter', identifier: '@unusual_whales', category: 'fintwit', priority: 8 },
  { name: '@DeItaone', source_type: 'twitter', identifier: '@DeItaone', category: 'fintwit', priority: 7 },
  { name: 'Leopold Aschenbrenner', source_type: 'political_disclosure', identifier: 'Leopold Aschenbrenner', category: 'insider', priority: 8 },
];

const typeIcons = {
  twitter: Twitter,
  options_flow: BarChart2,
  political_disclosure: Globe,
  technical_analysis: BarChart2,
  news: Globe,
  custom: Globe,
};

const categoryColors = {
  politician: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  fintwit: 'text-primary bg-primary/10 border-primary/20',
  institution: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  insider: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  flow_data: 'text-bullish bg-bullish/10 border-bullish/20',
  other: 'text-muted-foreground bg-muted border-border',
};

export default function Sources() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addDialog, setAddDialog] = useState(false);
  const [newSource, setNewSource] = useState({ name: '', source_type: 'twitter', identifier: '', category: 'fintwit', priority: 5 });
  const [saving, setSaving] = useState(false);

  async function loadSources() {
    setLoading(true);
    const data = await base44.entities.TrackedSource.list('-priority', 100);
    setSources(data);
    setLoading(false);
  }

  async function seedDefaults() {
    setSaving(true);
    for (const src of DEFAULT_SOURCES) {
      await base44.entities.TrackedSource.create({ ...src, is_active: true });
    }
    toast.success('Default sources added!');
    await loadSources();
    setSaving(false);
  }

  async function toggleSource(source) {
    await base44.entities.TrackedSource.update(source.id, { is_active: !source.is_active });
    setSources(prev => prev.map(s => s.id === source.id ? { ...s, is_active: !s.is_active } : s));
  }

  async function deleteSource(id) {
    await base44.entities.TrackedSource.delete(id);
    setSources(prev => prev.filter(s => s.id !== id));
    toast.success('Source removed');
  }

  async function addSource() {
    setSaving(true);
    await base44.entities.TrackedSource.create({ ...newSource, is_active: true });
    toast.success('Source added!');
    setAddDialog(false);
    setNewSource({ name: '', source_type: 'twitter', identifier: '', category: 'fintwit', priority: 5 });
    await loadSources();
    setSaving(false);
  }

  useEffect(() => { loadSources(); }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Signal Sources</h1>
          <p className="text-sm text-muted-foreground font-mono">Manage tracked accounts and data sources</p>
        </div>
        <div className="flex gap-2">
          {sources.length === 0 && !loading && (
            <Button variant="outline" size="sm" onClick={seedDefaults} disabled={saving} className="font-mono text-xs border-primary/30 text-primary">
              Load Defaults
            </Button>
          )}
          <Button size="sm" onClick={() => setAddDialog(true)} className="font-mono gap-2 bg-primary hover:bg-primary/90">
            <Plus className="w-3.5 h-3.5" />
            Add Source
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 bg-muted" />)}
        </div>
      ) : sources.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-16 text-center space-y-4">
          <Globe className="w-10 h-10 text-muted-foreground mx-auto" />
          <div>
            <h3 className="font-semibold text-foreground mb-1">No sources configured</h3>
            <p className="text-sm text-muted-foreground">Add sources or load the recommended defaults to get started.</p>
          </div>
          <Button onClick={seedDefaults} disabled={saving} className="font-mono bg-primary hover:bg-primary/90">
            Load Default Sources
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {sources.map(source => {
            const IconComponent = typeIcons[source.source_type] || Globe;
            return (
              <div key={source.id} className={cn(
                "border border-border rounded-lg p-3.5 bg-card flex items-center gap-3 transition-all",
                !source.is_active && "opacity-50"
              )}>
                <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                  <IconComponent className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground">{source.name}</span>
                    <span className={cn("text-xs font-mono border px-1.5 py-0.5 rounded", categoryColors[source.category])}>
                      {source.category}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{source.identifier}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-muted-foreground font-mono">P{source.priority}</span>
                  <Switch checked={source.is_active} onCheckedChange={() => toggleSource(source)} />
                  <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-bearish"
                    onClick={() => deleteSource(source.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-mono text-foreground">Add Signal Source</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground font-mono uppercase">Display Name</label>
              <Input value={newSource.name} onChange={e => setNewSource(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. @elonmusk" className="mt-1 bg-muted border-border font-mono text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-mono uppercase">Identifier / Handle</label>
              <Input value={newSource.identifier} onChange={e => setNewSource(p => ({ ...p, identifier: e.target.value }))}
                placeholder="@handle or URL" className="mt-1 bg-muted border-border font-mono text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground font-mono uppercase">Type</label>
                <Select value={newSource.source_type} onValueChange={v => setNewSource(p => ({ ...p, source_type: v }))}>
                  <SelectTrigger className="mt-1 bg-muted border-border font-mono text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="twitter">Twitter/X</SelectItem>
                    <SelectItem value="options_flow">Options Flow</SelectItem>
                    <SelectItem value="political_disclosure">Political</SelectItem>
                    <SelectItem value="news">News</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-mono uppercase">Category</label>
                <Select value={newSource.category} onValueChange={v => setNewSource(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="mt-1 bg-muted border-border font-mono text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="politician">Politician</SelectItem>
                    <SelectItem value="fintwit">FinTwit</SelectItem>
                    <SelectItem value="institution">Institution</SelectItem>
                    <SelectItem value="insider">Insider</SelectItem>
                    <SelectItem value="flow_data">Flow Data</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={addSource} disabled={saving || !newSource.name || !newSource.identifier}
              className="w-full bg-primary hover:bg-primary/90 font-mono">
              Add Source
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}