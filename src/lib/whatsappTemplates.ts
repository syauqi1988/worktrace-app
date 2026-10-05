// Centralised WhatsApp message templates.
import i18n from "@/i18n";

const isEn = () => !!i18n.language?.startsWith("en");

// Each template has:
//  - editable parts the user can customise from Tetapan (greeting, intro, closing)
//  - a fixed "core" block (numbers, totals, links) that we keep locked so the
//    message remains accurate and the link is never broken.

export type TemplateKey =
  | "quotation"
  | "invoice"
  | "invoice_reminder"
  | "work_order"
  | "completion_report"
  | "receipt"
  | "job_followup";

export interface TemplateEditable {
  greeting: string; // line 1 — e.g. "Assalamualaikum / Salam Sejahtera {customer_name},"
  intro: string;   // 1–3 lines after greeting — the friendly framing
  closing: string; // last line(s) — e.g. "Terima kasih!"
}

export interface TemplateMeta {
  key: TemplateKey;
  label: string;
  description: string;
  placeholders: string[]; // tokens the user may use in editable parts
  // What the locked "details" block looks like (shown read-only as preview)
  detailsPreview: string;
  defaults: TemplateEditable;
  labelEn: string;
  descriptionEn: string;
  detailsPreviewEn: string;
  defaultsEn: TemplateEditable;
}

export const TEMPLATE_PLACEHOLDERS: Record<string, string> = {
  customer_name: "Nama pelanggan",
  company_name: "Nama syarikat anda",
  job_number: "Nombor kerja",
};
export const TEMPLATE_PLACEHOLDERS_EN: Record<string, string> = {
  customer_name: "Customer name",
  company_name: "Your company name",
  job_number: "Job number",
};

/** Language-aware accessors for template metadata (BM default, EN when toggled). */
export const tplLabel = (m: TemplateMeta) => (isEn() ? m.labelEn : m.label);
export const tplDescription = (m: TemplateMeta) => (isEn() ? m.descriptionEn : m.description);
export const tplDetailsPreview = (m: TemplateMeta) => (isEn() ? m.detailsPreviewEn : m.detailsPreview);
export const tplDefaults = (m: TemplateMeta): TemplateEditable => (isEn() ? m.defaultsEn : m.defaults);
export const tplPlaceholderLabel = (p: string) => (isEn() ? TEMPLATE_PLACEHOLDERS_EN : TEMPLATE_PLACEHOLDERS)[p] || p;

