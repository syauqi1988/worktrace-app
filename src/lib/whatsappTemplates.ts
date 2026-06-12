// Centralised WhatsApp message templates.
// Each template has:
//  - editable parts the user can customise from Settings (greeting, intro, closing)
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
  closing: string; // last line(s) — e.g. "Thank you!"
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
  customer_name: "Customer name",
  company_name: "Your company name",
};

export const TEMPLATES: TemplateMeta[] = [
  {
    key: "quotation",
    label: "Quotation",
    description: "Send quotation to customer via WhatsApp",
    placeholders: ["customer_name", "company_name"],
    detailsPreview:
      "📋 *Quotation No:* QUO-0001\n💰 *Total:* RM 1,500.00\n\nPlease click the link below to *view & confirm* the quotation:\n🔗 https://...",
    defaults: {
      greeting: "Assalamualaikum / Salam Sejahtera {customer_name},",
      intro:
        "Thank you for your interest in our services. 🙏\n\nHere is the quotation from *{company_name}*:",
      closing:
        "You may click *Accept* or *Reject* directly from the link.\n\nThank you!\n*{company_name}*",
    },
  },
  {
    key: "invoice",
    label: "Invoice",
    description: "Send new invoice to customer",
    placeholders: ["customer_name", "company_name"],
    detailsPreview:
      "🧾 *Invoice No:* INV-0001\n💰 *Total:* RM 1,500.00\n📅 *Due Date:* 30 Apr 2026\n\n👉 Tap here to view invoice & submit payment proof:\nhttps://...",
    defaults: {
      greeting: "Assalamualaikum / Salam Sejahtera {customer_name},",
      intro:
        "Thank you for trusting *{company_name}*. 🙏\n\nHere is the invoice for the completed work:",
      closing: "For any questions, please contact us.\n\n*{company_name}*",
    },
  },
  {
    key: "invoice_reminder",
    label: "Invoice Reminder",
    description: "Friendly reminder for unpaid invoices",
    placeholders: ["customer_name", "company_name"],
    detailsPreview:
      "🧾 *Invoice No:* INV-0001\n💰 *Total:* RM 1,500.00\n📅 *Due Date:* 30 Apr 2026\n\n👉 Tap here to view invoice & submit payment proof:\nhttps://...",
    defaults: {
      greeting: "Assalamualaikum / Salam Sejahtera {customer_name},",
      intro:
        "This is a friendly reminder from *{company_name}* regarding the following invoice:",
      closing: "Please assist to settle the payment. Thank you!\n\n*{company_name}*",
    },
  },
  {
    key: "work_order",
    label: "Work Order",
    description: "Send work order to customer / team",
    placeholders: ["customer_name", "company_name"],
    detailsPreview:
      "📋 *Work Order No:* WO-0001\n🔨 *Job Title:* Light Installation\n\n👉 Tap here to view & confirm work order:\nhttps://...",
    defaults: {
      greeting: "Assalamualaikum / Salam Sejahtera {customer_name},",
      intro:
        "Thank you for your trust. 🙏\n\nHere is the Work Order from *{company_name}*:",
      closing:
        "You may click *Accept* or *Reject* directly from the link.\n\nThank you!\n*{company_name}*",
    },
  },
  {
    key: "completion_report",
    label: "Completion Report",
    description: "Send completion report to customer",
    placeholders: ["customer_name", "company_name"],
    detailsPreview:
      "📋 *Report No:* RPT-0001\n🔨 *Job:* Light Installation\n📅 *Completion Date:* 28 Apr 2026\n\n👉 Tap here to *view & confirm* the report:\nhttps://...",
    defaults: {
      greeting: "Assalamualaikum / Salam Sejahtera {customer_name},",
      intro:
        "Alhamdulillah, the work has been completed. 🙏\n\nHere is the Completion Report from *{company_name}*:",
      closing:
        "You may click *Accept* or *Reject* directly from the link.\n\nThank you!\n*{company_name}*",
    },
  },
  {
    key: "receipt",
    label: "Payment Receipt",
    description: "Send receipt after payment is confirmed",
    placeholders: ["customer_name", "company_name"],
    detailsPreview:
      "🧾 *Receipt No:* RCP-0001\n🧾 *Invoice No:* INV-0001\n💰 *Amount Paid:* RM 1,500.00\n📅 *Payment Date:* 28 Apr 2026\n\n👉 Tap here to download receipt:\nhttps://...",
    defaults: {
      greeting: "Assalamualaikum / Salam Sejahtera {customer_name},",
      intro:
        "Thank you for your payment. 🙏✅\n\nHere is the official payment receipt from *{company_name}*:",
      closing:
        "Thank you for choosing our services. 😊\n\n*{company_name}*",
    },
  },
  {
    key: "job_followup",
    label: "Job Follow-up",
    description: "Quick message to follow up on job status",
    placeholders: ["customer_name", "company_name", "job_number"],
    detailsPreview: "(No details block — just your message)",
    defaults: {
      greeting: "Hi {customer_name},",
      intro:
        "I would like to follow up on job {job_number}. Could you confirm the latest status?",
      closing: "Thank you!",
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
    `📋 *Stage ${opts.stageNumber} of ${opts.totalStages}* — ${opts.stageLabel}`,
    `🧾 *Invoice No:* ${opts.invoiceNumber}`,
    `💰 *Stage payment:* RM ${opts.stageAmount.toFixed(2)}`,
    `📊 *Invoice total:* RM ${opts.invoiceTotal.toFixed(2)}`,
    `✅ *Paid so far:* RM ${opts.paidSoFar.toFixed(2)}`,
  ];
  if (opts.dueDate) lines.push(`📅 *Due Date:* ${opts.dueDate}`);
  lines.push('', '👉 Tap to pay / submit payment proof:', opts.payUrl);
  return lines.join('\n');
}
