// Centralised WhatsApp message templates.
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
}

export const TEMPLATE_PLACEHOLDERS: Record<string, string> = {
  customer_name: "Nama pelanggan",
  company_name: "Nama syarikat anda",
};

export const TEMPLATES: TemplateMeta[] = [
  {
    key: "quotation",
    label: "Sebut Harga",
    description: "Hantar sebut harga kepada pelanggan via WhatsApp",
    placeholders: ["customer_name", "company_name"],
    detailsPreview:
      "📋 *No. Sebut Harga:* QUO-0001\n💰 *Jumlah:* RM 1,500.00\n\nSila klik pautan di bawah untuk *melihat & mengesahkan* sebut harga:\n🔗 https://...",
    defaults: {
      greeting: "Assalamualaikum / Salam Sejahtera {customer_name},",
      intro:
        "Terima kasih kerana berminat dengan perkhidmatan kami. 🙏\n\nBerikut adalah sebut harga daripada *{company_name}*:",
      closing:
        "Anda boleh klik *Terima* atau *Tolak* terus dari pautan tersebut.\n\nTerima kasih!\n*{company_name}*",
    },
  },
  {
    key: "invoice",
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
    label: "Work Order",
    description: "Hantar work order kepada pelanggan / team",
    placeholders: ["customer_name", "company_name"],
    detailsPreview:
      "📋 *No. Work Order:* WO-0001\n🔨 *Tajuk Kerja:* Pemasangan Lampu\n\n👉 Tekan sini untuk lihat & sahkan work order:\nhttps://...",
    defaults: {
      greeting: "Assalamualaikum / Salam Sejahtera {customer_name},",
      intro:
        "Terima kasih atas kepercayaan anda. 🙏\n\nBerikut adalah Work Order daripada *{company_name}*:",
      closing:
        "Anda boleh klik *Terima* atau *Tolak* terus dari pautan tersebut.\n\nTerima kasih!\n*{company_name}*",
    },
  },
  {
    key: "completion_report",
    label: "Laporan Kerja Siap",
    description: "Hantar completion report kepada pelanggan",
    placeholders: ["customer_name", "company_name"],
    detailsPreview:
      "📋 *No. Laporan:* RPT-0001\n🔨 *Kerja:* Pemasangan Lampu\n📅 *Tarikh Siap:* 28 Apr 2026\n\n👉 Tekan sini untuk *lihat & sahkan* laporan:\nhttps://...",
    defaults: {
      greeting: "Assalamualaikum / Salam Sejahtera {customer_name},",
      intro:
        "Alhamdulillah, kerja telah siap dilaksanakan. 🙏\n\nBerikut adalah Laporan Siap Kerja daripada *{company_name}*:",
      closing:
        "Anda boleh klik *Terima* atau *Tolak* terus dari pautan tersebut.\n\nTerima kasih!\n*{company_name}*",
    },
  },
  {
    key: "receipt",
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

export type TemplatesState = Partial<Record<TemplateKey, Partial<TemplateEditable>>>;

export function getTemplate(state: TemplatesState | null | undefined, key: TemplateKey): TemplateEditable {
  const meta = TEMPLATE_MAP[key];
  const saved = state?.[key] ?? {};
  return {
    greeting: saved.greeting ?? meta.defaults.greeting,
    intro: saved.intro ?? meta.defaults.intro,
    closing: saved.closing ?? meta.defaults.closing,
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
