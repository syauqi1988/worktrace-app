import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeft, Edit, Trash2, User, Phone, Mail, MapPin,
  CalendarDays, FileText, Receipt, MessageCircle
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  Lead: 'bg-gray-100 text-gray-600',
  Scheduled: 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-amber-100 text-amber-700',
  Completed: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
};

const CATEGORY_COLORS: Record<string, string> = {
  Renovation: 'bg-blue-100 text-blue-700',
  Aircond: 'bg-cyan-100 text-cyan-700',
  Electrical: 'bg-amber-100 text-amber-700',
  Plumbing: 'bg-indigo-100 text-indigo-700',
  Maintenance: 'bg-green-100 text-green-700',
  Welding: 'bg-orange-100 text-orange-700',
  Other: 'bg-gray-100 text-gray-600',
};

const STATUSES = ['Lead', 'Scheduled', 'In Progress', 'Completed', 'Cancelled'];

interface Job {
  id: string;
  job_number: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  scheduled_date: string | null;
  completed_date: string | null;
  amount: number | null;
  notes: string | null;
  created_at: string;
  customer_id: string | null;
  customers: { id: string; name: string; phone: string | null; email: string | null; address: string | null } | null;
}

interface Quotation {
  id: string;
  quote_number: string;
  total: number;
  status: string;
  valid_until: string | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  total: number;
  status: string;
  due_date: string | null;
}

function formatPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = '60' + cleaned.slice(1);
  if (!cleaned.startsWith('60')) cleaned = '60' + cleaned;
  return cleaned;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    async function fetch() {
      const [jobRes, invRes] = await Promise.all([
        supabase.from('jobs')
          .select('*, customers(id, name, phone, email, address)')
          .eq('id', id)
          .single(),
        supabase.from('invoices')
          .select('id, invoice_number, total, status, due_date')
          .eq('job_id', id),
      ]);
      setJob(jobRes.data as unknown as Job);
      setInvoices((invRes.data as Invoice[]) || []);
      setLoading(false);
    }
    fetch();
  }, [user, id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!job) return;
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'Completed') updates.completed_date = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from('jobs').update(updates).eq('id', job.id);
    if (error) {
      toast({ title: 'Ralat', description: error.message, variant: 'destructive' });
    } else {
      setJob({ ...job, status: newStatus, completed_date: updates.completed_date as string || job.completed_date });
      toast({ title: 'Status dikemaskini!' });
    }
  };

  const handleDelete = async () => {
    if (!job) return;
    setDeleting(true);
    const { error } = await supabase.from('jobs').delete().eq('id', job.id);
    setDeleting(false);
    if (error) {
      toast({ title: 'Ralat', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Kerja berjaya dipadam!' });
      navigate('/jobs');
    }
  };

  const whatsappUrl = job?.customers?.phone
    ? `https://wa.me/${formatPhone(job.customers.phone)}?text=${encodeURIComponent(`Hi ${job.customers.name}, saya nak follow up berkenaan kerja ${job.job_number}. Boleh confirm status terkini?`)}`
    : null;

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-4 md:p-6 text-center">
        <p className="text-muted-foreground">Kerja tidak dijumpai.</p>
        <Button variant="outline" onClick={() => navigate('/jobs')} className="mt-4">Kembali</Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 pb-28 md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/jobs')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-foreground">{job.job_number}</h1>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[job.status]}`}>{job.status}</span>
          </div>
          <p className="text-sm text-muted-foreground truncate">{job.title}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(`/jobs/${job.id}/edit`)} className="gap-1.5 shrink-0">
          <Edit className="h-3.5 w-3.5" /> Edit
        </Button>
      </div>

      {/* Customer Card */}
      {job.customers && (
        <div className="bg-card rounded-xl border border-border p-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pelanggan</p>
          <p className="text-base font-semibold text-foreground">{job.customers.name}</p>
          {job.customers.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-foreground">{job.customers.phone}</span>
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full hover:bg-green-100">
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </a>
              )}
            </div>
          )}
          {job.customers.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-foreground">{job.customers.email}</span>
            </div>
          )}
          {job.customers.address && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-foreground">{job.customers.address}</span>
            </div>
          )}
        </div>
      )}

      {/* Job Info Card */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Maklumat Kerja</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Kategori</p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block mt-0.5 ${CATEGORY_COLORS[job.category] || CATEGORY_COLORS.Other}`}>{job.category}</span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <Select value={job.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-7 w-fit mt-0.5 text-xs rounded-full border-0 px-2 py-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {job.scheduled_date && (
            <div>
              <p className="text-xs text-muted-foreground">Tarikh Dijadualkan</p>
              <p className="text-sm text-foreground mt-0.5">{formatDate(job.scheduled_date)}</p>
            </div>
          )}
          {job.completed_date && (
            <div>
              <p className="text-xs text-muted-foreground">Tarikh Siap</p>
              <p className="text-sm text-foreground mt-0.5">{formatDate(job.completed_date)}</p>
            </div>
          )}
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">Dicipta</p>
            <p className="text-sm text-foreground mt-0.5">{formatDate(job.created_at)}</p>
          </div>
        </div>
        {job.description && (
          <div>
            <p className="text-xs text-muted-foreground">Penerangan</p>
            <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap">{job.description}</p>
          </div>
        )}
        {job.notes && (
          <div>
            <p className="text-xs text-muted-foreground">Nota</p>
            <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">{job.notes}</p>
          </div>
        )}
      </div>

      {/* Related Quotation */}
      <div className="bg-card rounded-xl border border-border p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Sebut Harga</p>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Belum ada sebut harga</p>
          <Button variant="outline" size="sm" className="text-xs gap-1"
            onClick={() => navigate(`/quotations/new?job_id=${job.id}`)}>
            <FileText className="h-3.5 w-3.5" /> Buat Sebut Harga
          </Button>
        </div>
      </div>

      {/* Related Invoice */}
      <div className="bg-card rounded-xl border border-border p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Invois</p>
        {invoices.length === 0 ? (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Belum ada invois</p>
            <Button variant="outline" size="sm" className="text-xs gap-1"
              onClick={() => navigate(`/invoices/new?job_id=${job.id}`)}>
              <Receipt className="h-3.5 w-3.5" /> Buat Invois
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {invoices.map(inv => (
              <button key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors text-left">
                <div>
                  <p className="text-sm font-semibold text-foreground">{inv.invoice_number}</p>
                  <p className="text-xs text-muted-foreground">RM {Number(inv.total).toFixed(2)}</p>
                </div>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                  inv.status === 'Paid' ? 'bg-green-100 text-green-700' :
                  inv.status === 'Sent' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}>{inv.status}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button onClick={() => navigate(`/jobs/${job.id}/edit`)} className="flex-1 rounded-lg gap-2">
          <Edit className="h-4 w-4" /> Edit Kerja
        </Button>
        <Button variant="outline" onClick={() => setDeleteOpen(true)} className="rounded-lg gap-2 text-destructive border-destructive/30 hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" /> Padam
        </Button>
      </div>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Padam Kerja?</DialogTitle>
            <DialogDescription>
              Tindakan ini tidak boleh dibatalkan. Sebut harga dan invois berkaitan tidak akan dipadam.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Memadam...' : 'Padam'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
