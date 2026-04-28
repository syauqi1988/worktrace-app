import { CheckCircle2, AlertCircle, Clock, MapPin, FileText } from 'lucide-react';

export interface ChecklistItem {
  title: string;
  done?: boolean;
  note?: string | null;
}

export interface CompletionReportViewData {
  report_number: string;
  completion_date: string | null;
  technician_name: string | null;
  work_description: string | null;
  materials_used: string | null;
  customer_signature: string | null;
  notes: string | null;
  status?: string | null;
  accepted_at?: string | null;
  submitted_at?: string | null;
  before_photos?: string[];
  after_photos?: string[];
  location_label?: string | null;
  project_ref?: string | null;
  checklist?: ChecklistItem[];
  photo_captions?: { before?: string[]; after?: string[] };
}

export interface CompletionReportViewProps {
  report: CompletionReportViewData;
  job: { job_number: string; title: string; category: string } | null;
  customer: { name: string; phone?: string | null; address?: string | null } | null;
  company: { company_name: string | null; logo_url?: string | null };
}

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(d: string | null | undefined) {
  if (!d) return '—';
  const dt = new Date(d);
  return `${dt.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' })}, ${dt.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
}

function statusPill(status?: string | null) {
  const s = (status || 'draft').toLowerCase();
  if (s === 'accepted') return { label: 'Disahkan Pelanggan', dot: 'bg-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-700' };
  if (s === 'rejected') return { label: 'Ditolak', dot: 'bg-rose-600', bg: 'bg-rose-50', text: 'text-rose-700' };
  if (s === 'submitted') return { label: 'Menunggu Pengesahan', dot: 'bg-blue-600', bg: 'bg-blue-50', text: 'text-blue-700' };
  return { label: 'Draf', dot: 'bg-slate-400', bg: 'bg-slate-100', text: 'text-slate-700' };
}

function SectionHead({ label, count }: { label: string; count?: number | string }) {
  return (
    <div className="flex items-center gap-3 mt-6 mb-3 first:mt-0">
      <div className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase whitespace-nowrap">
        {label}
      </div>
      {count !== undefined && (
        <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-[1px] font-mono">
          {count}
        </span>
      )}
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function PhotoCard({ src, kind, caption, fallbackTime }: { src: string; kind: 'Sebelum' | 'Selepas'; caption?: string; fallbackTime?: string | null }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="relative aspect-[4/3] bg-muted">
        <img src={src} alt={caption || kind} className="w-full h-full object-cover" />
        <div className="absolute top-2 left-2">
          <span className="bg-black/55 text-white text-[10px] px-2 py-[2px] rounded-full font-mono">{kind}</span>
        </div>
      </div>
      {(caption || fallbackTime) && (
        <div className="p-2.5 sm:p-3">
          {caption && <p className="text-[12px] sm:text-[13px] text-foreground leading-snug mb-1.5">{caption}</p>}
          {fallbackTime && (
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-muted-foreground font-mono">
              <Clock className="h-3 w-3" />
              {formatDateTime(fallbackTime)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CompletionReportView({ report, job, customer, company }: CompletionReportViewProps) {
  const before = report.before_photos ?? [];
  const after = report.after_photos ?? [];
  const beforeCaps = report.photo_captions?.before ?? [];
  const afterCaps = report.photo_captions?.after ?? [];
  const checklist = report.checklist ?? [];
  const pill = statusPill(report.status);
  const totalPhotos = before.length + after.length;

  return (
    <div className="bg-[hsl(var(--background))] rounded-xl border border-border overflow-hidden">
      {/* Header bar */}
      <div className="bg-card border-b border-border px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {company.logo_url ? (
            <img src={company.logo_url} alt="" className="h-8 w-8 rounded-md object-contain bg-muted" />
          ) : (
            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
              <FileText className="h-4 w-4 text-primary" />
            </div>
          )}
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-foreground truncate leading-tight">
              {company.company_name || 'WorkTrace'}
            </div>
            <div className="text-[10px] text-muted-foreground font-mono">Laporan Siap Kerja</div>
          </div>
        </div>
        <div className={`inline-flex items-center gap-1.5 ${pill.bg} ${pill.text} text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap`}>
          <span className={`w-1.5 h-1.5 rounded-full ${pill.dot}`} />
          <span className="hidden xs:inline">{pill.label}</span>
        </div>
      </div>

      {/* Meta banner */}
      <div className="bg-card border-b border-border px-4 sm:px-5 pt-4 pb-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-foreground leading-tight tracking-tight">
              {job?.title || 'Laporan Siap Kerja'}
            </h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {job?.job_number && <span>Kerja: {job.job_number}</span>}
              {report.project_ref && <span> &nbsp;·&nbsp; Ref: {report.project_ref}</span>}
              <span> &nbsp;·&nbsp; No. Laporan: {report.report_number}</span>
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <MetaCell label="Tarikh Siap" value={formatDate(report.completion_date)} />
          <MetaCell label="Kategori" value={job?.category || '—'} />
          <MetaCell label="Lokasi" value={report.location_label || '—'} />
          <MetaCell label="Disediakan oleh" value={report.technician_name || '—'} />
        </div>
      </div>

      {/* Body */}
      <div className="px-4 sm:px-5 py-5">
        {/* Customer */}
        <SectionHead label="Pelanggan" />
        <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
          <div className="font-medium text-foreground text-[14px]">{(customer?.name || '—').toUpperCase()}</div>
          {customer?.phone && <div className="text-[12px] text-muted-foreground mt-0.5">{customer.phone}</div>}
          {customer?.address && <div className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{customer.address}</div>}
        </div>

        {/* Work description */}
        {report.work_description && (
          <>
            <SectionHead label="Kerja Dilaksanakan" />
            <div className="bg-muted/40 border border-border rounded-lg p-3 sm:p-4">
              <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">{report.work_description}</p>
            </div>
          </>
        )}

        {/* Materials */}
        {report.materials_used && (
          <>
            <SectionHead label="Bahan / Alatan" />
            <div className="bg-muted/40 border border-border rounded-lg p-3 sm:p-4">
              <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">{report.materials_used}</p>
            </div>
          </>
        )}

        {/* Photos */}
        {totalPhotos > 0 && (
          <>
            <SectionHead label="Gambar Kerja" count={`${totalPhotos} gambar`} />
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {before.map((src, i) => (
                <PhotoCard key={`b-${i}`} src={src} kind="Sebelum" caption={beforeCaps[i]} fallbackTime={report.completion_date} />
              ))}
              {after.map((src, i) => (
                <PhotoCard key={`a-${i}`} src={src} kind="Selepas" caption={afterCaps[i]} fallbackTime={report.completion_date} />
              ))}
            </div>
          </>
        )}

        {/* Checklist */}
        {checklist.length > 0 && (
          <>
            <SectionHead label="Senarai Semak" count={`${checklist.length} item`} />
            <div className="space-y-2">
              {checklist.map((item, i) => {
                const done = item.done !== false;
                return (
                  <div key={i} className="bg-card border border-border rounded-lg p-3 flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 ${done ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                      {done ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-foreground leading-snug">{item.title}</div>
                      {item.note && <div className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{item.note}</div>}
                    </div>
                    {!done && (
                      <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full whitespace-nowrap self-start">Pending</span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Engineer's notes */}
        {report.notes && (
          <>
            <SectionHead label="Catatan / Nota Tapak" />
            <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
              <div className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase mb-2 font-mono">
                Nota Juruteknik
              </div>
              <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">{report.notes}</p>
            </div>
          </>
        )}

        {/* Sign-off */}
        <SectionHead label="Pengesahan" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <SignoffCard
            role="Disediakan oleh (Juruteknik)"
            name={report.technician_name || company.company_name || '—'}
            date={report.submitted_at || report.completion_date}
            sub={company.company_name || undefined}
          />
          <SignoffCard
            role="Disahkan oleh (Pelanggan)"
            name={
              report.status === 'accepted'
                ? customer?.name || report.customer_signature || 'Pelanggan'
                : report.customer_signature || 'Menunggu pengesahan'
            }
            date={report.accepted_at}
            sub={
              report.status === 'accepted'
                ? 'Disahkan via WhatsApp'
                : report.status === 'rejected'
                ? 'Ditolak — sila semak laporan'
                : 'Belum disahkan'
            }
            pending={report.status !== 'accepted'}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="bg-card border-t border-border px-4 sm:px-5 py-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <div className="font-mono">
          <strong className="font-semibold text-foreground">WorkTrace</strong> · {report.report_number}
        </div>
        <div className="hidden sm:block font-mono">{formatDateTime(new Date().toISOString())}</div>
      </div>
    </div>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-lg px-3 py-2">
      <div className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-0.5">{label}</div>
      <div className="text-[12px] sm:text-[13px] font-medium text-foreground truncate">{value}</div>
    </div>
  );
}

function SignoffCard({ role, name, date, sub, pending }: { role: string; name: string; date?: string | null; sub?: string; pending?: boolean }) {
  return (
    <div className="bg-card border border-border rounded-lg p-3 sm:p-3.5">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">{role}</div>
      <div className={`text-[13px] font-medium ${pending ? 'text-muted-foreground italic' : 'text-foreground'}`}>{name}</div>
      <div className="text-[11px] font-mono text-muted-foreground mt-0.5">{date ? formatDate(date) : '— — —'}</div>
      <div className="border-b-[1.5px] border-border mt-2 mb-1.5 h-5" />
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