export const TEMPLATES: TemplateMeta[] = [
  {
    key: "quotation",
    labelEn: "Quotation",
    descriptionEn: "Send a quotation to the customer via WhatsApp",
    detailsPreviewEn: "📋 *Quotation No.:* QUO-0001\n💰 *Total:* RM 1,500.00\n\nPlease click the link below to view the quotation:\n🔗 https://...",
    defaultsEn: { greeting: "Hello {customer_name},", intro: "Thank you for your interest in our services. 🙏\n\nHere is the quotation from *{company_name}* for your review:", closing: "Please review and contact us if you have any questions.\n\nThank you!\n*{company_name}*" },
    label: "Sebut Harga",
    description: "Hantar sebut harga kepada pelanggan via WhatsApp",
    placeholders: ["customer_name", "company_name"],
    detailsPreview:
      "📋 *No. Sebut Harga:* QUO-0001\n💰 *Jumlah:* RM 1,500.00\n\nSila klik pautan di bawah untuk melihat sebut harga:\n🔗 https://...",
    defaults: {
      greeting: "Assalamualaikum / Salam Sejahtera {customer_name},",
      intro:
        "Terima kasih kerana berminat dengan perkhidmatan kami. 🙏\n\nBerikut adalah sebut harga daripada *{company_name}* untuk semakan anda:",
      closing:
        "Sila semak dan hubungi kami sekiranya ada sebarang pertanyaan.\n\nTerima kasih!\n*{company_name}*",
    },
  },
  {
    key: "invoice",
    labelEn: "Invoice",
    descriptionEn: "Send a new invoice to the customer",
    detailsPreviewEn: "🧾 *Invoice No.:* INV-0001\n💰 *Total:* RM 1,500.00\n📅 *Pay Before:* 30 Apr 2026\n\n👉 Tap here to view the invoice & submit payment proof:\nhttps://...",
    defaultsEn: { greeting: "Hello {customer_name},", intro: "Thank you for trusting *{company_name}*. 🙏\n\nHere is the invoice for the completed work:", closing: "For any questions, please contact us.\n\n*{company_name}*" },
    label: "Invois",
    description: "Hantar invois baru kepada pelanggan",
    placeholders: ["customer_name", "company_name"],
    detailsPreview:
      "🧾 *No. Invois:* INV-0001\n💰 *Jumlah:* RM 1,500.00\n📅 *Bayar Sebelum:* 30 Apr 2026\n\n👉 Tekan sini untuk lihat invois & hantar bukti bayaran:\nhttps://...",
    defaults: {
      greeting: "Assalamualaikum / Salam Sejahtera {customer_name},",
      intro:
        "Terima kasih atas kepercayaan anda kepada *{company_name}*. 🙏\n\nBerikut adalah invois untuk kerja yang telah siap:",
      closing: "Sebarang pertanyaan, sila hubungi kami.\n\n*{company_name}*",
    },
  },
  {
    key: "invoice_reminder",
    labelEn: "Invoice Reminder",
    descriptionEn: "A friendly reminder for unpaid invoices",
    detailsPreviewEn: "🧾 *Invoice No.:* INV-0001\n💰 *Total:* RM 1,500.00\n📅 *Pay Before:* 30 Apr 2026\n\n👉 Tap here to view the invoice & submit payment proof:\nhttps://...",
    defaultsEn: { greeting: "Hello {customer_name},", intro: "This is a friendly reminder from *{company_name}* regarding the following invoice:", closing: "Kindly settle the payment. Thank you!\n\n*{company_name}*" },
    label: "Peringatan Invois",
    description: "Peringatan mesra untuk invois yang belum dibayar",
    placeholders: ["customer_name", "company_name"],
    detailsPreview:
      "🧾 *No. Invois:* INV-0001\n💰 *Jumlah:* RM 1,500.00\n📅 *Bayar Sebelum:* 30 Apr 2026\n\n👉 Tekan sini untuk lihat invois & hantar bukti bayaran:\nhttps://...",
    defaults: {
      greeting: "Assalamualaikum / Salam Sejahtera {customer_name},",
      intro:
        "Ini adalah peringatan mesra daripada *{company_name}* berkenaan invois berikut:",
      closing: "Mohon kerjasama untuk selesaikan bayaran. Terima kasih!\n\n*{company_name}*",
    },
  },
  {
    key: "work_order",
    labelEn: "Work Order",
    descriptionEn: "Send a work order to the customer / team",
    detailsPreviewEn: "📋 *Work Order No.:* WO-0001\n🔨 *Job Title:* Light Installation\n\n👉 Tap here to view the work order:\nhttps://...",
    defaultsEn: { greeting: "Hello {customer_name},", intro: "Thank you for your trust. 🙏\n\nHere is the Work Order from *{company_name}* for your information. Work will be carried out as scheduled.", closing: "If you have any questions, please contact us.\n\nThank you!\n*{company_name}*" },
    label: "Work Order",
    description: "Hantar work order kepada pelanggan / team",
    placeholders: ["customer_name", "company_name"],
    detailsPreview:
      "📋 *No. Work Order:* WO-0001\n🔨 *Tajuk Kerja:* Pemasangan Lampu\n\n👉 Tekan sini untuk lihat work order:\nhttps://...",
    defaults: {
      greeting: "Assalamualaikum / Salam Sejahtera {customer_name},",
      intro:
        "Terima kasih atas kepercayaan anda. 🙏\n\nBerikut adalah Work Order daripada *{company_name}* untuk makluman anda. Kerja akan dijalankan seperti yang dijadualkan.",
      closing:
        "Sekiranya ada sebarang pertanyaan, sila hubungi kami.\n\nTerima kasih!\n*{company_name}*",
    },
  },
  {
    key: "completion_report",
    labelEn: "Completion Report",
    descriptionEn: "Send a completion report to the customer",
    detailsPreviewEn: "📋 *Report No.:* RPT-0001\n🔨 *Job:* Light Installation\n📅 *Completion Date:* 28 Apr 2026\n\n👉 Tap here to view the report:\nhttps://...",
    defaultsEn: { greeting: "Hello {customer_name},", intro: "The work has been completed. 🙏\n\nHere is the Completion Report from *{company_name}* for your records.", closing: "Thank you for choosing our services. 😊\n\n*{company_name}*" },
    label: "Laporan Kerja Siap",
    description: "Hantar completion report kepada pelanggan",
    placeholders: ["customer_name", "company_name"],
    detailsPreview:
      "📋 *No. Laporan:* RPT-0001\n🔨 *Kerja:* Pemasangan Lampu\n📅 *Tarikh Siap:* 28 Apr 2026\n\n👉 Tekan sini untuk lihat laporan:\nhttps://...",
    defaults: {
      greeting: "Assalamualaikum / Salam Sejahtera {customer_name},",
      intro:
        "Alhamdulillah, kerja telah siap dilaksanakan. 🙏\n\nBerikut adalah Laporan Siap Kerja daripada *{company_name}* untuk simpanan anda.",
      closing:
        "Terima kasih kerana memilih perkhidmatan kami. 😊\n\n*{company_name}*",
    },
  },
  {
    key: "receipt",
    labelEn: "Payment Receipt",
    descriptionEn: "Send a receipt after payment is verified",
    detailsPreviewEn: "🧾 *Receipt No.:* RCP-0001\n🧾 *Invoice No.:* INV-0001\n💰 *Amount Paid:* RM 1,500.00\n📅 *Payment Date:* 28 Apr 2026\n\n👉 Tap here to download the receipt:\nhttps://...",
    defaultsEn: { greeting: "Hello {customer_name},", intro: "Thank you for your payment. 🙏✅\n\nHere is the official payment receipt from *{company_name}*:", closing: "Thank you for choosing our services. 😊\n\n*{company_name}*" },
    label: "Resit Pembayaran",
    description: "Hantar resit selepas pembayaran disahkan",
    placeholders: ["customer_name", "company_name"],
    detailsPreview:
      "🧾 *No. Resit:* RCP-0001\n🧾 *No. Invois:* INV-0001\n💰 *Jumlah Dibayar:* RM 1,500.00\n📅 *Tarikh Bayaran:* 28 Apr 2026\n\n👉 Tekan sini untuk muat turun resit:\nhttps://...",
    defaults: {
      greeting: "Assalamualaikum / Salam Sejahtera {customer_name},",
      intro:
        "Terima kasih atas pembayaran anda. 🙏✅\n\nBerikut adalah resit pembayaran rasmi daripada *{company_name}*:",
      closing:
        "Terima kasih kerana memilih perkhidmatan kami. 😊\n\n*{company_name}*",
    },
  },
  {
    key: "job_followup",
    labelEn: "Job Follow-up",
    descriptionEn: "Quick message to follow up on job status",
    detailsPreviewEn: "(No details block — only your message)",
    defaultsEn: { greeting: "Hi {customer_name},", intro: "I'd like to follow up on job {job_number}. Could you confirm the latest status?", closing: "Thank you!" },
    label: "Follow-up Kerja",
    description: "Mesej cepat untuk follow-up status kerja",
    placeholders: ["customer_name", "company_name", "job_number"],
    detailsPreview: "(Tiada blok butiran — hanya mesej anda sahaja)",
    defaults: {
      greeting: "Hi {customer_name},",
      intro:
        "Saya nak follow up berkenaan kerja {job_number}. Boleh confirm status terkini?",
      closing: "Terima kasih!",
    },
  },
];

