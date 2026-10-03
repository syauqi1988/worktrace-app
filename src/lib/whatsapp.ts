// Centralised WhatsApp link helpers.
// Goal: open WhatsApp reliably on all platforms (mobile and desktop)

/**
 * Build a WhatsApp deep link.
 * Uses https://wa.me/ for all platforms as it's more reliable and:
 * - Opens the native WhatsApp app on mobile if installed
 * - Falls back to WhatsApp Web on desktop or if app not installed
 * - Works consistently across iOS, Android, and desktop
 */
export function buildWhatsAppUrl(phone: string | null | undefined, text?: string): string {
  const cleanPhone = (phone || '').replace(/[^\d]/g, '');
  const encoded = text ? encodeURIComponent(text) : '';

  const base = cleanPhone ? `https://wa.me/${cleanPhone}` : `https://wa.me/`;
  return encoded ? `${base}?text=${encoded}` : base;
}

/**
 * Share using the device's standard share sheet (WhatsApp, Telegram, Gmail,
 * Messages, Quick Share, etc). Falls back to WhatsApp link when the browser
 * has no share sheet (most desktop browsers).
 */
export function openWhatsApp(
  phone: string | null | undefined,
  text?: string,
  pendingWindow?: Window | null,
) {
  const fallback = () => {
    const url = buildWhatsAppUrl(phone, text);
    if (pendingWindow && !pendingWindow.closed) { pendingWindow.location.href = url; return; }
    window.open(url, '_blank');
  };
  const nav: any = typeof navigator !== 'undefined' ? navigator : null;
  if (nav?.share && text) {
    if (pendingWindow && !pendingWindow.closed) { try { pendingWindow.close(); } catch { /* ignore */ } }
    nav.share({ text }).catch((err: any) => {
      if (err?.name === 'AbortError') return; // user closed the sheet
      const url = buildWhatsAppUrl(phone, text);
      window.open(url, '_blank');
    });
    return;
  }
  fallback();
}
