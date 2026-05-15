import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Hash, Eye } from 'lucide-react';
import {
  DEFAULT_DOC_SETTINGS,
  previewDocNumber,
  type DocType,
  type DocNumberSettings,
} from '@/utils/generateDocNumber';

const TABS: DocType[] = ['quotation', 'work_order', 'invoice', 'completion_report', 'receipt', 'vo'];
const PADDINGS = [3, 4, 5, 6];

export default function DocNumberSettings() {
  const { t } = useTranslation();
  const { user, profile, refreshProfile } = useAuth();
  const [settings, setSettings] = useState<Record<DocType, DocNumberSettings>>(DEFAULT_DOC_SETTINGS);
  const [activeTab, setActiveTab] = useState<DocType>('quotation');
  const [saving, setSaving] = useState(false);
  const [originalNext, setOriginalNext] = useState<number>(1);

  const SEPARATORS = useMemo(() => ([
    { value: '-', label: t('settingsExtra.sepDash') },
    { value: '/', label: t('settingsExtra.sepSlash') },
    { value: '.', label: t('settingsExtra.sepDot') },
    { value: '', label: t('settingsExtra.sepNone') },
  ]), [t]);

  const labelFor = (type: DocType) => t(`docTypes.${type}`);

  useEffect(() => {
    if (!profile || !user) return;
    const loaded = (profile as any).doc_number_settings as Partial<Record<DocType, DocNumberSettings>> | null;
    if (loaded && Object.keys(loaded).length > 0) {
      setSettings({
        quotation: { ...DEFAULT_DOC_SETTINGS.quotation, ...(loaded.quotation || {}) },
        work_order: { ...DEFAULT_DOC_SETTINGS.work_order, ...(loaded.work_order || {}) },
        invoice: { ...DEFAULT_DOC_SETTINGS.invoice, ...(loaded.invoice || {}) },
        completion_report: { ...DEFAULT_DOC_SETTINGS.completion_report, ...(loaded.completion_report || {}) },
        receipt: { ...DEFAULT_DOC_SETTINGS.receipt, ...(loaded.receipt || {}) },
      });
      return;
    }
    (async () => {
      const [qc, wc, ic, rc, recc] = await Promise.all([
        supabase.from('quotations').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('work_orders').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('completion_reports').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('user_id', user.id).not('receipt_number', 'is', null),
      ]);
      setSettings({
        quotation:         { ...DEFAULT_DOC_SETTINGS.quotation,         next_number: (qc.count ?? 0) + 1 },
        work_order:        { ...DEFAULT_DOC_SETTINGS.work_order,        next_number: (wc.count ?? 0) + 1 },
        invoice:           { ...DEFAULT_DOC_SETTINGS.invoice,           next_number: (ic.count ?? 0) + 1 },
        completion_report: { ...DEFAULT_DOC_SETTINGS.completion_report, next_number: (rc.count ?? 0) + 1 },
        receipt:           { ...DEFAULT_DOC_SETTINGS.receipt,           next_number: (recc.count ?? 0) + 1 },
      });
    })();
  }, [profile, user]);

  useEffect(() => {
    setOriginalNext(settings[activeTab].next_number);
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const current = settings[activeTab];

  const update = (patch: Partial<DocNumberSettings>) => {
    setSettings(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], ...patch } }));
  };

  const previewNext = useMemo(
    () => previewDocNumber(current.prefix, current.padding, current.separator, current.suffix, current.next_number),
    [current]
  );
  const previewN1 = useMemo(
    () => previewDocNumber(current.prefix, current.padding, current.separator, current.suffix, current.next_number + 1),
    [current]
  );
  const previewN2 = useMemo(
    () => previewDocNumber(current.prefix, current.padding, current.separator, current.suffix, current.next_number + 2),
    [current]
  );

  const handleSave = async () => {
    if (!user) return;
    if (!current.prefix.trim()) { toast.error(t('settingsExtra.prefixRequired')); return; }
    if (current.next_number < 1) { toast.error(t('settingsExtra.minOne')); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({
        doc_number_settings: settings as any,
      }).eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success(t('settingsExtra.saved', { label: labelFor(activeTab), preview: previewNext }));
    } catch (e: any) {
      toast.error(e.message || t('settingsExtra.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!confirm(t('settingsExtra.resetConfirm', { label: labelFor(activeTab) }))) return;
    update({
      prefix: DEFAULT_DOC_SETTINGS[activeTab].prefix,
      padding: DEFAULT_DOC_SETTINGS[activeTab].padding,
      separator: DEFAULT_DOC_SETTINGS[activeTab].separator,
      suffix: DEFAULT_DOC_SETTINGS[activeTab].suffix,
    });
    toast.info(t('settingsExtra.resetDone'));
  };

  const lowered = current.next_number < originalNext;

  return (
    <section className="bg-card rounded-xl border border-border p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Hash className="h-5 w-5 text-primary" />
        <h2 className="text-base font-bold text-foreground">{t('settingsExtra.docNumTitle')}</h2>
      </div>
      <p className="text-sm text-muted-foreground">{t('settingsExtra.docNumDesc')}</p>

      <div className="flex flex-wrap gap-2">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
              activeTab === tab ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:bg-accent'
            }`}>
            {labelFor(tab)}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>{t('settingsExtra.prefix')}</Label>
          <Input value={current.prefix} maxLength={15}
            onChange={e => update({ prefix: e.target.value.toUpperCase() })}
            placeholder="QUO" />
          <p className="text-xs text-muted-foreground">{t('settingsExtra.prefixHelp')}</p>
        </div>

        <div className="space-y-1.5">
          <Label>{t('settingsExtra.separator')}</Label>
          <div className="grid grid-cols-2 gap-2">
            {SEPARATORS.map(s => (
              <button key={s.label} onClick={() => update({ separator: s.value })}
                className={`px-3 py-2 rounded-lg border text-sm text-left ${
                  current.separator === s.value ? 'bg-primary/10 border-primary text-foreground' : 'border-border hover:bg-accent'
                }`}>
                <div className="font-medium">{s.label}</div>
                <div className="text-xs text-muted-foreground">{previewDocNumber(current.prefix, current.padding, s.value, current.suffix, 1)}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>{t('settingsExtra.numLength')}</Label>
          <div className="flex flex-wrap gap-2">
            {PADDINGS.map(p => (
              <button key={p} onClick={() => update({ padding: p })}
                className={`px-3 py-2 rounded-lg border text-sm ${
                  current.padding === p ? 'bg-primary/10 border-primary text-foreground' : 'border-border hover:bg-accent'
                }`}>
                {t('settingsExtra.digitsExample', { n: p, example: String(1).padStart(p, '0') })}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>{t('settingsExtra.suffix')}</Label>
          <Input value={current.suffix} maxLength={15}
            onChange={e => update({ suffix: e.target.value })}
            placeholder="/2025 / -KL" />
          <p className="text-xs text-muted-foreground">{t('settingsExtra.suffixHelp')}</p>
        </div>

        <div className="space-y-1.5">
          <Label>{t('settingsExtra.nextNumber')}</Label>
          <Input type="number" min={1} max={999999} value={current.next_number}
            onChange={e => update({ next_number: Math.max(1, Number(e.target.value) || 1) })} />
          <p className="text-xs text-muted-foreground">{t('settingsExtra.nextHelp')}</p>
          {lowered && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              {t('settingsExtra.loweredWarn')}
            </p>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700">
            <Eye className="h-3.5 w-3.5" /> {t('settingsExtra.preview')}
          </div>
          <div>
            <p className="text-xs text-blue-700">{t('settingsExtra.nextLabel')}</p>
            <p className="text-2xl font-bold text-blue-700">{previewNext}</p>
          </div>
          <p className="text-xs text-blue-700">{t('settingsExtra.afterPreview', { a: previewN1, b: previewN2 })}</p>
        </div>

        <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium">{t('settingsExtra.examplesTitle')}</p>
          <p>{t('settingsExtra.exClassic', { ex: 'INV-0001' })}</p>
          <p>{t('settingsExtra.exYear', { ex: 'INV/2025/001' })}</p>
          <p>{t('settingsExtra.exArea', { ex: 'KL-INV-0001' })}</p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full rounded-lg">
          {saving ? t('settingsExtra.savingDocNum') : t('settingsExtra.saveDocNum')}
        </Button>
        <button onClick={handleReset} className="w-full text-xs text-muted-foreground hover:underline">
          {t('settingsExtra.restoreDefault')}
        </button>
      </div>
    </section>
  );
}
