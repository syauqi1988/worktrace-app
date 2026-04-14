// IMPORTANT: Before going live,
// add worktrace.my as a verified domain
// in your Resend dashboard at resend.com
// This allows sending FROM noreply@worktrace.my
// Without verification, use the default Resend test domain.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPPORT_EMAIL = Deno.env.get("SUPPORT_EMAIL") || "customerservice@worktrace.my";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "noreply@worktrace.my";

const CATEGORY_LABELS: Record<string, string> = {
  bug: "🐛 Bug / Ralat Teknikal",
  billing: "💳 Bil & Pembayaran",
  feature: "💡 Cadangan Ciri Baru",
  account: "👤 Masalah Akaun",
  general: "❓ Soalan Am",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "🟢 Rendah",
  normal: "🔵 Normal",
  high: "🟡 Tinggi",
  urgent: "🔴 Urgent",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "#22c55e",
  normal: "#3b82f6",
  high: "#eab308",
  urgent: "#ef4444",
};

function buildAdminEmailHtml(data: any): string {
  const catLabel = CATEGORY_LABELS[data.category] || data.category;
  const priLabel = PRIORITY_LABELS[data.priority] || data.priority;
  const priColor = PRIORITY_COLORS[data.priority] || "#3b82f6";

  return `<!DOCTYPE html>
<html lang="ms">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
  <tr><td style="background:#2563eb;padding:24px 32px;">
    <h1 style="margin:0;color:#ffffff;font-size:20px;">🎫 Tiket Sokongan Baru</h1>
  </td></tr>
  <tr><td style="padding:24px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;width:140px;">No. Tiket</td>
        <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;font-weight:600;color:#0f172a;">${data.ticket_number}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;">Pengguna</td>
        <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#0f172a;">${data.user_name}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;">Emel</td>
        <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#0f172a;">${data.user_email}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;">Pelan</td>
        <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#0f172a;text-transform:capitalize;">${data.user_plan}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;">Kategori</td>
        <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#0f172a;">${catLabel}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;">Keutamaan</td>
        <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;">
          <span style="background:${priColor}15;color:${priColor};padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;">${priLabel}</span>
        </td>
      </tr>
    </table>
    <div style="margin-bottom:16px;">
      <p style="margin:0 0 6px;font-size:13px;color:#64748b;font-weight:600;">Subjek:</p>
      <p style="margin:0;font-size:15px;color:#0f172a;font-weight:600;">${data.subject}</p>
    </div>
    <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:20px;">
      <p style="margin:0 0 6px;font-size:13px;color:#64748b;font-weight:600;">Penerangan:</p>
      <p style="margin:0;font-size:14px;color:#334155;line-height:1.6;white-space:pre-wrap;">${data.description}</p>
    </div>
    <div style="background:#eff6ff;border-radius:8px;padding:12px 16px;margin-bottom:8px;">
      <p style="margin:0;font-size:12px;color:#1e40af;">
        <strong>Ticket ID (untuk SQL):</strong><br/>${data.ticket_id}
      </p>
    </div>
  </td></tr>
  <tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">WorkTrace Support System</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function buildUserEmailHtml(data: any): string {
  return `<!DOCTYPE html>
<html lang="ms">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
  <tr><td style="background:#2563eb;padding:24px 32px;">
    <h1 style="margin:0;color:#ffffff;font-size:20px;">WorkTrace</h1>
  </td></tr>
  <tr><td style="padding:32px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:56px;height:56px;background:#f0fdf4;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
        <span style="font-size:28px;">✅</span>
      </div>
      <h2 style="margin:0;font-size:18px;color:#0f172a;">Tiket Berjaya Dihantar!</h2>
    </div>
    <p style="font-size:14px;color:#334155;line-height:1.6;">
      Terima kasih kerana menghubungi kami. Tiket sokongan anda telah berjaya didaftarkan.
    </p>
    <div style="background:#f8fafc;border-radius:8px;padding:20px;margin:20px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;color:#64748b;font-size:13px;width:130px;">No. Tiket</td>
          <td style="padding:6px 0;font-size:14px;font-weight:600;color:#2563eb;">${data.ticket_number}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b;font-size:13px;">Subjek</td>
          <td style="padding:6px 0;font-size:14px;color:#0f172a;">${data.subject}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b;font-size:13px;">Kategori</td>
          <td style="padding:6px 0;font-size:14px;color:#0f172a;">${CATEGORY_LABELS[data.category] || data.category}</td>
        </tr>
      </table>
    </div>
    <h3 style="font-size:14px;color:#0f172a;margin:24px 0 12px;">Apa yang seterusnya?</h3>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:8px 0;vertical-align:top;width:28px;"><span style="font-size:16px;">📩</span></td>
        <td style="padding:8px 0;font-size:13px;color:#334155;">Tiket anda telah diterima oleh pasukan kami</td>
      </tr>
      <tr>
        <td style="padding:8px 0;vertical-align:top;width:28px;"><span style="font-size:16px;">🔍</span></td>
        <td style="padding:8px 0;font-size:13px;color:#334155;">Kami akan semak dan balas dalam <strong>24 jam</strong> (hari bekerja)</td>
      </tr>
      <tr>
        <td style="padding:8px 0;vertical-align:top;width:28px;"><span style="font-size:16px;">💬</span></td>
        <td style="padding:8px 0;font-size:13px;color:#334155;">Anda boleh menambah maklumat di halaman tiket dalam aplikasi</td>
      </tr>
    </table>
  </td></tr>
  <tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
      © ${new Date().getFullYear()} WorkTrace. Emel ini dihantar secara automatik.
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const data = await req.json();
    const { ticket_number, ticket_id, user_email, user_name, user_plan, category, priority, subject, description } = data;

    if (!ticket_number || !user_email || !subject) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send admin notification email
    const adminRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `WorkTrace Support <${FROM_EMAIL}>`,
        to: [SUPPORT_EMAIL],
        subject: `[${ticket_number}] ${subject} — ${PRIORITY_LABELS[priority] || priority}`,
        html: buildAdminEmailHtml({ ticket_number, ticket_id, user_email, user_name, user_plan, category, priority, subject, description }),
      }),
    });

    if (!adminRes.ok) {
      const errText = await adminRes.text();
      console.error("Admin email failed:", errText);
    }

    // Send user confirmation email
    const userRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `WorkTrace <${FROM_EMAIL}>`,
        to: [user_email],
        subject: `Tiket ${ticket_number} — Pengesahan Penerimaan`,
        html: buildUserEmailHtml({ ticket_number, subject, category }),
      }),
    });

    if (!userRes.ok) {
      const errText = await userRes.text();
      console.error("User email failed:", errText);
    }

    return new Response(
      JSON.stringify({ success: true, admin_sent: adminRes.ok, user_sent: userRes.ok }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-ticket-email error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
