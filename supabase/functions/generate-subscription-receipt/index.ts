// Generates an official HS Partnership PLT receipt PDF for a successful
// subscription payment, stores it in `subscription-receipts` bucket, inserts
// a row in `subscription_receipts`, and emails it to the user via Resend.
//
// Trigger:
//   POST /functions/v1/generate-subscription-receipt
//   Auth: requires SERVICE ROLE in the Authorization header (called by
//         billplz-callback) OR an admin JWT (to regenerate manually).
//   Body: { user_id: string, billplz_bill_id?: string, amount?: number (MYR),
//           plan?: string, billing_period?: 'monthly'|'yearly',
//           payment_date?: string (ISO), force?: boolean, regenerate_id?: uuid }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1';
import { HS_COMPANY, formatRM, planLabel } from '../_shared/hsCompany.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@worktrace.my';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

async function isCallerAuthorized(req: Request): Promise<boolean> {
  const auth = req.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return false;
  const token = auth.replace('Bearer ', '');
  if (token === SERVICE_ROLE) return true;
  // Admin JWT
  const userClient = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });
  const { data: { user } } = await userClient.auth.getUser(token);
  if (!user) return false;
  const { data: adm } = await admin
    .from('admin_users')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();
  return !!adm;
}

async function buildPdf(args: {
  receiptNumber: string;
  paymentDate: Date;
  userName: string;
  userEmail: string;
  plan: string;
  billing: string;
  amount: number;
  billId: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.06, 0.09, 0.16);
  const muted = rgb(0.39, 0.45, 0.55);
  const accent = rgb(0.15, 0.39, 0.92);
  const line = rgb(0.88, 0.91, 0.95);

  const M = 48;
  let y = height - M;

  // Optional logo
  if (HS_COMPANY.logoUrl) {
    try {
      const r = await fetch(HS_COMPANY.logoUrl);
      const bytes = new Uint8Array(await r.arrayBuffer());
      const img = HS_COMPANY.logoUrl.toLowerCase().endsWith('.png')
        ? await pdf.embedPng(bytes)
        : await pdf.embedJpg(bytes);
      const scaled = img.scaleToFit(120, 60);
      page.drawImage(img, { x: M, y: y - scaled.height, width: scaled.width, height: scaled.height });
    } catch (_) { /* ignore logo failure */ }
  }

  // Title
  page.drawText('OFFICIAL RECEIPT', { x: width - M - bold.widthOfTextAtSize('OFFICIAL RECEIPT', 18), y: y - 8, size: 18, font: bold, color: accent });
  y -= 30;
  const t2 = `No: ${args.receiptNumber}`;
  page.drawText(t2, { x: width - M - font.widthOfTextAtSize(t2, 10), y: y - 6, size: 10, font, color: muted });
  y -= 14;
  const t3 = `Date: ${args.paymentDate.toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: '2-digit' })}`;
  page.drawText(t3, { x: width - M - font.widthOfTextAtSize(t3, 10), y: y - 6, size: 10, font, color: muted });

  // Company block (left)
  let cy = height - M - 6;
  page.drawText(HS_COMPANY.name, { x: M, y: cy, size: 13, font: bold, color: ink });
  cy -= 14;
  page.drawText(`Reg. No: ${HS_COMPANY.ssm}`, { x: M, y: cy, size: 9, font, color: muted });
  cy -= 12;
  // Wrap address
  const addr = HS_COMPANY.address;
  const maxAddrW = 280;
  const words = addr.split(' ');
  let lineStr = '';
  for (const w of words) {
    const test = lineStr ? lineStr + ' ' + w : w;
    if (font.widthOfTextAtSize(test, 9) > maxAddrW) {
      page.drawText(lineStr, { x: M, y: cy, size: 9, font, color: muted }); cy -= 11;
      lineStr = w;
    } else lineStr = test;
  }
  if (lineStr) { page.drawText(lineStr, { x: M, y: cy, size: 9, font, color: muted }); cy -= 11; }
  page.drawText(`Phone: ${HS_COMPANY.phone}  •  Email: ${HS_COMPANY.email}`, { x: M, y: cy, size: 9, font, color: muted });

  // Divider
  y = Math.min(cy, y) - 24;
  page.drawLine({ start: { x: M, y }, end: { x: width - M, y }, thickness: 1, color: line });
  y -= 22;

  // Billed to
  page.drawText('BILLED TO', { x: M, y, size: 10, font: bold, color: muted });
  y -= 14;
  page.drawText(args.userName || args.userEmail, { x: M, y, size: 12, font: bold, color: ink });
  y -= 14;
  page.drawText(args.userEmail, { x: M, y, size: 10, font, color: muted });
  y -= 26;

  // Items table header
  const tableTop = y;
  page.drawRectangle({ x: M, y: y - 22, width: width - 2 * M, height: 22, color: rgb(0.96, 0.97, 0.99) });
  page.drawText('DESCRIPTION', { x: M + 12, y: y - 14, size: 9, font: bold, color: muted });
  page.drawText('AMOUNT (MYR)', { x: width - M - 110, y: y - 14, size: 9, font: bold, color: muted });
  y -= 22;

  // Row
  y -= 18;
  page.drawText(planLabel(args.plan, args.billing), { x: M + 12, y, size: 11, font, color: ink });
  const amtStr = formatRM(args.amount);
  page.drawText(amtStr, { x: width - M - 12 - bold.widthOfTextAtSize(amtStr, 11), y, size: 11, font: bold, color: ink });
  y -= 12;
  if (args.billId) {
    page.drawText(`Ref: BillPlz ${args.billId}`, { x: M + 12, y, size: 8, font, color: muted });
    y -= 10;
  }
  y -= 10;
  page.drawLine({ start: { x: M, y }, end: { x: width - M, y }, thickness: 0.5, color: line });

  // Totals
  y -= 24;
  const totalLabel = 'TOTAL PAID';
  page.drawText(totalLabel, { x: width - M - 220, y, size: 11, font: bold, color: ink });
  page.drawText(amtStr, { x: width - M - bold.widthOfTextAtSize(amtStr, 14), y: y - 2, size: 14, font: bold, color: accent });

  // Status pill
  y -= 36;
  const pillText = 'PAID';
  const pw = bold.widthOfTextAtSize(pillText, 10) + 18;
  page.drawRectangle({ x: M, y: y - 4, width: pw, height: 18, color: rgb(0.85, 0.95, 0.87) });
  page.drawText(pillText, { x: M + 9, y: y, size: 10, font: bold, color: rgb(0.10, 0.45, 0.20) });

  // Footer
  const footer = 'This is a computer-generated receipt and does not require a signature.';
  page.drawText(footer, { x: M, y: M, size: 8, font, color: muted });
  page.drawText(HS_COMPANY.name + ' • ' + HS_COMPANY.email, {
    x: width - M - font.widthOfTextAtSize(HS_COMPANY.name + ' • ' + HS_COMPANY.email, 8),
    y: M, size: 8, font, color: muted,
  });

  return await pdf.save();
}

