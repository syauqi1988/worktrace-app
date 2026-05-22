/**
 * HS Partnership PLT — Subscription Receipts (Admin Panel)
 * ---------------------------------------------------------
 * Drop-in page for your SEPARATE admin app.
 *
 * Requirements in your admin app:
 *   - @supabase/supabase-js  (npm i @supabase/supabase-js)
 *   - An authenticated admin user (row in `admin_users` with is_active = true)
 *     OR call the function with the project SERVICE_ROLE key (server-side only).
 *
 * Env vars expected (Vite-style; rename for your bundler):
 *   VITE_SUPABASE_URL              = https://fjzbgxooszxhqwyfgjsr.supabase.co
 *   VITE_SUPABASE_PUBLISHABLE_KEY  = <anon key>
 *
 * Backend endpoint used (already deployed in the main app):
 *   POST/GET  {SUPABASE_URL}/functions/v1/admin-subscription-receipts
 *
 * Supported actions:
 *   GET  ?action=list&search=&status=&limit=&offset=
 *   GET  ?action=get&id=<uuid>
 *   GET  ?action=download&id=<uuid>            -> { signed_url }
 *   POST { action: 'update', id, patch: { status?, admin_notes? } }
 *   POST { action: 'regenerate', id }          // rebuilds PDF + re-emails
 *   POST { action: 'resend_email', id }
 */

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const FN_URL = `${SUPABASE_URL}/functions/v1/admin-subscription-receipts`;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

type Receipt = {
  id: string;
  receipt_number: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  billplz_bill_id: string | null;
  plan: string;
  billing_period: 'monthly' | 'yearly';
  amount: number;
  currency: string;
  payment_date: string;
  pdf_path: string | null;
  emailed_at: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON,
    Authorization: `Bearer ${token ?? SUPABASE_ANON}`,
  };
}

