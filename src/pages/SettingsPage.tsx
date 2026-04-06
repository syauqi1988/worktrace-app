import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import PlanCards from '@/components/PlanCards';
import { Building2, Shield, CreditCard, AlertTriangle, ExternalLink } from 'lucide-react';

export default function SettingsPage() {
  const { user, profile, updateProfile, signOut } = useAuth();

  // Company profile
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // LHDN
  const [lhdnEnabled, setLhdnEnabled] = useState(false);
  const [tinNumber, setTinNumber] = useState('');
  const [msicCode, setMsicCode] = useState('');
  const [sstRegistered, setSstRegistered] = useState(false);
  const [sstNumber, setSstNumber] = useState('');
  const [savingLhdn, setSavingLhdn] = useState(false);

  // Delete account
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (profile) {
      setCompanyName(profile.company_name || '');
      setPhone(profile.phone || '');
      setAddress(profile.address || '');
      setLogoUrl(profile.logo_url);
      setLhdnEnabled(profile.lhdn_enabled);
      setTinNumber(profile.tin_number || '');
      setMsicCode(profile.msic_code || '');
      setSstRegistered(profile.sst_registered);
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    await updateProfile({
      company_name: companyName || null,
      phone: phone || null,
      address: address || null,
      logo_url: logoUrl,
    });
    setSavingProfile(false);
    toast.success('Profil berjaya dikemaskini!');
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/logo.${ext}`;
    const { error } = await supabase.storage.from('quotation-pdfs').upload(path, file, { upsert: true });
    if (error) {
      toast.error('Gagal muat naik logo');
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from('quotation-pdfs').getPublicUrl(path);
    setLogoUrl(publicUrl);
    setUploading(false);
    toast.success('Logo dimuat naik!');
  };

  const handleSaveLhdn = async () => {
    setSavingLhdn(true);
    await updateProfile({
      lhdn_enabled: lhdnEnabled,
      tin_number: tinNumber || null,
      msic_code: msicCode || null,
      sst_registered: sstRegistered,
    });
    setSavingLhdn(false);
    toast.success('Tetapan LHDN disimpan!');
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    await signOut();
    toast.success('Akaun berjaya dipadam');
    setDeleting(false);
  };

  const planLabel = profile?.plan === 'pro' ? 'Pro' : profile?.plan === 'agency' ? 'Agency' : 'Basic';

  return (
    <div className="p-4 md:p-6 space-y-8 max-w-3xl">
      <h1 className="text-xl font-bold text-foreground">Tetapan</h1>

      {/* Section 1 — Company Profile */}
      <section className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold text-foreground">Profil Syarikat</h2>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Logo Syarikat</label>
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-[120px] w-[120px] object-contain rounded-xl border border-border" />
            ) : (
              <div className="h-[120px] w-[120px] rounded-xl border-2 border-dashed border-border flex items-center justify-center text-muted-foreground text-sm">Logo</div>
            )}
            <div className="space-y-2">
              <label className="cursor-pointer">
                <span className="text-sm text-primary hover:underline font-medium">{uploading ? 'Memuat naik...' : 'Tukar Logo'}</span>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploading} />
              </label>
              {logoUrl && (
                <button onClick={() => setLogoUrl(null)} className="text-sm text-destructive hover:underline block">Padam Logo</button>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Nama Syarikat *</label>
          <Input value={companyName} onChange={e => setCompanyName(e.target.value)} className="h-11 rounded-lg" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Nombor Telefon</label>
          <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0123456789" className="h-11 rounded-lg" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Alamat</label>
          <textarea
            value={address}
            onChange={e => setAddress(e.target.value)}
            className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Button onClick={handleSaveProfile} disabled={savingProfile} className="rounded-lg">
          {savingProfile ? 'Menyimpan...' : 'Simpan Profil'}
        </Button>
      </section>

      {/* Section 2 — LHDN */}
      <section className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold text-foreground">e-Invois LHDN MyInvois</h2>
        </div>
        <p className="text-sm text-muted-foreground">Tetapan untuk pematuhan e-invois LHDN Malaysia</p>

        <div className="flex items-center justify-between py-2">
          <span className="text-sm font-medium text-foreground">Aktifkan e-Invois LHDN</span>
          <Switch checked={lhdnEnabled} onCheckedChange={setLhdnEnabled} />
        </div>

        {!lhdnEnabled && (
          <p className="text-sm text-muted-foreground">Aktifkan untuk memaparkan medan LHDN pada invois anda</p>
        )}

        {lhdnEnabled && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">No. TIN Syarikat</label>
              <Input value={tinNumber} onChange={e => setTinNumber(e.target.value)} placeholder="e.g. C12345678900" className="h-11 rounded-lg" />
              <p className="text-xs text-muted-foreground mt-1">Nombor Pengenalan Cukai LHDN</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Kod MSIC</label>
              <Input value={msicCode} onChange={e => setMsicCode(e.target.value)} placeholder="e.g. 43211" className="h-11 rounded-lg" />
              <p className="text-xs text-muted-foreground mt-1">
                Malaysia Standard Industrial Classification Code
                <a href="https://www.hasil.gov.my" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-2 inline-flex items-center gap-1">
                  Semak kod MSIC anda <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-foreground">SST Berdaftar</span>
              <Switch checked={sstRegistered} onCheckedChange={setSstRegistered} />
            </div>
            {sstRegistered && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">No. SST</label>
                <Input value={sstNumber} onChange={e => setSstNumber(e.target.value)} placeholder="e.g. W10-1234-12345678" className="h-11 rounded-lg" />
              </div>
            )}
          </div>
        )}

        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
          Integrasi automatik dengan portal MyInvois LHDN akan datang tidak lama lagi. Buat masa ini, sila hantar invois secara manual di portal MyInvois dan tandakan status penghantaran dalam setiap invois.
        </div>

        <Button onClick={handleSaveLhdn} disabled={savingLhdn} className="rounded-lg">
          {savingLhdn ? 'Menyimpan...' : 'Simpan Tetapan LHDN'}
        </Button>
      </section>

      {/* Section 3 — Subscription */}
      <section className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold text-foreground">Langganan & Pelan</h2>
        </div>

        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Pelan Semasa</p>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground">{planLabel}</span>
            <span className="text-base font-bold text-foreground">{planLabel}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            RM{profile?.plan === 'pro' ? '49' : profile?.plan === 'agency' ? '149' : '19'}/bulan · {profile?.billing_period === 'yearly' ? 'Tahunan' : 'Bulanan'}
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-xs text-green-600">● Aktif</span>
          </div>
        </div>

        <PlanCards currentPlan={profile?.plan || 'basic'} onSelect={() => {}} />

        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
          Pembayaran diproses secara manual buat masa ini. Tim kami akan menghubungi anda dalam masa 24 jam selepas permintaan naik taraf.
        </div>
      </section>

      {/* Section 4 — Account Security */}
      <section className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold text-foreground">Keselamatan Akaun</h2>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">E-mel Akaun</label>
          <p className="text-sm text-foreground">{user?.email}</p>
          <p className="text-xs text-muted-foreground mt-1">Log masuk menggunakan OTP ke e-mel ini</p>
        </div>

        <div className="rounded-lg border-2 border-destructive/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h3 className="text-sm font-bold text-destructive">Zon Bahaya</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Semua data anda termasuk kerja, pelanggan, quotation dan invois akan dipadam secara kekal.
          </p>
          <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/5 rounded-lg" onClick={() => setDeleteOpen(true)}>
            Padam Akaun
          </Button>
        </div>
      </section>

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteConfirmText(''); }}
        onConfirm={handleDeleteAccount}
        title="Padam Akaun?"
        body='Semua data anda termasuk kerja, pelanggan, quotation dan invois akan dipadam secara kekal. Tindakan ini tidak boleh dibatalkan.'
        confirmLabel="Padam Akaun Saya"
        confirmVariant="danger"
        isLoading={deleting}
      >
        <div className="px-6 pb-2">
          <label className="text-sm font-medium text-foreground mb-1.5 block">Taip "PADAM" untuk mengesahkan</label>
          <Input
            value={deleteConfirmText}
            onChange={e => setDeleteConfirmText(e.target.value)}
            placeholder="PADAM"
            className="h-11 rounded-lg"
          />
          {deleteConfirmText !== '' && deleteConfirmText !== 'PADAM' && (
            <p className="text-xs text-destructive mt-1">Sila taip "PADAM" untuk meneruskan</p>
          )}
        </div>
      </ConfirmDialog>
    </div>
  );
}