function htmlEmail(opts: { name: string; receiptNumber: string; amount: number; plan: string; billing: string }) {
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;">
<table width="600" align="center" style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;">
<tr><td>
<h2 style="margin:0 0 8px;color:#0f172a;">Receipt ${opts.receiptNumber}</h2>
<p style="color:#334155;margin:0 0 16px;">Hi ${opts.name || 'there'}, thank you for your subscription payment. Your official receipt is attached.</p>
<table cellpadding="6" style="font-size:14px;color:#0f172a;">
<tr><td style="color:#64748b;">Plan</td><td><b>${planLabel(opts.plan, opts.billing)}</b></td></tr>
<tr><td style="color:#64748b;">Amount</td><td><b>${formatRM(opts.amount)}</b></td></tr>
</table>
<p style="color:#64748b;font-size:12px;margin-top:16px;">Issued by ${HS_COMPANY.name} (Reg. No ${HS_COMPANY.ssm}).<br/>For queries, contact ${HS_COMPANY.email}.</p>
</td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!await isCallerAuthorized(req)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const userId: string = body.user_id;
    const billId: string = body.billplz_bill_id || '';
    let plan: string = body.plan || 'pro';
    let billing: string = body.billing_period === 'yearly' ? 'yearly' : 'monthly';
    let amount: number = Number(body.amount ?? 0); // MYR
    const force: boolean = !!body.force;
    const regenerateId: string | undefined = body.regenerate_id;
    const paymentDate = body.payment_date ? new Date(body.payment_date) : new Date();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'user_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Dedupe by bill id
    if (billId && !force && !regenerateId) {
      const { data: existing } = await admin
        .from('subscription_receipts')
        .select('id, pdf_path, receipt_number')
        .eq('billplz_bill_id', billId)
        .maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ ok: true, deduped: true, id: existing.id, receipt_number: existing.receipt_number }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Resolve user profile/email
    const { data: profile } = await admin.from('profiles').select('id, email, company_name').eq('id', userId).single();
    const { data: userResp } = await admin.auth.admin.getUserById(userId);
    const email = profile?.email || userResp?.user?.email || '';
    const name = profile?.company_name || (userResp?.user?.user_metadata as any)?.full_name || email;

    if (!email) {
      return new Response(JSON.stringify({ error: 'User email unavailable' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Determine receipt number: reuse for regenerate, else new
    let receiptNumber: string;
    let recordId: string | null = null;
    if (regenerateId) {
      const { data: rec } = await admin.from('subscription_receipts').select('*').eq('id', regenerateId).single();
      if (!rec) return new Response(JSON.stringify({ error: 'receipt not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      receiptNumber = rec.receipt_number;
      recordId = rec.id;
      plan = rec.plan; billing = rec.billing_period; amount = Number(rec.amount);
    } else {
      const { data: numData, error: numErr } = await admin.rpc('next_subscription_receipt_number');
      if (numErr || !numData) throw numErr || new Error('failed to generate receipt number');
      receiptNumber = numData as string;
    }

    // Build PDF
    const pdfBytes = await buildPdf({
      receiptNumber, paymentDate, userName: name, userEmail: email,
      plan, billing, amount, billId,
    });

    // Upload to storage at <user_id>/<receipt_number>.pdf
    const path = `${userId}/${receiptNumber}.pdf`;
    const { error: upErr } = await admin.storage
      .from('subscription-receipts')
      .upload(path, pdfBytes, { contentType: 'application/pdf', upsert: true });
    if (upErr) throw upErr;

    // Insert/update row
    const snapshot = HS_COMPANY;
    if (recordId) {
      await admin.from('subscription_receipts').update({
        pdf_path: path, status: 'updated', company_snapshot: snapshot,
      }).eq('id', recordId);
    } else {
      const { data: ins, error: insErr } = await admin.from('subscription_receipts').insert({
        user_id: userId, user_email: email, user_name: name,
        billplz_bill_id: billId || null,
        receipt_number: receiptNumber,
        plan, billing_period: billing, amount,
        payment_date: paymentDate.toISOString(),
        pdf_path: path, status: 'issued',
        company_snapshot: snapshot,
      }).select('id').single();
      if (insErr) throw insErr;
      recordId = ins.id;
    }

    // Email via Resend (with PDF attachment)
    let emailed = false;
    if (RESEND_API_KEY) {
      const b64 = btoa(String.fromCharCode(...pdfBytes));
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: `${HS_COMPANY.name} <${FROM_EMAIL}>`,
          to: [email],
          subject: `Your Official Receipt ${receiptNumber} — ${HS_COMPANY.name}`,
          html: htmlEmail({ name, receiptNumber, amount, plan, billing }),
          attachments: [{ filename: `${receiptNumber}.pdf`, content: b64 }],
        }),
      });
      emailed = res.ok;
      if (!res.ok) console.error('Receipt email failed:', await res.text());
    }
    if (emailed) {
      await admin.from('subscription_receipts').update({ emailed_at: new Date().toISOString() }).eq('id', recordId);
    }

    return new Response(JSON.stringify({ ok: true, id: recordId, receipt_number: receiptNumber, path, emailed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('generate-subscription-receipt error:', err);
    return new Response(JSON.stringify({ error: String((err as Error)?.message || err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
