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
 * Open WhatsApp. Uses https://wa.me/ which opens the native app on mobile
 * if installed, or WhatsApp Web otherwise.
 * Pass an optional pre-opened window (e.g. opened synchronously inside a click
 * handler before async work) to avoid popup blockers.
 */
export function openWhatsApp(
  phone: string | null | undefined,
  text?: string,
  pendingWindow?: Window | null,
) {
  const url = buildWhatsAppUrl(phone, text);

  if (pendingWindow && !pendingWindow.closed) {
    pendingWindow.location.href = url;
    return;
  }
  window.open(url, '_blank');
}
