import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, CalendarDays } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

type Preset = 'week' | 'month' | 'lastMonth' | '30d' | '90d' | 'year' | 'custom';

interface DateRange {
  preset: Preset;
  start: Date;
  end: Date;
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

function getRangeForPreset(p: Preset): { start: Date; end: Date } {
  const now = new Date();
  const today = startOfDay(now);
  switch (p) {
    case 'week': {
      const day = today.getDay() || 7; // Mon=1..Sun=7
      const start = new Date(today);
      start.setDate(today.getDate() - (day - 1));
      return { start, end: endOfDay(now) };
    }
    case 'month':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfDay(now) };
    case 'lastMonth': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start, end };
    }
    case '30d': {
      const start = new Date(today);
      start.setDate(today.getDate() - 29);
      return { start, end: endOfDay(now) };
    }
    case '90d': {
      const start = new Date(today);
      start.setDate(today.getDate() - 89);
      return { start, end: endOfDay(now) };
    }
    case 'year':
      return { start: new Date(now.getFullYear(), 0, 1), end: endOfDay(now) };
    default:
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfDay(now) };
  }
}

function formatLabel(r: DateRange): string {
  switch (r.preset) {
    case 'week': return 'Minggu Ini';
    case 'month': return `${MONTH_SHORT[r.start.getMonth()]} ${r.start.getFullYear()}`;
    case 'lastMonth': return `${MONTH_SHORT[r.start.getMonth()]} ${r.start.getFullYear()}`;
    case '30d': return '30 Hari';
    case '90d': return '90 Hari';
    case 'year': return `Tahun ${r.start.getFullYear()}`;
    case 'custom': {
      const sameMonth = r.start.getMonth() === r.end.getMonth() && r.start.getFullYear() === r.end.getFullYear();
      if (sameMonth) {
        return `${String(r.start.getDate()).padStart(2, '0')}–${String(r.end.getDate()).padStart(2, '0')} ${MONTH_SHORT[r.start.getMonth()]}`;
      }
      return `${r.start.getDate()} ${MONTH_SHORT[r.start.getMonth()]} – ${r.end.getDate()} ${MONTH_SHORT[r.end.getMonth()]}`;
    }
  }
}

function toInputDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface Props {
  userId: string;
}

export default function RevenueRangeCard({ userId }: Props) {
  const [range, setRange] = useState<DateRange>(() => {
    const { start, end } = getRangeForPreset('month');
    return { preset: 'month', start, end };
  });
  const [revenue, setRevenue] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [customStart, setCustomStart] = useState(toInputDate(range.start));
  const [customEnd, setCustomEnd] = useState(toInputDate(range.end));
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    supabase.from('invoices').select('total')
      .eq('status', 'Paid')
      .gte('paid_date', toInputDate(range.start))
      .lte('paid_date', toInputDate(range.end))
      .then(({ data }) => {
        if (cancelled) return;
        const total = (data || []).reduce((s, inv: any) => s + Number(inv.total || 0), 0);
        setRevenue(total);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [userId, range.start, range.end]);

  const label = useMemo(() => formatLabel(range), [range]);

  function applyPreset(p: Preset) {
    const { start, end } = getRangeForPreset(p);
    setRange({ preset: p, start, end });
    setCustomStart(toInputDate(start));
    setCustomEnd(toInputDate(end));
    setOpen(false);
  }

  function applyCustom() {
    const start = startOfDay(new Date(customStart));
    const end = endOfDay(new Date(customEnd));
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return;
    setRange({ preset: 'custom', start, end });
    setOpen(false);
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4 relative overflow-visible">
      <div className="absolute top-3 right-3 flex items-center gap-1">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors"
          aria-label="Tukar julat tarikh"
        >
          <CalendarDays className="h-4 w-4" />
        </button>
        <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
          <DollarSign className="h-4 w-4 text-blue-600" />
        </div>
      </div>

      {loading ? (
        <>
          <Skeleton className="h-3 w-32 mb-2" />
          <Skeleton className="h-7 w-24" />
        </>
      ) : (
        <>
          <p className="text-[13px] text-muted-foreground pr-24">Pendapatan: {label}</p>
          <p className="text-2xl font-semibold text-foreground mt-1">RM {revenue.toFixed(2)}</p>
        </>
      )}

      {open && (
        <div
          ref={popoverRef}
          className="absolute z-30 top-14 right-3 w-[280px] bg-popover border border-border rounded-xl shadow-lg p-3 space-y-3"
        >
          <div className="flex flex-wrap gap-1.5">
            {([
              ['week', 'Minggu Ini'],
              ['month', 'Bulan Ini'],
              ['lastMonth', 'Bulan Lepas'],
              ['30d', '30 Hari'],
              ['90d', '90 Hari'],
              ['year', 'Tahun Ini'],
            ] as [Preset, string][]).map(([p, lbl]) => (
              <button
                key={p}
                type="button"
                onClick={() => applyPreset(p)}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors ${
                  range.preset === p
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-sidebar-background text-muted-foreground hover:bg-sidebar-accent'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
          <div className="border-t border-border pt-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">Dari</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="w-full h-8 px-2 text-xs rounded border border-input bg-background"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">Hingga</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  className="w-full h-8 px-2 text-xs rounded border border-input bg-background"
                />
              </div>
            </div>
            <Button size="sm" onClick={applyCustom} className="w-full h-8 rounded-lg text-xs">Guna</Button>
          </div>
        </div>
      )}
    </div>
  );
}
