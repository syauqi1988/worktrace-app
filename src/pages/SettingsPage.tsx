import { useState, useEffect } from "react";
import { openWhatsApp, buildWhatsAppUrl } from '@/lib/whatsapp';
import { useTranslation, Trans } from "react-i18next";
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
import WhatsAppTemplatesSection from "@/components/settings/WhatsAppTemplatesSection";
import NotificationSettingsSection from "@/components/settings/NotificationSettingsSection";
import SecuritySection from "@/components/settings/SecuritySection";
import SubscriptionReceiptsSection from "@/components/settings/SubscriptionReceiptsSection";
import { getDateLocale } from "@/i18n";
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
  Briefcase,
} from "lucide-react";
import { JOB_TYPES, type JobType } from "@/lib/jobTypes";
import { MILESTONE_TEMPLATES } from "@/lib/milestoneTemplates";
import { useTutorial } from "@/hooks/useTutorial";
import CancellationDialog from "@/components/CancellationDialog";
import ReactivateDialog from "@/components/ReactivateDialog";
import RefundRequestDialog from "@/components/RefundRequestDialog";
import { getRefundEligibility } from "@/lib/refundEligibility";
import { Link } from "react-router-dom";
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

type TermsTab = "quotation" | "invoice" | "work_order";

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const TERMS_TABS: { key: TermsTab; label: string }[] = [
    { key: "quotation", label: t("settings.terms.tabQuotation") },
    { key: "invoice", label: t("settings.terms.tabInvoice") },
    { key: "work_order", label: t("settings.terms.tabWorkOrder") },
  ];
  const dateLocale = getDateLocale();
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
  const [refundOpen, setRefundOpen] = useState(false);
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

  // Job preferences
  const [defaultJobType, setDefaultJobType] = useState<JobType>('standard');
  const [defaultMilestoneTemplate, setDefaultMilestoneTemplate] = useState<string>('30/40/30');
  const [defaultDepositPct, setDefaultDepositPct] = useState<number>(30);
  const [savingJobPrefs, setSavingJobPrefs] = useState(false);

  useEffect(() => {
    if (profile) {
      setDefaultJobType(((profile as any).default_job_type as JobType) || 'standard');
      setDefaultMilestoneTemplate((profile as any).default_milestone_template || '30/40/30');
      setDefaultDepositPct(Number((profile as any).default_deposit_percentage) || 30);
    }
  }, [profile]);

  const handleSaveJobPrefs = async () => {
    setSavingJobPrefs(true);
    await updateProfile({
      default_job_type: defaultJobType,
      default_milestone_template: defaultMilestoneTemplate,
      default_deposit_percentage: defaultDepositPct,
    } as any);
    setSavingJobPrefs(false);
    toast.success(t('settings.saved') || 'Disimpan');
  };


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
      toast.error(t("settings.profile.ssmNewError"));
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
    toast.success(t("settings.profile.saved"));
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
    toast.success(t("settings.lhdn.saved"));
  };

  const handleSaveTerms = async () => {
    setSavingTerms(true);
    await updateProfile({
      quotation_terms: quotationTerms || null,
      invoice_terms: invoiceTerms || null,
    });
    setSavingTerms(false);
    toast.success(t("settings.terms.saved"));
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
      toast.error(t("settings.payment.fillAll"));
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
    toast.success(t("settings.payment.bankSaved"));
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("settings.payment.fileTooLarge"));
      return;
    }
    setUploadingQr(true);
    const path = `${user.id}/${Date.now()}.png`;
    const { error } = await supabase.storage.from("payment-qr").upload(path, file, { upsert: true });
    if (error) {
      toast.error(t("settings.payment.uploadFailed"));
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
      toast.error(t("settings.payment.uploadQrFirst"));
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
    toast.success(t("settings.payment.qrSaved"));
  };

  const handleDeletePayment = async (id: string) => {
    const methods = paymentMethods.filter((m) => m.id !== id);
    await savePaymentMethods(methods);
    toast.success(t("settings.payment.deleted"));
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
    toast.success(t("settings.referral.copied"));
  };

  const shareWhatsApp = () => {
    const msg = `Jom cuba WorkTrace — app pengurusan kerja untuk kontraktor Malaysia! 🔧\n\n✅ Jejak kerja & pelanggan\n✅ Sebut harga & invois profesional\n✅ WhatsApp follow-up automatik\n✅ LHDN e-Invois ready\n\nDaftar guna link saya:\n👉 ${referralUrl}\n\n*WorkTrace — Jejak Kerja. Senang Collect.*`;
    openWhatsApp(undefined, msg);
  };

  const shareTelegram = () => {
    const msg = `Jom cuba WorkTrace — app pengurusan kerja untuk kontraktor Malaysia! Daftar guna link saya: ${referralUrl}`;
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(msg)}`,
      "_blank",
    );
  };

  const handleApplyFreeMonths = async () => {
    if (freeMonthsBalance <= 0) return;
    const ok = window.confirm(
      t("settings.referral.applyConfirm", { count: freeMonthsBalance }),
    );
    if (!ok) return;
    setApplyingFreeMonths(true);
    try {
      const { data, error } = await supabase.functions.invoke("apply-free-months");
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(t("settings.referral.applied", { count: (data as any).monthsApplied }));
      await refreshProfile();
    } catch (e: any) {
      toast.error(e?.message || t("settings.referral.applyFailed"));
    } finally {
      setApplyingFreeMonths(false);
    }
  };

  const planLabel = profile?.plan === "pro" ? "Pro" : profile?.plan === "team" ? "Team" : "Free";
  const isFree = !profile || profile.plan === "free";
  const banks = paymentMethods.filter((m) => m.type === "bank_transfer");
  const qrs = paymentMethods.filter((m) => m.type === "qr_payment");

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl">
      <h1 className="text-xl font-bold text-foreground">{t("settings.title")}</h1>

      {/* 1 — Profil Syarikat */}
      <SettingsAccordion
        id="profil-syarikat"
        tutorialId="settings-profile"
        icon={<Building2 className="h-5 w-5" />}
        title={t("settings.profile.title")}
        description={t("settings.profile.description")}
        defaultOpen
      >
        {user && (
          <CompanyLogoUpload userId={user.id} logoUrl={logoUrl} onChange={setLogoUrl} />
        )}
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">{t("settings.profile.companyName")}</label>
          <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="h-11 rounded-lg" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">{t("settings.profile.phone")}</label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0123456789"
            className="h-11 rounded-lg"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">{t("settings.profile.address")}</label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">{t("settings.profile.ssmNew")}</label>
          <Input
            value={ssmNumberNew}
            onChange={(e) => setSsmNumberNew(e.target.value.replace(/\D/g, ""))}
            placeholder={t("settings.profile.ssmNewPlaceholder")}
            inputMode="numeric"
            pattern="[0-9]*"
            className="h-11 rounded-lg"
          />
          <p className="text-xs text-muted-foreground mt-1">{t("settings.profile.ssmNewHint")}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">{t("settings.profile.ssmOld")}</label>
          <Input
            value={ssmNumberOld}
            onChange={(e) => setSsmNumberOld(e.target.value)}
            placeholder={t("settings.profile.ssmOldPlaceholder")}
            className="h-11 rounded-lg"
          />
          <p className="text-xs text-muted-foreground mt-1">{t("settings.profile.ssmOldHint")}</p>
        </div>
        <Button onClick={handleSaveProfile} disabled={savingProfile} className="rounded-lg">
          {savingProfile ? t("settings.saving") : t("settings.profile.save")}
        </Button>
      </SettingsAccordion>

      {/* 2 — LHDN & SST */}
      <SettingsAccordion
        id="lhdn-sst"
        icon={<Shield className="h-5 w-5" />}
        title={t("settings.lhdn.title")}
        description={t("settings.lhdn.description")}
      >
        <div className="flex items-center justify-between py-2">
          <span className="text-sm font-medium text-foreground">{t("settings.lhdn.enable")}</span>
          <Switch checked={lhdnEnabled} onCheckedChange={setLhdnEnabled} />
        </div>
        {!lhdnEnabled && (
          <p className="text-sm text-muted-foreground">{t("settings.lhdn.enableHint")}</p>
        )}
        {lhdnEnabled && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">{t("settings.lhdn.tin")}</label>
              <Input
                value={tinNumber}
                onChange={(e) => setTinNumber(e.target.value)}
                placeholder="e.g. C12345678900"
                className="h-11 rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">{t("settings.lhdn.msic")}</label>
              <Input
                value={msicCode}
                onChange={(e) => setMsicCode(e.target.value)}
                placeholder="e.g. 43211"
                className="h-11 rounded-lg"
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-foreground">{t("settings.lhdn.sstRegistered")}</span>
              <Switch checked={sstRegistered} onCheckedChange={setSstRegistered} />
            </div>
            {sstRegistered && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">{t("settings.lhdn.sstNumber")}</label>
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
          {t("settings.lhdn.comingSoon")}
        </div>
        <Button onClick={handleSaveLhdn} disabled={savingLhdn} className="rounded-lg">
          {savingLhdn ? t("settings.saving") : t("settings.lhdn.save")}
        </Button>
      </SettingsAccordion>

      {/* 3 — Kaedah Pembayaran */}
      <SettingsAccordion
        id="kaedah-pembayaran"
        tutorialId="settings-payment"
        icon={<Landmark className="h-5 w-5" />}
        title={t("settings.payment.title")}
        description={t("settings.payment.description")}
      >
        <p className="text-sm text-muted-foreground">{t("settings.payment.willShow")}</p>

        {banks.map((b) => (
          <div key={b.id} className="border border-border rounded-lg p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t("settings.payment.bankTransfer")}</span>
              {b.is_primary && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  {t("settings.payment.primary")}
                </span>
              )}
            </div>
            <p className="text-sm text-foreground">{b.bank_name}</p>
            <p className="text-sm text-muted-foreground">{b.account_name}</p>
            <p className="text-sm text-muted-foreground font-mono">{b.account_number}</p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => handleEditBank(b)} className="text-xs text-primary hover:underline">
                {t("settings.edit")}
              </button>
              <button
                onClick={() => handleDeletePayment(b.id)}
                className="text-xs text-destructive hover:underline"
              >
                {t("settings.delete")}
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
                {t("settings.edit")}
              </button>
              <button
                onClick={() => handleDeletePayment(q.id)}
                className="text-xs text-destructive hover:underline"
              >
                {t("settings.delete")}
              </button>
            </div>
          </div>
        ))}

        {showBankForm && (
          <div className="border border-primary/30 rounded-lg p-4 space-y-3 bg-primary/5">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">{t("settings.payment.bankName")}</label>
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
              <label className="text-sm font-medium text-foreground mb-1 block">{t("settings.payment.accountName")}</label>
              <Input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="h-10 rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">{t("settings.payment.accountNumber")}</label>
              <Input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="h-10 rounded-lg"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="primary-bank" checked={isPrimary} onCheckedChange={(v) => setIsPrimary(!!v)} />
              <label htmlFor="primary-bank" className="text-sm cursor-pointer">
                {t("settings.payment.setPrimary")}
              </label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveBank} disabled={savingPayment} size="sm" className="rounded-lg">
                {t("settings.payment.saveBank")}
              </Button>
              <Button variant="outline" onClick={resetBankForm} size="sm" className="rounded-lg">
                {t("settings.cancel")}
              </Button>
            </div>
          </div>
        )}

        {showQrForm && (
          <div className="border border-primary/30 rounded-lg p-4 space-y-3 bg-primary/5">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">{t("settings.payment.qrProvider")}</label>
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
              <label className="text-sm font-medium text-foreground mb-1 block">{t("settings.payment.uploadQr")}</label>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleQrUpload}
                disabled={uploadingQr}
              />
              {uploadingQr && <p className="text-xs text-muted-foreground">{t("settings.payment.uploading")}</p>}
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
                {t("settings.payment.saveQr")}
              </Button>
              <Button variant="outline" onClick={resetQrForm} size="sm" className="rounded-lg">
                {t("settings.cancel")}
              </Button>
            </div>
          </div>
        )}

        {!showBankForm && !showQrForm && (
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setShowBankForm(true)} size="sm" className="rounded-lg gap-1.5">
              <Plus className="h-3.5 w-3.5" /> {t("settings.payment.addBank")}
            </Button>
            <Button variant="outline" onClick={() => setShowQrForm(true)} size="sm" className="rounded-lg gap-1.5">
              <Plus className="h-3.5 w-3.5" /> {t("settings.payment.addQr")}
            </Button>
          </div>
        )}
      </SettingsAccordion>

      {/* 4 — Terma & Syarat (sub-tabs: Sebut Harga / Invois / Work Order) */}
      <SettingsAccordion
        id="terma-syarat"
        tutorialId="settings-terms"
        icon={<FileText className="h-5 w-5" />}
        title={t("settings.terms.title")}
        description={t("settings.terms.description")}
      >
        <div className="flex gap-2 border-b border-border mb-2">
          {TERMS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setTermsTab(tab.key)}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                termsTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {termsTab === "quotation" && (
          <div className="space-y-3">
            <Textarea value={quotationTerms} onChange={(e) => setQuotationTerms(e.target.value)} rows={10} />
            <p className="text-xs text-muted-foreground">{t("settings.terms.quotationHint")}</p>
            <Button onClick={handleSaveTerms} disabled={savingTerms} className="rounded-lg">
              {savingTerms ? t("settings.saving") : t("settings.terms.saveQuotation")}
            </Button>
          </div>
        )}

        {termsTab === "invoice" && (
          <div className="space-y-3">
            <Textarea value={invoiceTerms} onChange={(e) => setInvoiceTerms(e.target.value)} rows={10} />
            <p className="text-xs text-muted-foreground">{t("settings.terms.invoiceHint")}</p>
            <Button onClick={handleSaveTerms} disabled={savingTerms} className="rounded-lg">
              {savingTerms ? t("settings.saving") : t("settings.terms.saveInvoice")}
            </Button>
          </div>
        )}

        {termsTab === "work_order" && <WorkOrderTermsSection />}
      </SettingsAccordion>

      {/* 4.5 — Templet WhatsApp */}
      <SettingsAccordion
        id="whatsapp-templates"
        tutorialId="settings-whatsapp"
        icon={<MessageCircle className="h-5 w-5" />}
        title={t("settings.whatsappTemplates.title")}
        description={t("settings.whatsappTemplates.description")}
      >
        <WhatsAppTemplatesSection />
      </SettingsAccordion>

      {/* 4.6 — Notifikasi Peranti */}
      <SettingsAccordion
        id="device-notifications"
        icon={<MessageCircle className="h-5 w-5" />}
        title={t("settings.deviceNotifications.title")}
        description={t("settings.deviceNotifications.description")}
      >
        <NotificationSettingsSection />
      </SettingsAccordion>

      {/* 5 — Nombor Dokumen */}
      <SettingsAccordion
        id="nombor-dokumen"
        tutorialId="settings-docnum"
        icon={<Hash className="h-5 w-5" />}
        title={t("settings.docNumbers.title")}
        description={t("settings.docNumbers.description")}
      >
        <DocNumberSettings />
      </SettingsAccordion>

      {/* 6 — Langganan & Pelan */}
      <SettingsAccordion
        id="langganan-pelan"
        icon={<CreditCard className="h-5 w-5" />}
        title={t("settings.subscription.title")}
        description={t("settings.subscription.description")}
      >
        {freeMonthsBalance > 0 && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 flex items-start gap-2">
            <Gift className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">
              <Trans
                i18nKey="settings.subscription.freeMonthsBanner"
                values={{ count: freeMonthsBalance }}
                components={{ strong: <strong /> }}
              />
            </p>
          </div>
        )}

        <div className="rounded-lg border border-border p-4 space-y-2">
          <p className="text-sm text-muted-foreground mb-1">{t("settings.subscription.currentPlan")}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground">
              {planLabel}
            </span>
            <span className="text-base font-bold text-foreground">{planLabel}</span>
            {!isFree && !(profile as any)?.subscription_cancelled && (
              <span className="text-xs text-emerald-600 font-medium">{t("settings.subscription.active")}</span>
            )}
            {!isFree && (profile as any)?.subscription_cancelled && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                {t("settings.subscription.willEnd")}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {(() => {
              const dbPlan = getPlan(profile?.plan ?? "free");
              const isYearly = profile?.billing_period === "yearly";
              const price = dbPlan ? Number(isYearly ? dbPlan.yearly_price : dbPlan.monthly_price) : 0;
              const periodLabel = isFree ? "" : isYearly ? t("settings.subscription.perYear") : t("settings.subscription.perMonth");
              return `RM${price.toFixed(2)}${periodLabel}`;
            })()}
            {isFree
              ? t("settings.subscription.forever")
              : ` · ${profile?.billing_period === "yearly" ? t("settings.subscription.yearly") : t("settings.subscription.monthly")}`}
          </p>
          {!isFree && (profile as any)?.subscription_cancelled && profile?.subscription_end_date && (
            <p className="text-sm text-amber-700 mt-1">
              {t("settings.subscription.cancelledUntil", {
                date: new Date(profile.subscription_end_date).toLocaleDateString(dateLocale, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }),
              })}
            </p>
          )}
          {!isFree && !(profile as any)?.subscription_cancelled && (
            <div className="space-y-1 mt-2">
              {profile?.subscription_start_date && (
                <p className="text-sm text-muted-foreground">
                  {t("settings.subscription.startDate", {
                    date: new Date(profile.subscription_start_date).toLocaleDateString(dateLocale, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }),
                  })}
                </p>
              )}
              {profile?.subscription_end_date && (
                <p className="text-sm text-muted-foreground">
                  {t("settings.subscription.endDate", {
                    date: new Date(profile.subscription_end_date).toLocaleDateString(dateLocale, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }),
                  })}
                </p>
              )}
            </div>
          )}
        </div>

        {!isFree && (profile as any)?.subscription_cancelled ? (
          <Button onClick={() => setReactivateOpen(true)} className="w-full rounded-lg">
            {t("settings.subscription.reactivate")}
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
                    <p className="text-xs text-muted-foreground mb-1.5">{t("settings.subscription.choosePeriod")}</p>
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
                        {t("settings.subscription.monthlyOption", { price: monthly.toFixed(2) })}
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
                        {t("settings.subscription.yearlyOption", { price: yearly.toFixed(2) })}
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
                      ? t("settings.subscription.processing")
                      : t("settings.subscription.renew", {
                          price: price.toFixed(2),
                          period: renewPeriod === "yearly" ? t("settings.subscription.perYear").replace("/", "") : t("settings.subscription.perMonth").replace("/", ""),
                        })}
                  </Button>
                </>
              );
            })()}
            {(() => {
              const elig = getRefundEligibility({
                plan: profile?.plan,
                billing_period: profile?.billing_period,
                subscription_start_date: profile?.subscription_start_date,
              });
              if (elig.status === 'full' || elig.status === 'prorated') {
                const until = elig.status === 'full' ? elig.fullRefundUntil : elig.proratedRefundUntil;
                const tone = elig.status === 'full' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800';
                const label = elig.status === 'full'
                  ? `Anda layak bayaran balik penuh sehingga ${until?.toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })}`
                  : `Anda layak bayaran balik pro-rated sehingga ${until?.toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })}`;
                return <div className={`text-xs rounded-lg border p-2.5 ${tone}`}>{label}</div>;
              }
              return null;
            })()}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <button
                onClick={() => setCancelOpen(true)}
                className="text-[13px] font-medium text-destructive hover:underline"
              >
                {t("settings.subscription.cancelSub")}
              </button>
              <button
                onClick={() => setRefundOpen(true)}
                className="text-[13px] font-medium text-foreground hover:underline"
              >
                Mohon Bayaran Balik
              </button>
            </div>
            <Link to="/refund-policy" className="block text-center text-[12px] text-muted-foreground hover:underline">
              Lihat Dasar Bayaran Balik
            </Link>
          </div>
        ) : null}

        {isFree && <PlanCards currentPlan={profile?.plan || "free"} onSelect={() => {}} compact />}

        <div className="mt-6 pt-4 border-t border-border space-y-3">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Official Receipts</h4>
            <p className="text-xs text-muted-foreground">Issued by HS Partnership PLT for each successful payment. Auto-emailed to you.</p>
          </div>
          <SubscriptionReceiptsSection />
        </div>
      </SettingsAccordion>

      {/* 7 — Integrasi & Pautan */}
      <SettingsAccordion
        id="integrasi-pautan"
        icon={<Link2 className="h-5 w-5" />}
        title={t("settings.integrations.title")}
        description={t("settings.integrations.description")}
      >
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-2">
          <p className="text-sm font-medium text-foreground">{t("settings.integrations.heading")}</p>
          <p className="text-sm text-muted-foreground">
            {t("settings.integrations.body")}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("settings.integrations.noConfig")}
        </p>
      </SettingsAccordion>

      {/* 8 — Rujukan */}
      <SettingsAccordion
        id="rujukan"
        icon={<Gift className="h-5 w-5" />}
        title={t("settings.referral.title")}
        description={t("settings.referral.description")}
      >
        {isFree ? (
          <div className="text-center py-8 space-y-3">
            <Gift className="h-10 w-10 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">{t("settings.referral.upgradePrompt")}</p>
            <p className="text-xs text-muted-foreground">
              {t("settings.referral.upgradeHint")}
            </p>
          </div>
        ) : (
          <>
            <div
              className="rounded-xl border border-primary/20 p-5 space-y-4"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.05), hsl(var(--accent) / 0.5))" }}
            >
              <p className="text-sm text-foreground">
                <Trans i18nKey="settings.referral.intro" components={{ strong: <strong /> }} />
              </p>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("settings.referral.yourLink")}</p>
                <div className="flex items-center gap-2">
                  <Input value={referralUrl} readOnly className="text-xs bg-muted font-mono" />
                  <Button variant="outline" size="sm" onClick={copyReferralLink} className="shrink-0 rounded-lg gap-1">
                    <Copy className="h-3.5 w-3.5" /> {t("settings.referral.copy")}
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
                  <MessageCircle className="h-3.5 w-3.5" /> {t("settings.referral.shareWa")}
                </Button>
                <Button onClick={shareTelegram} size="sm" variant="outline" className="rounded-lg gap-1.5">
                  <Send className="h-3.5 w-3.5" /> {t("settings.referral.telegram")}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: t("settings.referral.totalReferrals"), value: profile?.referral_count || 0 },
                { label: t("settings.referral.monthsEarned"), value: profile?.free_months_earned || 0 },
                { label: t("settings.referral.monthsUsed"), value: profile?.free_months_used || 0 },
                { label: t("settings.referral.balance"), value: freeMonthsBalance },
              ].map((s) => (
                <div key={s.label} className="border border-border rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {freeMonthsBalance > 0 && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-2">
                  <Gift className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {t("settings.referral.youHave", { count: freeMonthsBalance })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("settings.referral.applyNow")}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={handleApplyFreeMonths}
                  disabled={applyingFreeMonths || isFree}
                  className="rounded-lg shrink-0"
                >
                  {applyingFreeMonths ? t("settings.referral.applying") : t("settings.referral.useNow", { count: freeMonthsBalance })}
                </Button>
              </div>
            )}
            {freeMonthsBalance > 0 && isFree && (
              <p className="text-xs text-muted-foreground -mt-1">
                {t("settings.referral.upgradeToUse")}
              </p>
            )}

            <div>
              <p className="text-sm font-medium text-foreground mb-2">{t("settings.referral.history")}</p>
              {referrals.length === 0 ? (
                <div className="text-center py-6">
                  <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{t("settings.referral.noReferrals")}</p>
                  <p className="text-xs text-muted-foreground">{t("settings.referral.shareToStart")}</p>
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
                          {new Date(r.created_at).toLocaleDateString(dateLocale, {
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
                          {r.status === "rewarded" ? t("settings.referral.rewarded") : t("settings.referral.pending")}
                        </span>
                      </div>
                      <span className="text-sm text-foreground">
                        {r.status === "rewarded" ? t("settings.referral.monthsAwarded", { count: r.months_awarded }) : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </SettingsAccordion>

      {/* 9 — Bantuan + AI */}
      <SettingsAccordion
        id="tutorial-bantuan"
        icon={<BookOpen className="h-5 w-5" />}
        title={t("settings.help.title")}
        description={t("settings.help.description")}
      >
        <div>
          <AiHelpButton />
        </div>

        <div className="border-t border-border pt-4 space-y-2">
          <button
            onClick={() => navigate("/faq")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border text-sm text-foreground hover:bg-accent transition-colors"
          >
            <BookOpen className="h-4 w-4" /> {i18n.language?.startsWith("ms") ? "Lihat Soalan Lazim (FAQ)" : "View FAQ"}
          </button>
          <button
            onClick={() => window.__startWorkTraceTutorial?.()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border text-sm text-foreground hover:bg-accent transition-colors"
          >
            <Play className="h-4 w-4" /> {i18n.language?.startsWith("ms") ? "Main Semula Tutorial" : "Replay Tutorial"}
          </button>
        </div>

        <div className="border-t border-border pt-4 space-y-2">
          <p className="text-sm text-muted-foreground">{t("settings.help.needHuman")}</p>
          <button
            onClick={() => navigate("/support/new")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border text-sm text-foreground hover:bg-accent transition-colors"
          >
            {t("settings.help.sendTicket")}
          </button>
          <p className="text-xs text-muted-foreground">{t("settings.help.responseTime")}</p>
        </div>
      </SettingsAccordion>

      {/* 10 — Zon Bahaya */}
      <SettingsAccordion
        id="zon-bahaya"
        icon={<AlertTriangle className="h-5 w-5" />}
        title={t("settings.danger.title")}
        description={t("settings.danger.description")}
        danger
      >
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">{t("settings.danger.accountEmail")}</label>
          <p className="text-sm text-foreground">{user?.email}</p>
        </div>
        <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3 space-y-1">
          <p className="text-[13px] text-destructive font-medium flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> {t("settings.danger.irreversible")}
          </p>
          <ul className="text-[13px] text-destructive list-disc list-inside space-y-0.5">
            <li>{t("settings.danger.items.jobs")}</li>
            <li>{t("settings.danger.items.customers")}</li>
            <li>{t("settings.danger.items.documents")}</li>
            <li>{t("settings.danger.items.files")}</li>
            <li>{t("settings.danger.items.profile")}</li>
            <li>{t("settings.danger.items.referrals")}</li>
          </ul>
        </div>
        <Button
          variant="outline"
          className="text-destructive border-destructive hover:bg-destructive/5 rounded-lg"
          onClick={() => setDeleteOpen(true)}
        >
          {t("settings.danger.deleteAccount")}
        </Button>
      </SettingsAccordion>

      <SettingsAccordion
        id="security"
        icon={<Shield className="h-5 w-5" />}
        title={t('passkey.settingsTitle')}
        description={t('passkey.settingsDesc')}
      >
        <SecuritySection />
      </SettingsAccordion>

      <AccountDeletionDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} />
      <CancellationDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onCancelled={() => setCancelOpen(false)}
      />
      <ReactivateDialog open={reactivateOpen} onClose={() => setReactivateOpen(false)} />
      <RefundRequestDialog open={refundOpen} onClose={() => setRefundOpen(false)} />
    </div>
  );
}
