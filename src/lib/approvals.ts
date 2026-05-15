import { supabase } from '@/integrations/supabase/client';

/**
 * Generates a 64-char hex token client-side using crypto.getRandomValues.
 * Matches the format produced by the DB's generate_approval_token() function.
 */
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export type ApprovalDocType = 'quotation' | 'work_order' | 'completion_report' | 'variation_order';

export type ApprovalPdfBucket = 'quotation-pdfs' | 'work-order-pdfs' | 'completion-report-pdfs' | 'vo-pdfs';

const safePdfName = (name: string) => name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'document';

/**
 * Stores each approval-link PDF at a unique path so customers never see an older cached PDF.
 */
export async function uploadApprovalPdf(args: {
  bucket: ApprovalPdfBucket;
  userId: string;
  documentId: string;
  documentNumber: string;
  blob: Blob;
}): Promise<string> {
  const fileName = `${args.userId}/approvals/${args.documentId}-${Date.now()}-${safePdfName(args.documentNumber)}.pdf`;
  const { error } = await supabase.storage.from(args.bucket).upload(fileName, args.blob, {
    contentType: 'application/pdf',
    upsert: false,
  });
  if (error) throw error;

  const { data, error: signedError } = await supabase.storage.from(args.bucket).createSignedUrl(fileName, 60 * 60 * 24 * 365);
  if (signedError) throw signedError;
  return data?.signedUrl ?? '';
}

interface CreateApprovalArgs {
  userId: string;
  documentId: string;
  documentType: ApprovalDocType;
  customerName?: string | null;
  customerEmail?: string | null;
  pdfUrl?: string | null;
  expiresInDays?: number;
}

/**
 * Returns the existing pending approval token for a document, or creates a new one.
 * Reuses the row if no action has been taken so the same link keeps working.
 */
export async function getOrCreateApprovalToken(args: CreateApprovalArgs): Promise<string> {
  const existing = await supabase
    .from('customer_approvals')
    .select('token, action, expires_at')
    .eq('document_id', args.documentId)
    .eq('document_type', args.documentType)
    .eq('user_id', args.userId)
    .is('action', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing.data?.token) {
    const stillValid = !existing.data.expires_at || new Date(existing.data.expires_at) > new Date();
    if (stillValid) {
      // refresh pdf_url if provided
      if (args.pdfUrl) {
        await supabase.from('customer_approvals').update({ pdf_url: args.pdfUrl }).eq('token', existing.data.token);
      }
      return existing.data.token;
    }
  }

  const token = generateToken();
  const expiresAt = args.expiresInDays
    ? new Date(Date.now() + args.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { error } = await supabase.from('customer_approvals').insert({
    user_id: args.userId,
    document_id: args.documentId,
    document_type: args.documentType,
    token,
    customer_name: args.customerName ?? null,
    customer_email: args.customerEmail ?? null,
    pdf_url: args.pdfUrl ?? null,
    expires_at: expiresAt,
  });
  if (error) throw error;
  return token;
}

interface CreateProofTokenArgs {
  userId: string;
  invoiceId: string;
  customerName?: string | null;
}

/**
 * Returns the existing payment-proof token for an invoice, or creates one.
 * Token is also stored on invoices.payment_proof_token for quick access.
 */
export async function getOrCreatePaymentProofToken(args: CreateProofTokenArgs): Promise<string> {
  const inv = await supabase
    .from('invoices')
    .select('payment_proof_token')
    .eq('id', args.invoiceId)
    .eq('user_id', args.userId)
    .single();

  if (inv.data?.payment_proof_token) return inv.data.payment_proof_token;

  const token = generateToken();
  const { error: insertErr } = await supabase.from('payment_proofs').insert({
    user_id: args.userId,
    invoice_id: args.invoiceId,
    token,
    status: 'pending',
  });
  if (insertErr) throw insertErr;

  await supabase
    .from('invoices')
    .update({ payment_proof_token: token } as any)
    .eq('id', args.invoiceId);

  return token;
}

export function buildPublicApprovalUrl(token: string): string {
  return `${window.location.origin}/public/approval/${token}`;
}

export function buildPublicPaymentProofUrl(token: string): string {
  return `${window.location.origin}/public/payment-proof/${token}`;
}