export const TEMPLATE_MAP: Record<TemplateKey, TemplateMeta> = TEMPLATES.reduce(
  (acc, t) => {
    acc[t.key] = t;
    return acc;
  },
  {} as Record<TemplateKey, TemplateMeta>,
);

type TemplatesBucket = Partial<Record<TemplateKey, Partial<TemplateEditable>>>;
/** Malay edits live at the top level; English edits live under `en`. */
export type TemplatesState = TemplatesBucket & { en?: TemplatesBucket };

/** Return a new state with `edit` saved for the current language. */
export function withTemplateEdit(state: TemplatesState | null | undefined, key: TemplateKey, edit: TemplateEditable): TemplatesState {
  const base: TemplatesState = { ...(state || {}) };
  if (isEn()) base.en = { ...(base.en || {}), [key]: { ...edit } };
  else (base as any)[key] = { ...edit };
  return base;
}

export function getTemplate(state: TemplatesState | null | undefined, key: TemplateKey): TemplateEditable {
  const meta = TEMPLATE_MAP[key];
  const saved = (isEn() ? state?.en?.[key] : state?.[key]) ?? {};
  const d = tplDefaults(meta);
  return {
    greeting: saved.greeting ?? d.greeting,
    intro: saved.intro ?? d.intro,
    closing: saved.closing ?? d.closing,
  };
}

