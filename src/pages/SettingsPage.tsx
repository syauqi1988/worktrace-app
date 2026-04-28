import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import PlanCards from "@/components/PlanCards";
import DocNumberSettings from "@/components/DocNumberSettings";
import AccountDeletionDialog from "@/components/AccountDeletionDialog";
import SettingsAccordion from "@/components/settings/SettingsAccordion";
import WorkOrderTermsSection from "@/components/settings/WorkOrderTermsSection";
import CompanyLogoUpload from "@/components/settings/CompanyLogoUpload";
import AiHelpButton from "@/components/settings/AiHelpButton";
import {
  Building2,
  Shield,
  CreditCard,
  AlertTriangle,
  FileText,
  Landmark,
  Gift,
  Users,
  Copy,
  MessageCircle,
  Send,
  Plus,
  BookOpen,
  Play,
  Hash,
  Link2,
} from "lucide-react";
import { useTutorial } from "@/hooks/useTutorial";
import CancellationDialog from "@/components/CancellationDialog";
import ReactivateDialog from "@/components/ReactivateDialog";
import { useBillPlz } from "@/hooks/useBillPlz";
import { usePricingPlans } from "@/hooks/usePricingPlans";

interface PaymentMethod {
  id: string;
  type: "bank_transfer" | "qr_payment";
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  provider?: string;
  qr_image_url?: string;
  is_primary?: boolean;
}

const BANK_OPTIONS = [
  "Maybank",
  "CIMB Bank",
  "Public Bank",
  "RHB Bank",
  "Hong Leong Bank",
  "AmBank",
  "Bank Islam",
  "Bank Rakyat",
  "BSN",
  "OCBC",
  "Standard Chartered",
  "HSBC",
  "Other",
];
const QR_PROVIDERS = ["DuitNow QR", "TnG eWallet", "ShopeePay", "GrabPay", "Boost", "Other"];

const TERMS_TABS = [
  { key: "quotation", label: "Sebut Harga" },
  { key: "invoice", label: "Invois" },
  { key: "work_order", label: "Work Order" },
] as const;

type TermsTab = (typeof TERMS_TABS)[number]["key"];

