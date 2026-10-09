import { useState } from 'react';
import { Download, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useL } from '@/i18n/dual';
import UpgradeModal from '@/components/UpgradeModal';

const TABLES = ['customers', 'jobs', 'quotations', 'invoices', 'work_orders', 'completion_reports', 'variation_orders',
  'products', 'job_presets', 'suppliers', 'employees', 'payment_proofs', 'completion_report_templates'] as const;

function toCsv(rows: any[]) {
  if (!rows.length) return '';
  const keys = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
  const esc = (v: any) => {
    const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(','), ...rows.map(r => keys.map(k => esc(r[k])).join(','))].join('\n');
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Paid-only full data export (JSON + CSV per table) for migrating to another app. */
export default function DataBackupSection() {
  const { user, profile } = useAuth();
  const L = useL();
  const isFree = !profile || profile.plan === 'free';
  const [busy, setBusy] = useState<'' | 'json' | 'csv'>('');
  const [upgrade, setUpgrade] = useState(false);

  const fetchAll = async () => {
    const out: Record<string, any[]> = {};
    for (const t of TABLES) {
      const rows: any[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await (supabase.from(t as any) as any).select('*').eq('user_id', user!.id).range(from, from + 999);
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < 1000) break;
      }
      out[t] = rows;
    }
    return out;
  };

  const run = async (kind: 'json' | 'csv') => {
    if (isFree) return setUpgrade(true);
    if (!user) return;
    setBusy(kind);
    try {
      const data = await fetchAll();
      const date = new Date().toISOString().slice(0, 10);
      if (kind === 'json') {
        download(`worktrace-backup-${date}.json`, JSON.stringify({ exported_at: new Date().toISOString(), profile, ...data }, null, 2), 'application/json');
      } else {
        for (const [t, rows] of Object.entries(data)) if (rows.length) download(`worktrace-${t}-${date}.csv`, toCsv(rows), 'text/csv');
      }
      toast.success(L('Backup downloaded', 'Sandaran dimuat turun'));
    } catch {
      toast.error(L('Backup failed. Please try again.', 'Sandaran gagal. Sila cuba lagi.'));
    } finally { setBusy(''); }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {L('Download all your data (customers, jobs, quotations, invoices, reports, products and more) to keep a copy or move to another app.',
           'Muat turun semua data anda (pelanggan, kerja, sebut harga, invois, laporan, produk dan lain-lain) untuk simpanan atau pindah ke aplikasi lain.')}
      </p>
      {isFree && (
        <p className="text-xs flex items-center gap-1 text-muted-foreground"><Lock className="h-3 w-3" />{L('Available on paid plans only.', 'Hanya untuk pelan berbayar.')}</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Button onClick={() => run('json')} disabled={!!busy} className="gap-2">
          <Download className="h-4 w-4" /> {busy === 'json' ? L('Preparing…', 'Menyediakan…') : L('Full backup (JSON)', 'Sandaran penuh (JSON)')}
        </Button>
        <Button variant="outline" onClick={() => run('csv')} disabled={!!busy} className="gap-2">
          <Download className="h-4 w-4" /> {busy === 'csv' ? L('Preparing…', 'Menyediakan…') : L('Spreadsheets (CSV)', 'Hamparan (CSV)')}
        </Button>
      </div>
      <UpgradeModal open={upgrade} onClose={() => setUpgrade(false)} reason={L('Data backup needs a paid plan.', 'Sandaran data memerlukan pelan berbayar.')} />
    </div>
  );
}