function fill(text: string, vars: Record<string, string | number | undefined | null>): string {
  return text.replace(/\{(\w+)\}/g, (_m, k) => {
    const v = vars[k];
    return v === undefined || v === null ? "" : String(v);
  });
}

/**
 * Render a full WhatsApp message:
 *   <greeting>
 *
 *   <intro>
 *
 *   <details block — locked, passed by caller>
 *
 *   <closing>
 */
export function renderTemplate(
  state: TemplatesState | null | undefined,
  key: TemplateKey,
  vars: Record<string, string | number | undefined | null>,
  detailsBlock: string,
): string {
  const t = getTemplate(state, key);
  const parts = [
    fill(t.greeting, vars),
    "",
    fill(t.intro, vars),
  ];
  if (detailsBlock && detailsBlock.trim()) {
    parts.push("", detailsBlock.trim());
  }
  parts.push("", fill(t.closing, vars));
  return parts.join("\n");
}

/**
 * Build the details block for a milestone-stage invoice WhatsApp message.
 * Feed the result into renderTemplate(..., 'invoice', ...) so greeting/closing
 * stay consistent with user-customised templates.
 */
export function milestonePaymentMessage(opts: {
  invoiceNumber: string;
  stageNumber: number;
  totalStages: number;
  stageLabel: string;
  stageAmount: number;
  invoiceTotal: number;
  paidSoFar: number;
  dueDate?: string | null;
  payUrl: string;
}): string {
  const lines = [
    `📋 *Peringkat ${opts.stageNumber} dari ${opts.totalStages}* — ${opts.stageLabel}`,
    `🧾 *No. Invois:* ${opts.invoiceNumber}`,
    `💰 *Bayaran peringkat ini:* RM ${opts.stageAmount.toFixed(2)}`,
    `📊 *Total invois:* RM ${opts.invoiceTotal.toFixed(2)}`,
    `✅ *Telah dibayar:* RM ${opts.paidSoFar.toFixed(2)}`,
  ];
  if (opts.dueDate) lines.push(`📅 *Bayar Sebelum:* ${opts.dueDate}`);
  lines.push('', '👉 Tekan untuk bayar / hantar bukti bayaran:', opts.payUrl);
  return lines.join('\n');
}
