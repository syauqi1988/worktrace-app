// Centralised WhatsApp link helpers.
// Goal: open the native WhatsApp app on mobile instead of the
// api.whatsapp.com browser splash page.

function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Build a WhatsApp deep link.
 * - Mobile: whatsapp://send?...  (opens the WhatsApp app directly)
 * - Desktop: https://wa.me/...   (opens WhatsApp Web / Desktop app)
 */
export function buildWhatsAppUrl(phone: string | null | undefined, text?: string): string {
  const cleanPhone = (phone || '').replace(/[^\d]/g, '');
  const encoded = text ? encodeURIComponent(text) : '';

  if (isMobile()) {
    const params: string[] = [];
    if (cleanPhone) params.push(`phone=${cleanPhone}`);
    if (encoded) params.push(`text=${encoded}`);
    return `whatsapp://send${params.length ? '?' + params.join('&') : ''}`;
  }

  // Desktop fallback
  const base = cleanPhone ? `https://wa.me/${cleanPhone}` : `https://wa.me/`;
  return encoded ? `${base}?text=${encoded}` : base;
}

/**
 * Open WhatsApp. On mobile uses the whatsapp:// scheme so the app opens directly.
 * Pass an optional pre-opened window (e.g. opened synchronously inside a click
 * handler before async work) to avoid popup blockers.
 */
export function openWhatsApp(
  phone: string | null | undefined,
  text?: string,
  pendingWindow?: Window | null,
) {
  const url = buildWhatsAppUrl(phone, text);

  if (isMobile()) {
    // Close any pre-opened tab — we want the app, not a browser tab.
    if (pendingWindow && !pendingWindow.closed) {
      try { pendingWindow.close(); } catch { /* noop */ }
    }
    // Direct navigation triggers the app handler reliably.
    window.location.href = url;
    return;
  }

  if (pendingWindow && !pendingWindow.closed) {
    pendingWindow.location.href = url;
    return;
  }
  window.open(url, '_blank');
}