export default function SettingsPage() {
  const { user, profile, updateProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { totalSeenCount } = useTutorial("settings");
  const { getPlan } = usePricingPlans();

  // Company profile
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // SSM
  const [ssmNumberNew, setSsmNumberNew] = useState("");
  const [ssmNumberOld, setSsmNumberOld] = useState("");

  // LHDN
  const [lhdnEnabled, setLhdnEnabled] = useState(false);
  const [tinNumber, setTinNumber] = useState("");
  const [msicCode, setMsicCode] = useState("");
  const [sstRegistered, setSstRegistered] = useState(false);
  const [sstNumber, setSstNumber] = useState("");
  const [savingLhdn, setSavingLhdn] = useState(false);

  // T&C
  const [termsTab, setTermsTab] = useState<TermsTab>("quotation");
  const [quotationTerms, setQuotationTerms] = useState("");
  const [invoiceTerms, setInvoiceTerms] = useState("");
  const [savingTerms, setSavingTerms] = useState(false);

  // Payment methods
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [showBankForm, setShowBankForm] = useState(false);
  const [showQrForm, setShowQrForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentMethod | null>(null);
  const [bankName, setBankName] = useState("Maybank");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [qrProvider, setQrProvider] = useState("DuitNow QR");
  const [qrImageUrl, setQrImageUrl] = useState("");
  const [uploadingQr, setUploadingQr] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  // Delete account
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Cancellation
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [renewPeriod, setRenewPeriod] = useState<"monthly" | "yearly">(
    (profile?.billing_period as "monthly" | "yearly") || "monthly",
  );
  const { initiatePayment, isLoading: billPlzLoading } = useBillPlz();

  // Referral
  const [referrals, setReferrals] = useState<any[]>([]);

  useEffect(() => {
    if (profile) {
      setCompanyName(profile.company_name || "");
      setPhone(profile.phone || "");
      setAddress(profile.address || "");
      setLogoUrl(profile.logo_url);
      setSsmNumberNew(profile.ssm_number_new || "");
      setSsmNumberOld(profile.ssm_number_old || "");
      setLhdnEnabled(profile.lhdn_enabled);
      setTinNumber(profile.tin_number || "");
      setMsicCode(profile.msic_code || "");
      setSstRegistered(profile.sst_registered);
      setQuotationTerms(profile.quotation_terms || "");
      setInvoiceTerms(profile.invoice_terms || "");
      setPaymentMethods(Array.isArray(profile.payment_methods) ? profile.payment_methods : []);
    }
  }, [profile]);

  const [applyingFreeMonths, setApplyingFreeMonths] = useState(false);

  // Fetch referrals
  useEffect(() => {
    if (!user) return;
    supabase
      .from("referrals")
      .select("*")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setReferrals(data || []);
      });
  }, [user]);

  const handleSaveProfile = async () => {
    if (ssmNumberNew && !/^\d+$/.test(ssmNumberNew)) {
      toast.error("No. Pendaftaran SSM (Baru) mesti nombor sahaja");
      return;
    }
    setSavingProfile(true);
    await updateProfile({
      company_name: companyName || null,
      phone: phone || null,
      address: address || null,
      logo_url: logoUrl,
      ssm_number_new: ssmNumberNew || null,
      ssm_number_old: ssmNumberOld || null,
    });
    setSavingProfile(false);
    toast.success("Profil berjaya dikemaskini!");
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
    toast.success("Tetapan LHDN disimpan!");
  };

  const handleSaveTerms = async () => {
    setSavingTerms(true);
    await updateProfile({
      quotation_terms: quotationTerms || null,
      invoice_terms: invoiceTerms || null,
    });
    setSavingTerms(false);
    toast.success("Terma & syarat berjaya disimpan!");
  };

  // Payment methods
  const savePaymentMethods = async (methods: PaymentMethod[]) => {
    setSavingPayment(true);
    await updateProfile({ payment_methods: methods as any });
    setPaymentMethods(methods);
    setSavingPayment(false);
  };

  const resetBankForm = () => {
    setBankName("Maybank");
    setAccountName("");
    setAccountNumber("");
    setIsPrimary(false);
    setEditingPayment(null);
    setShowBankForm(false);
  };
  const resetQrForm = () => {
    setQrProvider("DuitNow QR");
    setQrImageUrl("");
    setEditingPayment(null);
    setShowQrForm(false);
  };

  const handleSaveBank = async () => {
    if (!accountName.trim() || !accountNumber.trim()) {
      toast.error("Sila isi semua medan");
      return;
    }
    let methods = [...paymentMethods];
    if (isPrimary) methods = methods.map((m) => ({ ...m, is_primary: false }));
    if (editingPayment) {
      methods = methods.map((m) =>
        m.id === editingPayment.id
          ? {
              ...m,
              bank_name: bankName,
              account_name: accountName,
              account_number: accountNumber,
              is_primary: isPrimary,
            }
          : m,
      );
    } else {
      methods.push({
        id: crypto.randomUUID(),
        type: "bank_transfer",
        bank_name: bankName,
        account_name: accountName,
        account_number: accountNumber,
        is_primary: isPrimary,
      });
    }
    await savePaymentMethods(methods);
    resetBankForm();
    toast.success("Akaun bank disimpan!");
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Saiz fail melebihi 2MB");
      return;
    }
    setUploadingQr(true);
    const path = `${user.id}/${Date.now()}.png`;
    const { error } = await supabase.storage.from("payment-qr").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Gagal muat naik QR");
      setUploadingQr(false);
      return;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("payment-qr").getPublicUrl(path);
    setQrImageUrl(publicUrl);
    setUploadingQr(false);
  };

  const handleSaveQr = async () => {
    if (!qrImageUrl) {
      toast.error("Sila muat naik imej QR");
      return;
    }
    let methods = [...paymentMethods];
    if (editingPayment) {
      methods = methods.map((m) =>
        m.id === editingPayment.id ? { ...m, provider: qrProvider, qr_image_url: qrImageUrl } : m,
      );
    } else {
      methods.push({
        id: crypto.randomUUID(),
        type: "qr_payment",
        provider: qrProvider,
        qr_image_url: qrImageUrl,
      });
    }
    await savePaymentMethods(methods);
    resetQrForm();
    toast.success("QR payment disimpan!");
  };

  const handleDeletePayment = async (id: string) => {
    const methods = paymentMethods.filter((m) => m.id !== id);
    await savePaymentMethods(methods);
    toast.success("Kaedah pembayaran dipadam");
  };

  const handleEditBank = (m: PaymentMethod) => {
    setBankName(m.bank_name || "Maybank");
    setAccountName(m.account_name || "");
    setAccountNumber(m.account_number || "");
    setIsPrimary(m.is_primary || false);
    setEditingPayment(m);
    setShowBankForm(true);
  };

  const handleEditQr = (m: PaymentMethod) => {
    setQrProvider(m.provider || "DuitNow QR");
    setQrImageUrl(m.qr_image_url || "");
    setEditingPayment(m);
    setShowQrForm(true);
  };

  // Referral
  const referralCode = profile?.referral_code || "";
  const referralUrl = `${window.location.origin}/login?ref=${referralCode}`;
  const freeMonthsBalance = (profile?.free_months_earned || 0) - (profile?.free_months_used || 0);

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralUrl);
    toast.success("Link rujukan disalin! Kongsi dengan rakan kontraktor anda.");
  };

  const shareWhatsApp = () => {
    const msg = `Jom cuba WorkTrace — app pengurusan kerja untuk kontraktor Malaysia! 🔧\n\n✅ Jejak kerja & pelanggan\n✅ Sebut harga & invois profesional\n✅ WhatsApp follow-up automatik\n✅ LHDN e-Invois ready\n\nDaftar guna link saya:\n👉 ${referralUrl}\n\n*WorkTrace — Jejak Kerja. Senang Collect.*`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const shareTelegram = () => {
    const msg = `Jom cuba WorkTrace — app pengurusan kerja untuk kontraktor Malaysia! Daftar guna link saya: ${referralUrl}`;
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(msg)}`,
      "_blank",
    );
  };

  const planLabel = profile?.plan === "pro" ? "Pro" : profile?.plan === "team" ? "Team" : "Free";
  const isFree = !profile || profile.plan === "free";
  const banks = paymentMethods.filter((m) => m.type === "bank_transfer");
  const qrs = paymentMethods.filter((m) => m.type === "qr_payment");

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl">
      <h1 className="text-xl font-bold text-foreground">Tetapan</h1>

      {/* 1 — Profil Syarikat */}
      <SettingsAccordion
        id="profil-syarikat"
        icon={<Building2 className="h-5 w-5" />}
        title="Profil Syarikat"
        description="Nama syarikat, telefon, alamat dan logo"
        defaultOpen
      >
        {user && (
          <CompanyLogoUpload userId={user.id} logoUrl={logoUrl} onChange={setLogoUrl} />
        )}
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Nama Syarikat *</label>
          <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="h-11 rounded-lg" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Nombor Telefon</label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0123456789"
            className="h-11 rounded-lg"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Alamat</label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">No. Pendaftaran SSM (Baru)</label>
          <Input
            value={ssmNumberNew}
            onChange={(e) => setSsmNumberNew(e.target.value.replace(/\D/g, ""))}
            placeholder="cth: 202301012345"
            inputMode="numeric"
            pattern="[0-9]*"
            className="h-11 rounded-lg"
          />
          <p className="text-xs text-muted-foreground mt-1">Format baru SSM (nombor sahaja)</p>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">No. Pendaftaran SSM (Lama)</label>
          <Input
            value={ssmNumberOld}
            onChange={(e) => setSsmNumberOld(e.target.value)}
            placeholder="cth: 123456-A"
            className="h-11 rounded-lg"
          />
          <p className="text-xs text-muted-foreground mt-1">Format lama SSM (jika ada)</p>
        </div>
        <Button onClick={handleSaveProfile} disabled={savingProfile} className="rounded-lg">
          {savingProfile ? "Menyimpan..." : "Simpan Profil"}
        </Button>
      </SettingsAccordion>

      {/* 2 — LHDN & SST */}
      <SettingsAccordion
        id="lhdn-sst"
        icon={<Shield className="h-5 w-5" />}
        title="LHDN & SST"
        description="Maklumat cukai dan e-Invois LHDN MyInvois"
      >
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
              <Input
                value={tinNumber}
                onChange={(e) => setTinNumber(e.target.value)}
                placeholder="e.g. C12345678900"
                className="h-11 rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Kod MSIC</label>
              <Input
                value={msicCode}
                onChange={(e) => setMsicCode(e.target.value)}
                placeholder="e.g. 43211"
                className="h-11 rounded-lg"
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-foreground">SST Berdaftar</span>
              <Switch checked={sstRegistered} onCheckedChange={setSstRegistered} />
            </div>
            {sstRegistered && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">No. SST</label>
                <Input
                  value={sstNumber}
                  onChange={(e) => setSstNumber(e.target.value)}
                  placeholder="e.g. W10-1234-12345678"
                  className="h-11 rounded-lg"
                />
              </div>
            )}
          </div>
        )}
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-sm text-primary">
          Integrasi automatik dengan portal MyInvois LHDN akan datang tidak lama lagi.
        </div>
        <Button onClick={handleSaveLhdn} disabled={savingLhdn} className="rounded-lg">
          {savingLhdn ? "Menyimpan..." : "Simpan Tetapan LHDN"}
        </Button>
      </SettingsAccordion>

      {/* 3 — Kaedah Pembayaran */}
      <SettingsAccordion
        id="kaedah-pembayaran"
        icon={<Landmark className="h-5 w-5" />}
        title="Kaedah Pembayaran"
        description="Akaun bank dan QR bayaran untuk invois"
      >
        <p className="text-sm text-muted-foreground">Maklumat ini akan dipaparkan dalam setiap invois anda</p>

        {banks.map((b) => (
          <div key={b.id} className="border border-border rounded-lg p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">🏦 Bank Transfer</span>
              {b.is_primary && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  Utama ✓
                </span>
              )}
            </div>
            <p className="text-sm text-foreground">{b.bank_name}</p>
            <p className="text-sm text-muted-foreground">{b.account_name}</p>
            <p className="text-sm text-muted-foreground font-mono">{b.account_number}</p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => handleEditBank(b)} className="text-xs text-primary hover:underline">
                Edit
              </button>
              <button
                onClick={() => handleDeletePayment(b.id)}
                className="text-xs text-destructive hover:underline"
              >
                Padam
              </button>
            </div>
          </div>
        ))}

        {qrs.map((q) => (
          <div key={q.id} className="border border-border rounded-lg p-4 space-y-2">
            <span className="text-sm font-medium">📱 {q.provider || "QR Payment"}</span>
            {q.qr_image_url && (
              <img
                src={q.qr_image_url}
                alt="QR"
                className="h-[60px] w-[60px] object-contain rounded border border-border"
              />
            )}
            <div className="flex gap-2">
              <button onClick={() => handleEditQr(q)} className="text-xs text-primary hover:underline">
                Edit
              </button>
              <button
                onClick={() => handleDeletePayment(q.id)}
                className="text-xs text-destructive hover:underline"
              >
                Padam
              </button>
            </div>
          </div>
        ))}

        {showBankForm && (
          <div className="border border-primary/30 rounded-lg p-4 space-y-3 bg-primary/5">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Nama Bank</label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {BANK_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Nama Akaun *</label>
              <Input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="h-10 rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Nombor Akaun *</label>
              <Input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="h-10 rounded-lg"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="primary-bank" checked={isPrimary} onCheckedChange={(v) => setIsPrimary(!!v)} />
              <label htmlFor="primary-bank" className="text-sm cursor-pointer">
                Tetapkan sebagai utama
              </label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveBank} disabled={savingPayment} size="sm" className="rounded-lg">
                Simpan Akaun
              </Button>
              <Button variant="outline" onClick={resetBankForm} size="sm" className="rounded-lg">
                Batal
              </Button>
            </div>
          </div>
        )}

        {showQrForm && (
          <div className="border border-primary/30 rounded-lg p-4 space-y-3 bg-primary/5">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Penyedia QR</label>
              <select
                value={qrProvider}
                onChange={(e) => setQrProvider(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {QR_PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Muat Naik Imej QR</label>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleQrUpload}
                disabled={uploadingQr}
              />
              {uploadingQr && <p className="text-xs text-muted-foreground">Memuat naik...</p>}
              {qrImageUrl && (
                <img
                  src={qrImageUrl}
                  alt="QR Preview"
                  className="h-[80px] w-[80px] object-contain mt-2 rounded border border-border"
                />
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveQr} disabled={savingPayment} size="sm" className="rounded-lg">
                Simpan QR
              </Button>
              <Button variant="outline" onClick={resetQrForm} size="sm" className="rounded-lg">
                Batal
              </Button>
            </div>
          </div>
        )}

        {!showBankForm && !showQrForm && (
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setShowBankForm(true)} size="sm" className="rounded-lg gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Tambah Akaun Bank
            </Button>
            <Button variant="outline" onClick={() => setShowQrForm(true)} size="sm" className="rounded-lg gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Tambah QR Payment
            </Button>
          </div>
        )}
      </SettingsAccordion>

      {/* 4 — Terma & Syarat (sub-tabs: Sebut Harga / Invois / Work Order) */}
      <SettingsAccordion
        id="terma-syarat"
        icon={<FileText className="h-5 w-5" />}
        title="Terma & Syarat"
        description="T&C untuk Sebut Harga, Invois dan Work Order"
      >
        <div className="flex gap-2 border-b border-border mb-2">
          {TERMS_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTermsTab(t.key)}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                termsTab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {termsTab === "quotation" && (
          <div className="space-y-3">
            <Textarea value={quotationTerms} onChange={(e) => setQuotationTerms(e.target.value)} rows={10} />
            <p className="text-xs text-muted-foreground">Terma ini dipaparkan dalam setiap Sebut Harga PDF</p>
            <Button onClick={handleSaveTerms} disabled={savingTerms} className="rounded-lg">
              {savingTerms ? "Menyimpan..." : "Simpan Terma Sebut Harga"}
            </Button>
          </div>
        )}

        {termsTab === "invoice" && (
          <div className="space-y-3">
            <Textarea value={invoiceTerms} onChange={(e) => setInvoiceTerms(e.target.value)} rows={10} />
            <p className="text-xs text-muted-foreground">Terma ini dipaparkan dalam setiap Invois PDF</p>
            <Button onClick={handleSaveTerms} disabled={savingTerms} className="rounded-lg">
              {savingTerms ? "Menyimpan..." : "Simpan Terma Invois"}
            </Button>
          </div>
        )}

        {termsTab === "work_order" && <WorkOrderTermsSection />}
      </SettingsAccordion>

      {/* 5 — Nombor Dokumen */}
      <SettingsAccordion
        id="nombor-dokumen"
        icon={<Hash className="h-5 w-5" />}
        title="Nombor Dokumen"
        description="Format nombor auto untuk semua jenis dokumen"
      >
        <DocNumberSettings />
      </SettingsAccordion>

      {/* 6 — Langganan & Pelan */}
      <SettingsAccordion
        id="langganan-pelan"
        icon={<CreditCard className="h-5 w-5" />}
        title="Langganan & Pelan"
        description="Pelan semasa dan pengurusan langganan"
      >
        {freeMonthsBalance > 0 && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 flex items-start gap-2">
            <Gift className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">
              Anda ada <strong>{freeMonthsBalance} bulan percuma</strong> daripada program rujukan! Akan digunakan
              semasa pembaharuan langganan.
            </p>
          </div>
        )}

        <div className="rounded-lg border border-border p-4 space-y-2">
          <p className="text-sm text-muted-foreground mb-1">Pelan Semasa</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground">
              {planLabel}
            </span>
            <span className="text-base font-bold text-foreground">{planLabel}</span>
            {!isFree && !(profile as any)?.subscription_cancelled && (
              <span className="text-xs text-emerald-600 font-medium">— Aktif ●</span>
            )}
            {!isFree && (profile as any)?.subscription_cancelled && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                Akan Tamat ⚠️
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {(() => {
              const dbPlan = getPlan(profile?.plan ?? "free");
              const isYearly = profile?.billing_period === "yearly";
              const price = dbPlan ? Number(isYearly ? dbPlan.yearly_price : dbPlan.monthly_price) : 0;
              const periodLabel = isFree ? "" : isYearly ? "/tahun" : "/bulan";
              return `RM${price.toFixed(2)}${periodLabel}`;
            })()}
            {isFree
              ? " · Selamanya percuma"
              : ` · ${profile?.billing_period === "yearly" ? "Tahunan" : "Bulanan"}`}
          </p>
          {!isFree && (profile as any)?.subscription_cancelled && profile?.subscription_end_date && (
            <p className="text-sm text-amber-700 mt-1">
              Langganan dibatalkan. Masih aktif sehingga{" "}
              {new Date(profile.subscription_end_date).toLocaleDateString("ms-MY", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          )}
          {!isFree && !(profile as any)?.subscription_cancelled && (
            <div className="space-y-1 mt-2">
              {profile?.subscription_start_date && (
                <p className="text-sm text-muted-foreground">
                  Tarikh Mula:{" "}
                  {new Date(profile.subscription_start_date).toLocaleDateString("ms-MY", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}
              {profile?.subscription_end_date && (
                <p className="text-sm text-muted-foreground">
                  Tarikh Tamat:{" "}
                  {new Date(profile.subscription_end_date).toLocaleDateString("ms-MY", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          )}
        </div>

        {!isFree && (profile as any)?.subscription_cancelled ? (
          <Button onClick={() => setReactivateOpen(true)} className="w-full rounded-lg">
            Aktifkan Semula Langganan
          </Button>
        ) : !isFree ? (
          <div className="space-y-3">
            {(() => {
              const dbPlan = getPlan(profile?.plan ?? "pro");
              const monthly = dbPlan ? Number(dbPlan.monthly_price) : 0;
              const yearly = dbPlan ? Number(dbPlan.yearly_price) : 0;
              const discount = dbPlan ? Number(dbPlan.yearly_discount_pct) || 0 : 0;
              const price = renewPeriod === "yearly" ? yearly : monthly;
              return (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Pilih tempoh pembaharuan</p>
                    <div className="flex rounded-lg border border-border overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setRenewPeriod("monthly")}
                        className={`flex-1 py-2 text-sm font-medium transition-colors ${
                          renewPeriod === "monthly"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        Bulanan — RM{monthly.toFixed(2)}/bulan
                      </button>
                      <button
                        type="button"
                        onClick={() => setRenewPeriod("yearly")}
                        className={`flex-1 py-2 text-sm font-medium transition-colors ${
                          renewPeriod === "yearly"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        Tahunan — RM{yearly.toFixed(2)}/tahun
                        {discount > 0 && (
                          <span className="ml-1.5 text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                            -{discount}%
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                  <Button
                    onClick={() => initiatePayment(profile?.plan as "pro" | "team", renewPeriod)}
                    disabled={billPlzLoading}
                    className="w-full rounded-lg"
                  >
                    {billPlzLoading
                      ? "Memproses..."
                      : `Perbaharui Langganan — RM${price.toFixed(2)}/${
                          renewPeriod === "yearly" ? "tahun" : "bulan"
                        }`}
                  </Button>
                </>
              );
            })()}
            <button
              onClick={() => setCancelOpen(true)}
              className="w-full text-center text-[13px] font-medium text-destructive hover:underline"
            >
              Batalkan Langganan
            </button>
          </div>
        ) : null}

        {isFree && <PlanCards currentPlan={profile?.plan || "free"} onSelect={() => {}} compact />}
      </SettingsAccordion>

      {/* 7 — Integrasi & Pautan */}
      <SettingsAccordion
        id="integrasi-pautan"
        icon={<Link2 className="h-5 w-5" />}
        title="Integrasi & Pautan"
        description="Pautan pengesahan dan bukti pembayaran"
      >
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-2">
          <p className="text-sm font-medium text-foreground">Pengesahan & Bukti Pembayaran Built-in</p>
          <p className="text-sm text-muted-foreground">
            WorkTrace menjana pautan pengesahan automatik ketika anda menghantar Sebut Harga, Work Order, atau
            Laporan kepada pelanggan. Untuk Invois, pautan bukti pembayaran (/bayar) dijana secara automatik —
            pelanggan boleh muat naik resit terus tanpa perlu sebarang integrasi luaran.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Tiada konfigurasi diperlukan — semua pautan dijana automatik.
        </p>
      </SettingsAccordion>

      {/* 8 — Rujukan */}
      <SettingsAccordion
        id="rujukan"
        icon={<Gift className="h-5 w-5" />}
        title="Rujukan"
        description="Kod rujukan dan ganjaran bulan percuma"
      >
        {isFree ? (
          <div className="text-center py-8 space-y-3">
            <Gift className="h-10 w-10 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">Upgrade ke Pro untuk akses sistem referral</p>
            <p className="text-xs text-muted-foreground">
              Kongsi link anda dan dapatkan 1 bulan percuma setiap kali rakan anda melanggan!
            </p>
          </div>
        ) : (
          <>
            <div
              className="rounded-xl border border-primary/20 p-5 space-y-4"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.05), hsl(var(--accent) / 0.5))" }}
            >
              <p className="text-sm text-foreground">
                Kongsi link anda dan dapatkan <strong>1 bulan percuma</strong> setiap kali rakan anda melanggan!
              </p>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Link Rujukan Anda:</p>
                <div className="flex items-center gap-2">
                  <Input value={referralUrl} readOnly className="text-xs bg-muted font-mono" />
                  <Button variant="outline" size="sm" onClick={copyReferralLink} className="shrink-0 rounded-lg gap-1">
                    <Copy className="h-3.5 w-3.5" /> Salin
                  </Button>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={shareWhatsApp}
                  size="sm"
                  className="rounded-lg gap-1.5 text-white"
                  style={{ backgroundColor: "#25D366" }}
                >
                  <MessageCircle className="h-3.5 w-3.5" /> Kongsi via WhatsApp
                </Button>
                <Button onClick={shareTelegram} size="sm" variant="outline" className="rounded-lg gap-1.5">
                  <Send className="h-3.5 w-3.5" /> Telegram
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Jumlah Rujukan", value: profile?.referral_count || 0 },
                { label: "Bulan Diperolehi", value: profile?.free_months_earned || 0 },
                { label: "Bulan Digunakan", value: profile?.free_months_used || 0 },
                { label: "Baki Tersedia", value: freeMonthsBalance },
              ].map((s) => (
                <div key={s.label} className="border border-border rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

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
                  {referrals.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between border border-border rounded-lg p-3"
                    >
                      <div>
                        <p className="text-sm text-foreground">
                          {new Date(r.created_at).toLocaleDateString("ms-MY", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            r.status === "rewarded"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {r.status === "rewarded" ? "✓ Ganjaran Diterima" : "Menunggu Langganan"}
                        </span>
                      </div>
                      <span className="text-sm text-foreground">
                        {r.status === "rewarded" ? `${r.months_awarded} Bulan Percuma ✓` : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </SettingsAccordion>

      {/* 9 — Tutorial & Bantuan + AI */}
      <SettingsAccordion
        id="tutorial-bantuan"
        icon={<BookOpen className="h-5 w-5" />}
        title="Tutorial & Bantuan"
        description="Tutorial interaktif dan bantuan AI"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Tutorial Interaktif</h3>
          </div>
          <p className="text-[13px] text-muted-foreground">
            Tutorial dilihat: {totalSeenCount === 0 ? "Belum pernah ditonton" : `${totalSeenCount} kali`}
          </p>
          <p className="text-xs text-muted-foreground">
            Merangkumi: Dashboard, Kerja, Pelanggan, Sebut Harga, Invois, Tetapan
          </p>
          <button
            onClick={() => window.__startWorkTraceTutorial?.()}
            className="w-full h-11 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Play className="h-4 w-4" /> Mulakan Tutorial Semula
          </button>
        </div>

        <div className="border-t border-border pt-4">
          <AiHelpButton />
        </div>

        <div className="border-t border-border pt-4 space-y-2">
          <p className="text-sm text-muted-foreground">Perlukan bantuan manusia?</p>
          <button
            onClick={() => navigate("/support/new")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border text-sm text-foreground hover:bg-accent transition-colors"
          >
            📧 Hantar Tiket Sokongan
          </button>
          <p className="text-xs text-muted-foreground">Masa respons: &lt; 24 jam (hari bekerja)</p>
        </div>
      </SettingsAccordion>

      {/* 10 — Zon Bahaya */}
      <SettingsAccordion
        id="zon-bahaya"
        icon={<AlertTriangle className="h-5 w-5" />}
        title="Zon Bahaya"
        description="Padam akaun dan tindakan yang tidak boleh dibatalkan"
        danger
      >
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">E-mel Akaun</label>
          <p className="text-sm text-foreground">{user?.email}</p>
        </div>
        <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3 space-y-1">
          <p className="text-[13px] text-destructive font-medium flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Tindakan Tidak Boleh Dibatalkan
          </p>
          <ul className="text-[13px] text-destructive list-disc list-inside space-y-0.5">
            <li>Semua kerja dan rekod</li>
            <li>Semua pelanggan</li>
            <li>Semua sebut harga, work order dan invois</li>
            <li>Semua fail dan dokumen</li>
            <li>Profil dan akaun syarikat</li>
            <li>Rekod rujukan</li>
          </ul>
        </div>
        <Button
          variant="outline"
          className="text-destructive border-destructive hover:bg-destructive/5 rounded-lg"
          onClick={() => setDeleteOpen(true)}
        >
          Padam Akaun
        </Button>
      </SettingsAccordion>

      <AccountDeletionDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} />
      <CancellationDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onCancelled={() => setCancelOpen(false)}
      />
      <ReactivateDialog open={reactivateOpen} onClose={() => setReactivateOpen(false)} />
    </div>
  );
}
