// Stamps the approval-link PDF with an "APPROVED" or "REJECTED" mark and the
// customer's response timestamp, re-uploads it, and updates the approval row's
// pdf_url so the link the customer (and contractor) opens shows the stamped PDF.
//
// POST /functions/v1/stamp-approval-pdf
// Body: { token: string }
// Auth: none (uses token to look up approval row; service role to write).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PDFDocument, StandardFonts, rgb, degrees } from 'https://esm.sh/pdf-lib@1.17.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

const BUCKET_BY_TYPE: Record<string, string> = {
  quotation: 'quotation-pdfs',
  work_order: 'work-order-pdfs',
  completion_report: 'completion-report-pdfs',
  variation_order: 'vo-pdfs',
};

function safeName(s: string) {
  return (s || 'document').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'document';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { token } = await req.json().catch(() => ({}));
    if (!token || typeof token !== 'string') {
      return new Response(JSON.stringify({ error: 'token required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: approval, error: aErr } = await admin
      .from('customer_approvals')
      .select('id, user_id, document_id, document_type, pdf_url, action, reason, responded_at, customer_name, stamped_at, stamped_pdf_url')
      .eq('token', token)
      .maybeSingle();

    if (aErr || !approval) {
      return new Response(JSON.stringify({ error: 'approval not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!approval.action || !approval.responded_at) {
      return new Response(JSON.stringify({ error: 'approval not yet responded' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!approval.pdf_url) {
      return new Response(JSON.stringify({ error: 'no pdf to stamp' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Idempotency guard — return existing stamped PDF if already produced.
    if (approval.stamped_at && approval.stamped_pdf_url) {
      return new Response(JSON.stringify({ ok: true, pdf_url: approval.stamped_pdf_url, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    const bucket = BUCKET_BY_TYPE[approval.document_type];
    if (!bucket) {
      return new Response(JSON.stringify({ error: 'unsupported document type' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Download current PDF (signed URL — fetchable without auth)
    const pdfResp = await fetch(approval.pdf_url);
    if (!pdfResp.ok) throw new Error(`failed to fetch source pdf (${pdfResp.status})`);
    const srcBytes = new Uint8Array(await pdfResp.arrayBuffer());

    const pdf = await PDFDocument.load(srcBytes);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const reg = await pdf.embedFont(StandardFonts.Helvetica);

    const accepted = approval.action === 'accepted';
    const stampColor = accepted ? rgb(0.10, 0.55, 0.25) : rgb(0.80, 0.15, 0.15);
    const bgColor = accepted ? rgb(0.90, 0.97, 0.92) : rgb(0.99, 0.92, 0.92);
    const title = accepted ? 'APPROVED BY CUSTOMER' : 'REJECTED BY CUSTOMER';
    const respondedAt = new Date(approval.responded_at);
    const tsStr = respondedAt.toLocaleString('en-MY', {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
      timeZone: 'Asia/Kuala_Lumpur',
    }) + ' (MYT)';
    const nameStr = approval.customer_name ? `By: ${approval.customer_name}` : '';

    const pages = pdf.getPages();
    pages.forEach((page, idx) => {
      const { width, height } = page.getSize();

      // First page: prominent stamp box top-right
      if (idx === 0) {
        const boxW = 220;
        const boxH = 64;
        const x = width - boxW - 24;
        const y = height - boxH - 24;
        page.drawRectangle({
          x, y, width: boxW, height: boxH,
          color: bgColor,
          borderColor: stampColor,
          borderWidth: 1.5,
          opacity: 0.95,
          borderOpacity: 1,
        });
        page.drawText(title, {
          x: x + 10, y: y + boxH - 18,
          size: 11, font: bold, color: stampColor,
        });
        page.drawText(tsStr, {
          x: x + 10, y: y + boxH - 34,
          size: 9, font: reg, color: stampColor,
        });
        if (nameStr) {
          page.drawText(nameStr, {
            x: x + 10, y: y + boxH - 48,
            size: 8, font: reg, color: stampColor,
          });
        }
        page.drawText('Digitally confirmed via WorkTrace approval link.', {
          x: x + 10, y: y + 8,
          size: 6.5, font: reg, color: stampColor,
        });

        // Diagonal watermark behind content
        const wmSize = 60;
        const wmText = accepted ? 'APPROVED' : 'REJECTED';
        const wmW = bold.widthOfTextAtSize(wmText, wmSize);
        page.drawText(wmText, {
          x: width / 2 - wmW / 2 + 80,
          y: height / 2 - 80,
          size: wmSize, font: bold,
          color: stampColor,
          opacity: 0.08,
          rotate: degrees(-30),
        });
      }

      // Every page: small footer line
      const footer = `${title} — ${tsStr}`;
      const fw = reg.widthOfTextAtSize(footer, 7);
      page.drawText(footer, {
        x: width - fw - 24, y: 12,
        size: 7, font: reg, color: stampColor,
      });
    });

    const stampedBytes = await pdf.save();

    // Deterministic path + upsert prevents unbounded storage growth.
    const filePath = `${approval.user_id}/approvals/${approval.document_id}-stamped-${safeName(approval.action)}.pdf`;
    const { error: upErr } = await admin.storage
      .from(bucket)
      .upload(filePath, stampedBytes, { contentType: 'application/pdf', upsert: true });
    if (upErr) throw upErr;

    const { data: signed, error: signErr } = await admin.storage
      .from(bucket)
      .createSignedUrl(filePath, 60 * 60 * 24 * 365);
    if (signErr || !signed?.signedUrl) throw signErr || new Error('failed to sign url');

    await admin
      .from('customer_approvals')
      .update({ pdf_url: signed.signedUrl, stamped_at: new Date().toISOString(), stamped_pdf_url: signed.signedUrl })
      .eq('id', approval.id);



    if (approval.document_type === 'variation_order') {
      await admin
        .from('variation_orders')
        .update({ pdf_url: signed.signedUrl })
        .eq('id', approval.document_id);
    }

    return new Response(JSON.stringify({ ok: true, pdf_url: signed.signedUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('stamp-approval-pdf error:', err);
    return new Response(JSON.stringify({ error: String((err as Error)?.message || err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
