import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeft, Edit, Trash2, Phone, Mail, MapPin, Hash,
  Briefcase, MessageCircle, Pencil, Plus,
} from 'lucide-react';
import TagInput from '@/components/customers/TagInput';
import { ColoredTag, normalizeTags, TagBadge } from '@/components/customers/TagBadge';

const STATUS_COLORS: Record<string, string> = {
  Lead: 'bg-gray-100 text-gray-600',
  Scheduled: 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-amber-100 text-amber-700',
  Completed: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
};

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  tin_number: string | null;
  tags: ColoredTag[];
  created_at: string;
}

interface JobRow {
  id: string;
  job_number: string;
  title: string;
  status: string;
  scheduled_date: string | null;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
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

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Tag editor state
  const [editingTags, setEditingTags] = useState(false);
  const [draftTags, setDraftTags] = useState<ColoredTag[]>([]);
  const [savingTags, setSavingTags] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    async function fetch() {
      const [custRes, jobsRes] = await Promise.all([
        supabase.from('customers').select('*').eq('id', id).single(),
        supabase.from('jobs')
          .select('id, job_number, title, status, scheduled_date')
          .eq('customer_id', id)
          .order('created_at', { ascending: false }),
      ]);
      if (custRes.data) {
        const c = custRes.data as any;
        setCustomer({ ...c, tags: normalizeTags(c.tags_v2, c.tags) });
      }
      setJobs((jobsRes.data as JobRow[]) || []);
      setLoading(false);
    }
    fetch();
  }, [user, id]);

  const handleDelete = async () => {
    if (!customer) return;
    setDeleting(true);
    const { error } = await supabase.from('customers').delete().eq('id', customer.id);
    setDeleting(false);
    if (error) {
      toast({ title: 'Ralat', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Pelanggan berjaya dipadam!' });
      navigate('/customers');
    }
  };

  const startEditTags = () => {
    setDraftTags([...(customer?.tags || [])]);
    setEditingTags(true);
  };

  const saveTags = async () => {
    if (!customer) return;
    setSavingTags(true);
    const { error } = await supabase
      .from('customers')
      .update({
        tags_v2: draftTags,
        tags: draftTags.map(t => t.label),
      } as any)
      .eq('id', customer.id);
    setSavingTags(false);
    if (error) {
      toast({ title: 'Ralat', description: error.message, variant: 'destructive' });
    } else {
      setCustomer({ ...customer, tags: draftTags });
      setEditingTags(false);
      toast({ title: 'Tag dikemaskini!' });
    }
  };

  const whatsappUrl = customer?.phone
    ? `https://wa.me/${formatPhone(customer.phone)}`
    : null;

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-4 md:p-6 text-center">
        <p className="text-muted-foreground">Pelanggan tidak dijumpai.</p>
        <Button variant="outline" onClick={() => navigate('/customers')} className="mt-4">Kembali</Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 pb-28 md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/customers')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground flex-1">Profil Pelanggan</h1>
        <Button variant="outline" size="sm" onClick={() => navigate(`/customers/${customer.id}/edit`)} className="gap-1.5 shrink-0">
          <Edit className="h-3.5 w-3.5" /> Edit
        </Button>
      </div>

      {/* Customer Info Card */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-medium shrink-0">
            {getInitials(customer.name)}
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-foreground truncate">{customer.name}</p>
            <p className="text-xs text-muted-foreground">Pelanggan sejak {formatDate(customer.created_at)}</p>
          </div>
        </div>

        {customer.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-foreground">{customer.phone}</span>
            {whatsappUrl && (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full hover:bg-green-100">
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
            )}
          </div>
        )}

        {customer.email && (
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-foreground">{customer.email}</span>
          </div>
        )}

        {customer.address && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-foreground">{customer.address}</span>
          </div>
        )}

        {customer.tin_number && (
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground mr-1">No. TIN:</span>
            <span className="text-sm text-foreground">{customer.tin_number}</span>
          </div>
        )}
      </div>

      {/* Tags Section */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tag</p>
          {!editingTags && (
            <button onClick={startEditTags} className="text-muted-foreground hover:text-foreground">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {editingTags ? (
          <div className="space-y-3">
            <TagInput tags={draftTags} onChange={setDraftTags} />
            <div className="flex gap-2">
              <Button size="sm" onClick={saveTags} disabled={savingTags} className="rounded-lg">
                {savingTags ? 'Menyimpan...' : 'Simpan'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditingTags(false)} className="rounded-lg">Batal</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {(customer.tags || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Tiada tag</p>
            ) : (
              customer.tags!.map(tag => (
                <TagBadge key={tag.label} tag={tag} />
              ))
            )}
          </div>
        )}
      </div>

      {/* Job History */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sejarah Kerja</p>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-sidebar-background text-muted-foreground">{jobs.length}</span>
        </div>

        {jobs.length === 0 ? (
          <div className="text-center py-4">
            <Briefcase className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">Tiada kerja untuk pelanggan ini</p>
            <Button size="sm" onClick={() => navigate(`/jobs/new?customer_id=${customer.id}`)} className="rounded-lg gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Buat Kerja Baru
            </Button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {jobs.map(job => (
              <button
                key={job.id}
                onClick={() => navigate(`/jobs/${job.id}`)}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-sidebar-background transition-colors text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-primary">{job.job_number}</p>
                  <p className="text-sm text-foreground truncate">{job.title}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[job.status] || STATUS_COLORS.Lead}`}>
                    {job.status}
                  </span>
                  {job.scheduled_date && (
                    <span className="text-[11px] text-muted-foreground hidden sm:block">{formatDate(job.scheduled_date)}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button onClick={() => navigate(`/customers/${customer.id}/edit`)} className="flex-1 rounded-lg gap-2">
          <Edit className="h-4 w-4" /> Edit Pelanggan
        </Button>
        <Button variant="outline" onClick={() => setDeleteOpen(true)} className="rounded-lg gap-2 text-destructive border-destructive/30 hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" /> Padam
        </Button>
      </div>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Padam Pelanggan?</DialogTitle>
            <DialogDescription>
              Data pelanggan akan dipadam. Kerja berkaitan tidak akan dipadam.
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
