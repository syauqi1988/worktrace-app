import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ArrowLeft, Plus, X, Loader2, Eye } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import CompletionReportPDF from '@/components/pdf/CompletionReportPDF';
import PDFPreviewModal from '@/components/pdf/PDFPreviewModal';
import { imageUrlToBase64 } from '@/utils/imageToBase64';
import { autoUpdateJobStatus } from '@/utils/autoUpdateJobStatus';

interface Job {
  id: string;
  job_number: string;
  title: string;
  category: string;
  customer_id: string | null;
  customers: { name: string; phone: string | null; address: string | null } | null;
}

export default function CompletionReportPage() {
  const { id: jobId } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const [reportId, setReportId] = useState<string | null>(null);
  const [reportNumber, setReportNumber] = useState('');
  const [completionDate, setCompletionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [technicianName, setTechnicianName] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [materialsUsed, setMaterialsUsed] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [customerSignature, setCustomerSignature] = useState('');
  const [notes, setNotes] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  // PDF Preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [logoBase64, setLogoBase64] = useState('');

  useEffect(() => {
    if (profile?.logo_url) {
      imageUrlToBase64(profile.logo_url).then(setLogoBase64);
    }
  }, [profile?.logo_url]);

  useEffect(() => {
    if (!user || !jobId) return;
    async function fetch() {
      const [jobRes, reportRes] = await Promise.all([
        supabase.from('jobs')
          .select('id, job_number, title, category, customer_id, customers(name, phone, address)')
          .eq('id', jobId).single(),
        supabase.from('completion_reports')
          .select('*')
          .eq('job_id', jobId)
          .eq('user_id', user!.id)
          .maybeSingle(),
      ]);

      setJob(jobRes.data as unknown as Job);

      if (reportRes.data) {
        const r = reportRes.data as any;
        setReportId(r.id);
        setReportNumber(r.report_number);
        setCompletionDate(r.completion_date || new Date().toISOString().slice(0, 10));
        setTechnicianName(r.technician_name || '');
        setWorkDescription(r.work_description || '');
        setMaterialsUsed(r.materials_used || '');
        setPhotos(Array.isArray(r.photos) ? r.photos : []);
        setCustomerSignature(r.customer_signature || '');
        setNotes(r.notes || '');
        setIsSubmitted(r.status === 'submitted');
      } else {
        // Generate report number
        const { data: profileData } = await supabase
          .from('profiles')
          .select('report_count')
          .eq('id', user!.id)
          .single();
        const count = (profileData as any)?.report_count ?? 0;
        setReportNumber(`RPT-${String(count + 1).padStart(4, '0')}`);
        // Pre-fill technician
        if (profile?.company_name) setTechnicianName(profile.company_name);
      }
      setLoading(false);
    }
    fetch();
  }, [user, jobId, profile]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user || !jobId) return;

    for (let i = 0; i < files.length; i++) {
      if (photos.length + i >= 10) break;
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} melebihi 5MB`);
        continue;
      }

      setUploadingPhoto(true);
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${jobId}/${Date.now()}_${i}.${ext}`;
      const { error } = await supabase.storage
        .from('completion-photos')
        .upload(path, file, { upsert: true });

      if (error) {
        toast.error('Gagal muat naik gambar');
        continue;
      }

      // Store the storage path; resolve to a signed URL when displaying/embedding.
      const { data: signed } = await supabase.storage.from('completion-photos').createSignedUrl(path, 60 * 60 * 24 * 365);
      setPhotos(prev => [...prev, signed?.signedUrl ?? '']);
    }
    setUploadingPhoto(false);
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (status: 'draft' | 'submitted') => {
    if (status === 'submitted') {
      const newErrors: Record<string, string> = {};
      if (!completionDate) newErrors.completionDate = 'Sila pilih tarikh';
      if (!technicianName.trim()) newErrors.technicianName = 'Sila isi nama juruteknik';
      if (!workDescription.trim()) newErrors.workDescription = 'Sila isi penerangan kerja';
      if (photos.length === 0) newErrors.photos = 'Sila muat naik sekurang-kurangnya 1 gambar';
      if (Object.keys(newErrors).length) { setErrors(newErrors); return; }
    }

    const isSaving = status === 'draft';
    if (isSaving) setSaving(true);
    else setSubmitting(true);

    try {
      const payload: any = {
        user_id: user!.id,
        job_id: jobId,
        report_number: reportNumber,
        completion_date: completionDate || null,
        technician_name: technicianName.trim() || null,
        work_description: workDescription.trim() || null,
        materials_used: materialsUsed.trim() || null,
        customer_signature: customerSignature.trim() || null,
        photos,
        notes: notes.trim() || null,
        status,
      };

      if (status === 'submitted') {
        payload.submitted_at = new Date().toISOString();
      }

      if (reportId) {
        const { error } = await supabase.from('completion_reports').update(payload).eq('id', reportId);
        if (error) throw error;
      } else {
        // Increment report_count
        const { data: profileData } = await supabase
          .from('profiles')
          .select('report_count')
          .eq('id', user!.id)
          .single();
        const count = (profileData as any)?.report_count ?? 0;
        await supabase.from('profiles').update({ report_count: count + 1 } as any).eq('id', user!.id);

        const { error } = await supabase.from('completion_reports').insert(payload);
        if (error) throw error;
      }

      if (status === 'submitted') {
        // Auto-update job status to Completed
        await autoUpdateJobStatus(supabase as any, jobId!, user!.id, 'report_submitted', {
          completed_date: completionDate,
        });
        toast.success('Laporan berjaya dihantar! Invois kini boleh dijana.');
        navigate(`/jobs/${jobId}`);
      } else {
        toast.success('Draf laporan disimpan!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Ralat menyimpan');
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  };

  const handlePreview = async () => {
    if (!job) return;
    setPreviewOpen(true);
    setPreviewLoading(true);
    try {
      // Convert photo URLs to base64 for PDF
      const photoBase64s = await Promise.all(
        photos.map(url => imageUrlToBase64(url))
      );

      const blob = await pdf(
        <CompletionReportPDF
          report={{
            report_number: reportNumber,
            completion_date: completionDate,
            technician_name: technicianName,
            work_description: workDescription,
            materials_used: materialsUsed,
            customer_signature: customerSignature,
            notes,
            photos: photoBase64s.filter(Boolean),
          }}
          job={job ? { job_number: job.job_number, title: job.title, category: job.category } : null}
          customer={job?.customers ? { name: job.customers.name, phone: job.customers.phone, address: job.customers.address } : null}
          company={{
            company_name: profile?.company_name || null,
            phone: profile?.phone || null,
            address: profile?.address || null,
            logo_base64: logoBase64,
          }}
        />
      ).toBlob();
      setPreviewUrl(URL.createObjectURL(blob));
    } catch {
      toast.error('Gagal menjana pratonton');
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full rounded-xl" />
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
    <div className="p-4 md:p-6 space-y-5 max-w-2xl pb-28 md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/jobs/${jobId}`)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Laporan Siap Kerja</h1>
          <p className="text-sm text-muted-foreground">{reportNumber}</p>
        </div>
      </div>

      {isSubmitted && (
        <div className="bg-[#DCFCE7] border border-[#BBF7D0] rounded-xl p-4 text-sm text-[#15803D] font-medium">
          ✓ Laporan ini telah dihantar
        </div>
      )}

      {/* Job Info (read-only) */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Maklumat Kerja</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><p className="text-xs text-muted-foreground">Nombor Kerja</p><p className="font-medium text-foreground">{job.job_number}</p></div>
          <div><p className="text-xs text-muted-foreground">Tajuk</p><p className="text-foreground">{job.title}</p></div>
          <div><p className="text-xs text-muted-foreground">Pelanggan</p><p className="text-foreground">{job.customers?.name || '-'}</p></div>
          <div><p className="text-xs text-muted-foreground">Kategori</p><p className="text-foreground">{job.category}</p></div>
        </div>
      </div>

      {/* Completion Date */}
      <div className="space-y-1.5">
        <Label>Tarikh Siap Kerja *</Label>
        <Input type="date" value={completionDate} onChange={e => { setCompletionDate(e.target.value); setErrors(p => ({ ...p, completionDate: '' })); }} disabled={isSubmitted} />
        {errors.completionDate && <p className="text-xs text-destructive">{errors.completionDate}</p>}
      </div>

      {/* Technician Name */}
      <div className="space-y-1.5">
        <Label>Nama Juruteknik *</Label>
        <Input value={technicianName} onChange={e => { setTechnicianName(e.target.value); setErrors(p => ({ ...p, technicianName: '' })); }} placeholder="Nama pekerja/juruteknik" disabled={isSubmitted} />
        {errors.technicianName && <p className="text-xs text-destructive">{errors.technicianName}</p>}
      </div>

      {/* Work Description */}
      <div className="space-y-1.5">
        <Label>Penerangan Kerja yang Dilaksanakan *</Label>
        <Textarea value={workDescription} onChange={e => { setWorkDescription(e.target.value); setErrors(p => ({ ...p, workDescription: '' })); }} rows={5} placeholder="Huraikan kerja yang telah dilaksanakan secara terperinci..." disabled={isSubmitted} />
        {errors.workDescription && <p className="text-xs text-destructive">{errors.workDescription}</p>}
      </div>

      {/* Materials */}
      <div className="space-y-1.5">
        <Label>Bahan/Alatan Digunakan</Label>
        <Textarea value={materialsUsed} onChange={e => setMaterialsUsed(e.target.value)} rows={3} placeholder="Senaraikan bahan atau alatan yang digunakan..." disabled={isSubmitted} />
      </div>

      {/* Photos */}
      <div className="space-y-2">
        <Label>Gambar Kerja Siap (min 1) *</Label>
        {errors.photos && <p className="text-xs text-destructive">{errors.photos}</p>}
        <div className="grid grid-cols-3 gap-3">
          {photos.map((url, i) => (
            <div key={i} className="relative">
              <img src={url} alt={`Gambar ${i + 1}`} className="w-full h-[100px] object-cover rounded-lg border border-border" />
              {!isSubmitted && (
                <button onClick={() => removePhoto(i)} className="absolute -top-2 -right-2 h-6 w-6 bg-destructive text-white rounded-full flex items-center justify-center text-xs">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          {photos.length < 10 && !isSubmitted && (
            <label className="h-[100px] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:bg-accent/50 transition-colors">
              {uploadingPhoto ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <Plus className="h-5 w-5 text-muted-foreground" />}
              <span className="text-[11px] text-muted-foreground mt-1">{uploadingPhoto ? 'Memuat naik...' : 'Tambah'}</span>
              <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto || isSubmitted} />
            </label>
          )}
        </div>
      </div>

      {/* Customer Signature */}
      <div className="space-y-1.5">
        <Label>Pengesahan Pelanggan (opsional)</Label>
        <Input value={customerSignature} onChange={e => setCustomerSignature(e.target.value)} placeholder="Nama pelanggan sebagai pengesahan" disabled={isSubmitted} />
        <p className="text-[11px] text-muted-foreground">Minta pelanggan taip nama sebagai tanda pengesahan kerja siap</p>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label>Nota Tambahan</Label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} disabled={isSubmitted} />
      </div>

      {/* Actions */}
      {!isSubmitted && (
        <div className="flex flex-col gap-2">
          <Button onClick={() => handleSave('submitted')} disabled={submitting} className="rounded-lg">
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Menghantar...</> : 'Hantar Laporan'}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleSave('draft')} disabled={saving} className="flex-1 rounded-lg">
              {saving ? 'Menyimpan...' : 'Simpan Draf'}
            </Button>
            <Button variant="outline" onClick={handlePreview} className="flex-1 rounded-lg gap-2">
              <Eye className="h-4 w-4" /> Pratonton PDF
            </Button>
          </div>
        </div>
      )}

      {isSubmitted && (
        <Button variant="outline" onClick={handlePreview} className="w-full rounded-lg gap-2">
          <Eye className="h-4 w-4" /> Pratonton PDF
        </Button>
      )}

      <PDFPreviewModal
        open={previewOpen}
        title={`Pratonton — ${reportNumber}`}
        loading={previewLoading}
        fileUrl={previewUrl}
        onClose={() => { setPreviewOpen(false); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}
        onDownload={async () => {
          if (!previewUrl) return;
          const a = document.createElement('a');
          a.href = previewUrl;
          a.download = `Laporan-${reportNumber}.pdf`;
          a.click();
        }}
      />
    </div>
  );
}
