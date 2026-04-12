import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import PlanCards from '@/components/PlanCards';
import { Building2, Shield, CreditCard, AlertTriangle, ExternalLink, FileText, Landmark, Gift, Users, Copy, MessageCircle, Send, Trash2, Plus, X, Loader2 } from 'lucide-react';

interface PaymentMethod {
  id: string;
  type: 'bank_transfer' | 'qr_payment';
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  provider?: string;
  qr_image_url?: string;
  is_primary?: boolean;
}

const BANK_OPTIONS = [
  'Maybank', 'CIMB Bank', 'Public Bank', 'RHB Bank', 'Hong Leong Bank',
  'AmBank', 'Bank Islam', 'Bank Rakyat', 'BSN', 'OCBC', 'Standard Chartered', 'HSBC', 'Other'
];
const QR_PROVIDERS = ['DuitNow QR', 'TnG eWallet', 'ShopeePay', 'GrabPay', 'Boost', 'Other'];

export default function SettingsPage() {
  const { user, profile, updateProfile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();

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

  // T&C
  const [quotationTerms, setQuotationTerms] = useState('');
  const [invoiceTerms, setInvoiceTerms] = useState('');
  const [savingTerms, setSavingTerms] = useState(false);

  // Payment methods
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [showBankForm, setShowBankForm] = useState(false);
  const [showQrForm, setShowQrForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentMethod | null>(null);
  const [bankName, setBankName] = useState('Maybank');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [qrProvider, setQrProvider] = useState('DuitNow QR');
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [uploadingQr, setUploadingQr] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  // Delete account
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Referral
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState(false);

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
      setQuotationTerms(profile.quotation_terms || '');
      setInvoiceTerms(profile.invoice_terms || '');
      setPaymentMethods(Array.isArray(profile.payment_methods) ? profile.payment_methods : []);
    }
  }, [profile]);

  // Fetch referrals
  useEffect(() => {
    if (!user) return;
    setLoadingReferrals(true);
    supabase.from('referrals').select('*').eq('referrer_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => { setReferrals(data || []); setLoadingReferrals(false); });
  }, [user]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    await updateProfile({ company_name: companyName || null, phone: phone || null, address: address || null, logo_url: logoUrl });
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
    if (error) { toast.error('Gagal muat naik logo'); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('quotation-pdfs').getPublicUrl(path);
    setLogoUrl(publicUrl);
    setUploading(false);
    toast.success('Logo dimuat naik!');
  };

  const handleSaveLhdn = async () => {
    setSavingLhdn(true);
    await updateProfile({ lhdn_enabled: lhdnEnabled, tin_number: tinNumber || null, msic_code: msicCode || null, sst_registered: sstRegistered });
    setSavingLhdn(false);
    toast.success('Tetapan LHDN disimpan!');
  };

  const handleSaveTerms = async () => {
    setSavingTerms(true);
    await updateProfile({ quotation_terms: quotationTerms || null, invoice_terms: invoiceTerms || null });
    setSavingTerms(false);
    toast.success('Terma & syarat berjaya disimpan!');
  };

  // Payment methods
  const savePaymentMethods = async (methods: PaymentMethod[]) => {
    setSavingPayment(true);
    await updateProfile({ payment_methods: methods as any });
    setPaymentMethods(methods);
    setSavingPayment(false);
  };

  const resetBankForm = () => { setBankName('Maybank'); setAccountName(''); setAccountNumber(''); setIsPrimary(false); setEditingPayment(null); setShowBankForm(false); };
  const resetQrForm = () => { setQrProvider('DuitNow QR'); setQrImageUrl(''); setEditingPayment(null); setShowQrForm(false); };

  const handleSaveBank = async () => {
    if (!accountName.trim() || !accountNumber.trim()) { toast.error('Sila isi semua medan'); return; }
    let methods = [...paymentMethods];
    if (isPrimary) methods = methods.map(m => ({ ...m, is_primary: false }));
    if (editingPayment) {
      methods = methods.map(m => m.id === editingPayment.id ? { ...m, bank_name: bankName, account_name: accountName, account_number: accountNumber, is_primary: isPrimary } : m);
    } else {
      methods.push({ id: crypto.randomUUID(), type: 'bank_transfer', bank_name: bankName, account_name: accountName, account_number: accountNumber, is_primary: isPrimary });
    }
    await savePaymentMethods(methods);
    resetBankForm();
    toast.success('Akaun bank disimpan!');
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Saiz fail melebihi 2MB'); return; }
    setUploadingQr(true);
    const path = `${user.id}/${Date.now()}.png`;
    const { error } = await supabase.storage.from('payment-qr').upload(path, file, { upsert: true });
    if (error) { toast.error('Gagal muat naik QR'); setUploadingQr(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('payment-qr').getPublicUrl(path);
    setQrImageUrl(publicUrl);
    setUploadingQr(false);
  };

  const handleSaveQr = async () => {
    if (!qrImageUrl) { toast.error('Sila muat naik imej QR'); return; }
    let methods = [...paymentMethods];
    if (editingPayment) {
      methods = methods.map(m => m.id === editingPayment.id ? { ...m, provider: qrProvider, qr_image_url: qrImageUrl } : m);
    } else {
      methods.push({ id: crypto.randomUUID(), type: 'qr_payment', provider: qrProvider, qr_image_url: qrImageUrl });
    }
    await savePaymentMethods(methods);
    resetQrForm();
    toast.success('QR payment disimpan!');
  };

  const handleDeletePayment = async (id: string) => {
    const methods = paymentMethods.filter(m => m.id !== id);
    await savePaymentMethods(methods);
    toast.success('Kaedah pembayaran dipadam');
  };

  const handleEditBank = (m: PaymentMethod) => {
    setBankName(m.bank_name || 'Maybank');
    setAccountName(m.account_name || '');
    setAccountNumber(m.account_number || '');
    setIsPrimary(m.is_primary || false);
    setEditingPayment(m);
    setShowBankForm(true);
  };

  const handleEditQr = (m: PaymentMethod) => {
    setQrProvider(m.provider || 'DuitNow QR');
    setQrImageUrl(m.qr_image_url || '');
    setEditingPayment(m);
    setShowQrForm(true);
  };

  // Delete account
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'PADAM') return;
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Sesi tamat. Sila log masuk semula.'); setDeleting(false); return; }
      const { error } = await supabase.functions.invoke('delete-user', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (error) throw error;
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      navigate('/login');
      toast.success('Akaun anda telah dipadam.');
    } catch {
      toast.error('Gagal memadam akaun. Sila cuba lagi atau hubungi sokongan.');
    } finally {
      setDeleting(false);
    }
  };

  // Referral
  const referralCode = profile?.referral_code || '';
  const referralUrl = `https://app.worktrace.my/login?ref=${referralCode}`;
  const freeMonthsBalance = (profile?.free_months_earned || 0) - (profile?.free_months_used || 0);

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralUrl);
    toast.success('Link rujukan disalin! Kongsi dengan rakan kontraktor anda.');
  };

  const shareWhatsApp = () => {
    const msg = `Jom cuba WorkTrace — app pengurusan kerja untuk kontraktor Malaysia! 🔧\n\n✅ Jejak kerja & pelanggan\n✅ Sebut harga & invois profesional\n✅ WhatsApp follow-up automatik\n✅ LHDN e-Invois ready\n\nDaftar guna link saya:\n👉 ${referralUrl}\n\n*WorkTrace — Jejak Kerja. Senang Collect.*`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const shareTelegram = () => {
    const msg = `Jom cuba WorkTrace — app pengurusan kerja untuk kontraktor Malaysia! Daftar guna link saya: ${referralUrl}`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  const planLabel = profile?.plan === 'pro' ? 'Pro' : profile?.plan === 'team' ? 'Team' : 'Free';
  const isFree = !profile || profile.plan === 'free';
  const banks = paymentMethods.filter(m => m.type === 'bank_transfer');
  const qrs = paymentMethods.filter(m => m.type === 'qr_payment');

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
              {logoUrl && <button onClick={() => setLogoUrl(null)} className="text-sm text-destructive hover:underline block">Padam Logo</button>}
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
          <textarea value={address} onChange={e => setAddress(e.target.value)} className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
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
        {!lhdnEnabled && <p className="text-sm text-muted-foreground">Aktifkan untuk memaparkan medan LHDN pada invois anda</p>}
        {lhdnEnabled && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">No. TIN Syarikat</label>
              <Input value={tinNumber} onChange={e => setTinNumber(e.target.value)} placeholder="e.g. C12345678900" className="h-11 rounded-lg" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Kod MSIC</label>
              <Input value={msicCode} onChange={e => setMsicCode(e.target.value)} placeholder="e.g. 43211" className="h-11 rounded-lg" />
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
          Integrasi automatik dengan portal MyInvois LHDN akan datang tidak lama lagi.
        </div>
        <Button onClick={handleSaveLhdn} disabled={savingLhdn} className="rounded-lg">
          {savingLhdn ? 'Menyimpan...' : 'Simpan Tetapan LHDN'}
        </Button>
      </section>

      {/* Section 3 — Terms & Conditions */}
      <section className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold text-foreground">Terma & Syarat Dokumen</h2>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Terma & Syarat Sebut Harga</label>
          <Textarea value={quotationTerms} onChange={e => setQuotationTerms(e.target.value)} rows={8} />
          <p className="text-xs text-muted-foreground mt-1">Terma ini dipaparkan dalam setiap sebut harga PDF</p>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Terma & Syarat Invois</label>
          <Textarea value={invoiceTerms} onChange={e => setInvoiceTerms(e.target.value)} rows={8} />
          <p className="text-xs text-muted-foreground mt-1">Terma ini dipaparkan dalam setiap invois PDF</p>
        </div>
        <Button onClick={handleSaveTerms} disabled={savingTerms} className="rounded-lg">
          {savingTerms ? 'Menyimpan...' : 'Simpan Terma & Syarat'}
        </Button>
      </section>

      {/* Section 4 — Payment Methods */}
      <section className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Landmark className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold text-foreground">Kaedah Pembayaran</h2>
        </div>
        <p className="text-sm text-muted-foreground">Maklumat ini akan dipaparkan dalam setiap invois anda</p>

        {/* Bank accounts */}
        {banks.map(b => (
          <div key={b.id} className="border border-border rounded-lg p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">🏦 Bank Transfer</span>
              {b.is_primary && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Utama ✓</span>}
            </div>
            <p className="text-sm text-foreground">{b.bank_name}</p>
            <p className="text-sm text-muted-foreground">{b.account_name}</p>
            <p className="text-sm text-muted-foreground font-mono">{b.account_number}</p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => handleEditBank(b)} className="text-xs text-primary hover:underline">Edit</button>
              <button onClick={() => handleDeletePayment(b.id)} className="text-xs text-destructive hover:underline">Padam</button>
            </div>
          </div>
        ))}

        {/* QR payments */}
        {qrs.map(q => (
          <div key={q.id} className="border border-border rounded-lg p-4 space-y-2">
            <span className="text-sm font-medium">📱 {q.provider || 'QR Payment'}</span>
            {q.qr_image_url && <img src={q.qr_image_url} alt="QR" className="h-[60px] w-[60px] object-contain rounded border border-border" />}
            <div className="flex gap-2">
              <button onClick={() => handleEditQr(q)} className="text-xs text-primary hover:underline">Edit</button>
              <button onClick={() => handleDeletePayment(q.id)} className="text-xs text-destructive hover:underline">Padam</button>
            </div>
          </div>
        ))}

        {/* Add bank form */}
        {showBankForm && (
          <div className="border border-primary/30 rounded-lg p-4 space-y-3 bg-primary/5">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Nama Bank</label>
              <select value={bankName} onChange={e => setBankName(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                {BANK_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Nama Akaun *</label>
              <Input value={accountName} onChange={e => setAccountName(e.target.value)} className="h-10 rounded-lg" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Nombor Akaun *</label>
              <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className="h-10 rounded-lg" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="primary-bank" checked={isPrimary} onCheckedChange={(v) => setIsPrimary(!!v)} />
              <label htmlFor="primary-bank" className="text-sm cursor-pointer">Tetapkan sebagai utama</label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveBank} disabled={savingPayment} size="sm" className="rounded-lg">Simpan Akaun</Button>
              <Button variant="outline" onClick={resetBankForm} size="sm" className="rounded-lg">Batal</Button>
            </div>
          </div>
        )}

        {/* Add QR form */}
        {showQrForm && (
          <div className="border border-primary/30 rounded-lg p-4 space-y-3 bg-primary/5">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Penyedia QR</label>
              <select value={qrProvider} onChange={e => setQrProvider(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                {QR_PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Muat Naik Imej QR</label>
              <input type="file" accept="image/png,image/jpeg" onChange={handleQrUpload} disabled={uploadingQr} />
              {uploadingQr && <p className="text-xs text-muted-foreground">Memuat naik...</p>}
              {qrImageUrl && <img src={qrImageUrl} alt="QR Preview" className="h-[80px] w-[80px] object-contain mt-2 rounded border border-border" />}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveQr} disabled={savingPayment} size="sm" className="rounded-lg">Simpan QR</Button>
              <Button variant="outline" onClick={resetQrForm} size="sm" className="rounded-lg">Batal</Button>
            </div>
          </div>
        )}

        {!showBankForm && !showQrForm && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowBankForm(true)} size="sm" className="rounded-lg gap-1.5"><Plus className="h-3.5 w-3.5" /> Tambah Akaun Bank</Button>
            <Button variant="outline" onClick={() => setShowQrForm(true)} size="sm" className="rounded-lg gap-1.5"><Plus className="h-3.5 w-3.5" /> Tambah QR Payment</Button>
          </div>
        )}
      </section>

      {/* Section 5 — Subscription */}
      <section className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold text-foreground">Langganan & Pelan</h2>
        </div>

        {freeMonthsBalance > 0 && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4 flex items-start gap-2">
            <Gift className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
            <p className="text-sm text-green-700">Anda ada <strong>{freeMonthsBalance} bulan percuma</strong> daripada program rujukan! Akan digunakan semasa pembaharuan langganan.</p>
          </div>
        )}

        <div className="rounded-lg border border-border p-4 space-y-2">
          <p className="text-sm text-muted-foreground mb-1">Pelan Semasa</p>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground">{planLabel}</span>
            <span className="text-base font-bold text-foreground">{planLabel}</span>
            {!isFree && <span className="text-xs text-green-600 font-medium">✓</span>}
          </div>
          <p className="text-sm text-muted-foreground">
            RM{profile?.plan === 'pro' ? '49' : profile?.plan === 'team' ? '99' : '0'}/bulan
            {isFree ? ' · Selamanya percuma' : ' · Early bird'}
          </p>
          {!isFree && profile?.subscription_status && (
            <div className="space-y-1 mt-2">
              <p className="text-sm text-foreground">
                Status: {profile.subscription_status === 'active' ? (
                  <span className="text-green-600">Aktif ●</span>
                ) : (
                  <span className="text-destructive">Tamat ●</span>
                )}
              </p>
              {profile.subscription_end_date && (
                <p className="text-sm text-muted-foreground">
                  Tarikh Tamat: {new Date(profile.subscription_end_date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
          )}
        </div>

        <PlanCards currentPlan={profile?.plan || 'free'} onSelect={() => {}} compact />
      </section>

      {/* Section 6 — Referral */}
      <section id="referral-section" className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Gift className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold text-foreground">Program Rujukan WorkTrace</h2>
        </div>

        {isFree ? (
          <div className="text-center py-8 space-y-3">
            <Gift className="h-10 w-10 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">Upgrade ke Pro untuk akses sistem referral</p>
            <p className="text-xs text-muted-foreground">Kongsi link anda dan dapatkan 1 bulan percuma setiap kali rakan anda melanggan!</p>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-blue-200 p-5 space-y-4" style={{ background: 'linear-gradient(135deg, #EFF6FF, #F0FDF4)' }}>
              <p className="text-sm text-foreground">Kongsi link anda dan dapatkan <strong>1 bulan percuma</strong> setiap kali rakan anda melanggan!</p>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Link Rujukan Anda:</p>
                <div className="flex items-center gap-2">
                  <Input value={referralUrl} readOnly className="text-xs bg-muted font-mono" />
                  <Button variant="outline" size="sm" onClick={copyReferralLink} className="shrink-0 rounded-lg gap-1">
                    <Copy className="h-3.5 w-3.5" /> Salin
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={shareWhatsApp} size="sm" className="rounded-lg gap-1.5 text-white" style={{ backgroundColor: '#25D366' }}>
                  <MessageCircle className="h-3.5 w-3.5" /> Kongsi via WhatsApp
                </Button>
                <Button onClick={shareTelegram} size="sm" variant="outline" className="rounded-lg gap-1.5">
                  <Send className="h-3.5 w-3.5" /> Telegram
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Jumlah Rujukan', value: profile?.referral_count || 0 },
                { label: 'Bulan Diperolehi', value: profile?.free_months_earned || 0 },
                { label: 'Bulan Digunakan', value: profile?.free_months_used || 0 },
                { label: 'Baki Tersedia', value: freeMonthsBalance },
              ].map(s => (
                <div key={s.label} className="border border-border rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Referral history */}
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Sejarah Rujukan</p>
              {referrals.length === 0 ? (
                <div className="text-center py-6">
                  <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Belum ada rujukan</p>
                  <p className="text-xs text-muted-foreground">Kongsi link untuk mula mendapat ganjaran!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {referrals.map(r => (
                    <div key={r.id} className="flex items-center justify-between border border-border rounded-lg p-3">
                      <div>
                        <p className="text-sm text-foreground">{new Date(r.created_at).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.status === 'rewarded' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {r.status === 'rewarded' ? '✓ Ganjaran Diterima' : 'Menunggu Langganan'}
                        </span>
                      </div>
                      <span className="text-sm text-foreground">{r.status === 'rewarded' ? '1 Bulan Percuma ✓' : '—'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* Section 7 — Account Security */}
      <section className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold text-foreground">Keselamatan Akaun</h2>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">E-mel Akaun</label>
          <p className="text-sm text-foreground">{user?.email}</p>
        </div>
        <div className="rounded-lg border-2 border-destructive/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h3 className="text-sm font-bold text-destructive">Zon Bahaya</h3>
          </div>
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 space-y-1">
            <p className="text-[13px] text-red-700 font-medium flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Tindakan Tidak Boleh Dibatalkan</p>
            <ul className="text-[13px] text-red-700 list-disc list-inside space-y-0.5">
              <li>Semua kerja dan rekod</li>
              <li>Semua pelanggan</li>
              <li>Semua sebut harga dan invois</li>
              <li>Semua fail dan dokumen</li>
              <li>Profil dan akaun syarikat</li>
              <li>Rekod rujukan</li>
            </ul>
          </div>
          <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/5 rounded-lg" onClick={() => setDeleteOpen(true)}>Padam Akaun</Button>
        </div>
      </section>

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteConfirmText(''); }}
        onConfirm={handleDeleteAccount}
        title="Padam Akaun Secara Kekal"
        body="Semua data anda akan dipadam secara kekal. Tindakan ini tidak boleh dibatalkan."
        confirmLabel="Padam Akaun Saya Secara Kekal"
        confirmVariant="danger"
        isLoading={deleting}
      >
        <div className="px-6 pb-2">
          <label className="text-sm font-medium text-foreground mb-1.5 block">Taip PADAM untuk mengesahkan:</label>
          <Input
            value={deleteConfirmText}
            onChange={e => setDeleteConfirmText(e.target.value)}
            placeholder="Taip PADAM di sini"
            className={`h-11 rounded-lg ${deleteConfirmText === 'PADAM' ? 'border-green-500 focus:ring-green-500' : deleteConfirmText ? 'border-destructive' : ''}`}
          />
          {deleteConfirmText !== '' && deleteConfirmText !== 'PADAM' && (
            <p className="text-xs text-destructive mt-1">Sila taip "PADAM" untuk meneruskan</p>
          )}
        </div>
      </ConfirmDialog>
    </div>
  );
}
