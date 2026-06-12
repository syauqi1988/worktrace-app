import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { FileText, Plus, Pencil, Trash2, Loader2, Save, Sparkles } from 'lucide-react';
import type { ChecklistItem } from './CompletionReportView';

export interface TemplateRecord {
  id: string;
  user_id: string | null;
  name: string;
  category: string | null;
  work_description: string | null;
  materials_used: string | null;
  checklist: ChecklistItem[];
  is_default: boolean;
}

interface Props {
  onApply: (tpl: { work_description: string; materials_used: string; checklistText: string }) => void;
  // Current form values, so user can save as new template
  current: { work_description: string; materials_used: string; checklistText: string };
}

function checklistToText(items: ChecklistItem[]): string {
  return items.map(i => `[${i.done === false ? ' ' : 'x'}] ${i.title}`).join('\n');
}

function parseChecklist(raw: string): ChecklistItem[] {
  return raw
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(line => {
      const m = line.match(/^\[([ xX])\]\s*(.+)$/);
      if (m) return { title: m[2].trim(), done: m[1].toLowerCase() === 'x' };
      return { title: line, done: true };
    });
}

export default function TemplatePickerSection({ onApply, current }: Props) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>('');
  const [manageOpen, setManageOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<TemplateRecord> | null>(null);
  const [saving, setSaving] = useState(false);

  const loadTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('completion_report_templates' as any)
      .select('*')
      .order('user_id', { ascending: true, nullsFirst: true })
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    if (error) { console.error(error); toast.error('Gagal memuat templat'); }
    setTemplates(((data as any[]) || []).map(r => ({
      ...r,
      checklist: Array.isArray(r.checklist) ? r.checklist : [],
    })) as TemplateRecord[]);
    setLoading(false);
  };

  useEffect(() => { if (user) loadTemplates(); }, [user]);

  const apply = (id: string) => {
    setSelectedId(id);
    const tpl = templates.find(t => t.id === id);
    if (!tpl) return;
    onApply({
      work_description: tpl.work_description || '',
      materials_used: tpl.materials_used || '',
      checklistText: checklistToText(tpl.checklist || []),
    });
    toast.success(`Templat "${tpl.name}" digunakan`);
  };

  const openNew = () => {
    setEditing({
      name: '',
      category: '',
      work_description: current.work_description,
      materials_used: current.materials_used,
      checklist: parseChecklist(current.checklistText),
    });
  };

  const openEdit = (tpl: TemplateRecord) => {
    if (tpl.user_id === null) {
      toast.info('Templat lalai tidak boleh diedit. Buat salinan sebagai templat baru.');
      setEditing({
        name: `${tpl.name} (salinan)`,
        category: tpl.category || '',
        work_description: tpl.work_description || '',
        materials_used: tpl.materials_used || '',
        checklist: tpl.checklist,
      });
      return;
    }
    setEditing({ ...tpl });
  };

  const saveTemplate = async () => {
    if (!editing || !user) return;
    if (!editing.name?.trim()) { toast.error('Nama templat diperlukan'); return; }
    setSaving(true);
    try {
      const checklistArr = Array.isArray(editing.checklist)
        ? editing.checklist
        : parseChecklist((editing as any).checklistText || '');
      const payload: any = {
        user_id: user.id,
        name: editing.name.trim(),
        category: editing.category?.trim() || null,
        work_description: editing.work_description?.trim() || null,
        materials_used: editing.materials_used?.trim() || null,
        checklist: checklistArr,
      };
      if (editing.id) {
        const { error } = await supabase.from('completion_report_templates' as any).update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('Templat dikemaskini');
      } else {
        const { error } = await supabase.from('completion_report_templates' as any).insert(payload);
        if (error) throw error;
        toast.success('Templat disimpan');
      }
      setEditing(null);
      await loadTemplates();
    } catch (e: any) {
      toast.error(e.message || 'Gagal simpan templat');
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Padam templat ini?')) return;
    const { error } = await supabase.from('completion_report_templates' as any).delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Templat dipadam');
    await loadTemplates();
  };

  const editingChecklistText = editing
    ? (Array.isArray(editing.checklist) ? checklistToText(editing.checklist) : ((editing as any).checklistText || ''))
    : '';

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">Templat isian pantas</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Pilih templat untuk mengisi penerangan, bahan dan senarai semak sekaligus.
      </p>
      <div className="flex gap-2 flex-wrap">
        <Select value={selectedId} onValueChange={apply} disabled={loading}>
          <SelectTrigger className="flex-1 min-w-[180px] bg-background">
            <SelectValue placeholder={loading ? 'Memuat templat...' : 'Pilih templat'} />
          </SelectTrigger>
          <SelectContent>
            {templates.map(t => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}{t.user_id === null ? ' • Lalai' : ''}
              </SelectItem>
            ))}
            {templates.length === 0 && !loading && (
              <div className="px-3 py-2 text-xs text-muted-foreground">Tiada templat</div>
            )}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" size="sm" onClick={() => setManageOpen(true)} className="gap-1.5">
          <FileText className="h-4 w-4" /> Urus
        </Button>
      </div>

      {/* Manage dialog */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Report Templates</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[55vh] overflow-y-auto">
            {templates.map(t => (
              <div key={t.id} className="flex items-center justify-between gap-2 p-2.5 border border-border rounded-lg bg-card">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground truncate">
                    {t.name}
                    {t.user_id === null && (
                      <span className="ml-2 text-[10px] uppercase tracking-wide bg-muted px-1.5 py-0.5 rounded">Default</span>
                    )}
                  </div>
                  {t.category && <div className="text-[11px] text-muted-foreground">{t.category}</div>}
                </div>
                <div className="flex gap-1">
                  <Button type="button" size="icon" variant="ghost" onClick={() => openEdit(t)} title={t.user_id === null ? 'Copy' : 'Edit'}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {t.user_id !== null && (
                    <Button type="button" size="icon" variant="ghost" onClick={() => deleteTemplate(t.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={openNew} className="gap-1.5">
              <Plus className="h-4 w-4" /> New Template
            </Button>
            <Button type="button" onClick={() => setManageOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit/new dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit Template' : 'New Template'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Template name</Label>
                <Input
                  value={editing.name || ''}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                  placeholder="E.g. Aircond service"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category <span className="text-xs text-muted-foreground">(optional)</span></Label>
                <Input
                  value={editing.category || ''}
                  onChange={e => setEditing({ ...editing, category: e.target.value })}
                  placeholder="E.g. Maintenance"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Work description</Label>
                <Textarea
                  rows={3}
                  value={editing.work_description || ''}
                  onChange={e => setEditing({ ...editing, work_description: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Materials used</Label>
                <Textarea
                  rows={2}
                  value={editing.materials_used || ''}
                  onChange={e => setEditing({ ...editing, materials_used: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Checklist</Label>
                <Textarea
                  rows={4}
                  className="font-mono text-sm"
                  value={editingChecklistText}
                  onChange={e => setEditing({ ...editing, checklist: parseChecklist(e.target.value) })}
                  placeholder={'[x] Item done\n[ ] Item pending'}
                />
                <p className="text-[11px] text-muted-foreground">One item per line. Use [x] for done or [ ] for pending.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="button" onClick={saveTemplate} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