async function api<T = any>(opts: {
  method: 'GET' | 'POST';
  query?: Record<string, string | number | undefined>;
  body?: any;
}): Promise<T> {
  const qs = new URLSearchParams();
  Object.entries(opts.query || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  });
  const url = qs.toString() ? `${FN_URL}?${qs}` : FN_URL;
  const res = await fetch(url, {
    method: opts.method,
    headers: await authHeaders(),
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
  return json as T;
}

export default function SubscriptionReceiptsAdminPage() {
  const [items, setItems] = useState<Receipt[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Receipt | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const limit = 25;
  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api<{ items: Receipt[]; total: number }>({
        method: 'GET',
        query: { action: 'list', search, status, limit, offset: page * limit },
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, status]);

  const openDetail = (r: Receipt) => {
    setSelected(r);
    setEditStatus(r.status);
    setEditNotes(r.admin_notes || '');
  };

  const download = async (id: string) => {
    setBusyId(id);
    try {
      const { signed_url } = await api<{ signed_url: string }>({
        method: 'GET', query: { action: 'download', id },
      });
      window.open(signed_url, '_blank');
    } catch (e: any) { alert(e.message); }
    finally { setBusyId(null); }
  };

  const saveUpdate = async () => {
    if (!selected) return;
    setBusyId(selected.id);
    try {
      const { item } = await api<{ item: Receipt }>({
        method: 'POST',
        body: { action: 'update', id: selected.id, patch: { status: editStatus, admin_notes: editNotes } },
      });
      setSelected(item);
      setItems((arr) => arr.map((x) => (x.id === item.id ? item : x)));
    } catch (e: any) { alert(e.message); }
    finally { setBusyId(null); }
  };

  const regenerate = async (id: string) => {
    if (!confirm('Regenerate PDF and re-email to the customer?')) return;
    setBusyId(id);
    try {
      await api({ method: 'POST', body: { action: 'regenerate', id } });
      await load();
      alert('Receipt regenerated and re-emailed.');
    } catch (e: any) { alert(e.message); }
    finally { setBusyId(null); }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ margin: 0 }}>Subscription Receipts</h1>
      <p style={{ color: '#64748b', marginTop: 4 }}>
        HS Partnership PLT — official receipts issued on successful subscription payments.
      </p>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        <input
          placeholder="Search receipt #, email, name, bill ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (setPage(0), load())}
          style={inputStyle}
        />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} style={inputStyle}>
          <option value="">All statuses</option>
          <option value="issued">Issued</option>
          <option value="updated">Updated</option>
          <option value="void">Void</option>
        </select>
        <button onClick={() => { setPage(0); load(); }} style={btnPrimary}>Search</button>
      </div>

      {/* Table */}
      <div style={{ marginTop: 16, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead style={{ background: '#f8fafc', textAlign: 'left' }}>
            <tr>
              <th style={th}>Receipt #</th>
              <th style={th}>Customer</th>
              <th style={th}>Plan</th>
              <th style={th}>Amount</th>
              <th style={th}>Date</th>
              <th style={th}>Status</th>
              <th style={th}>Emailed</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>Loading…</td></tr>}
            {!loading && items.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>No receipts found.</td></tr>
            )}
            {items.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                <td style={td}><code>{r.receipt_number}</code></td>
                <td style={td}>
                  <div style={{ fontWeight: 500 }}>{r.user_name || '—'}</div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>{r.user_email}</div>
                </td>
                <td style={td}>{r.plan} · {r.billing_period}</td>
                <td style={td}>RM {Number(r.amount).toFixed(2)}</td>
                <td style={td}>{new Date(r.payment_date).toLocaleDateString()}</td>
                <td style={td}><span style={pill(r.status)}>{r.status}</span></td>
                <td style={td}>{r.emailed_at ? '✓' : '—'}</td>
                <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button onClick={() => openDetail(r)} style={btnGhost}>View</button>
                  <button onClick={() => download(r.id)} disabled={!r.pdf_path || busyId === r.id} style={btnGhost}>
                    Download
                  </button>
                  <button onClick={() => regenerate(r.id)} disabled={busyId === r.id} style={btnGhost}>
                    Regenerate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <div style={{ color: '#64748b', fontSize: 13 }}>{total} total</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} style={btnGhost}>Prev</button>
          <div style={{ alignSelf: 'center', fontSize: 13 }}>Page {page + 1} / {pageCount}</div>
          <button disabled={page + 1 >= pageCount} onClick={() => setPage((p) => p + 1)} style={btnGhost}>Next</button>
        </div>
      </div>

      {/* Detail drawer */}
      {selected && (
        <div style={overlay} onClick={() => setSelected(null)}>
          <div style={drawer} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>{selected.receipt_number}</h2>
              <button onClick={() => setSelected(null)} style={btnGhost}>Close</button>
            </div>
            <p style={{ color: '#64748b', marginTop: 4 }}>
              Issued {new Date(selected.created_at).toLocaleString()}
            </p>

            <Section title="Customer">
              <Row k="Name" v={selected.user_name || '—'} />
              <Row k="Email" v={selected.user_email} />
              <Row k="User ID" v={<code>{selected.user_id}</code>} />
            </Section>

            <Section title="Payment">
              <Row k="Plan" v={`${selected.plan} · ${selected.billing_period}`} />
              <Row k="Amount" v={`RM ${Number(selected.amount).toFixed(2)} ${selected.currency || 'MYR'}`} />
              <Row k="Payment date" v={new Date(selected.payment_date).toLocaleString()} />
              <Row k="BillPlz bill ID" v={selected.billplz_bill_id || '—'} />
              <Row k="Emailed at" v={selected.emailed_at ? new Date(selected.emailed_at).toLocaleString() : '—'} />
            </Section>

            <Section title="Admin">
              <label style={lbl}>Status</label>
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} style={inputStyle}>
                <option value="issued">issued</option>
                <option value="updated">updated</option>
                <option value="void">void</option>
              </select>
              <label style={lbl}>Notes</label>
              <textarea
                rows={4}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                style={{ ...inputStyle, width: '100%' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <button onClick={saveUpdate} disabled={busyId === selected.id} style={btnPrimary}>Save changes</button>
                <button onClick={() => download(selected.id)} disabled={!selected.pdf_path || busyId === selected.id} style={btnGhost}>
                  Download PDF
                </button>
                <button onClick={() => regenerate(selected.id)} disabled={busyId === selected.id} style={btnGhost}>
                  Regenerate & re-email
                </button>
              </div>
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- tiny presentational helpers ---------- */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 14, textTransform: 'uppercase', color: '#64748b', letterSpacing: 0.5 }}>{title}</h3>
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>{children}</div>
    </div>
  );
}
function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '4px 0', fontSize: 14 }}>
      <div style={{ width: 140, color: '#64748b' }}>{k}</div>
      <div style={{ flex: 1 }}>{v}</div>
    </div>
  );
}
function pill(status: string): React.CSSProperties {
  const map: Record<string, [string, string]> = {
    issued: ['#dcfce7', '#166534'],
    updated: ['#dbeafe', '#1e40af'],
    void: ['#fee2e2', '#991b1b'],
  };
  const [bg, fg] = map[status] || ['#e2e8f0', '#334155'];
  return { background: bg, color: fg, padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 600 };
}

const inputStyle: React.CSSProperties = { padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14 };
const btnPrimary: React.CSSProperties = { padding: '8px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 };
const btnGhost: React.CSSProperties = { padding: '6px 10px', background: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer', fontSize: 13, marginLeft: 4 };
const th: React.CSSProperties = { padding: '10px 12px', fontWeight: 600, fontSize: 12, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4 };
const td: React.CSSProperties = { padding: '10px 12px', verticalAlign: 'top' };
const lbl: React.CSSProperties = { display: 'block', fontSize: 12, color: '#64748b', marginTop: 8, marginBottom: 4 };
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', justifyContent: 'flex-end', zIndex: 50 };
const drawer: React.CSSProperties = { width: 'min(560px, 100%)', height: '100%', background: '#fff', padding: 24, overflowY: 'auto' };
