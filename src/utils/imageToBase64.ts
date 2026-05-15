/**
 * Convert an image URL to a base64 data URI.
 * @react-pdf/renderer only supports PNG and JPEG, so we re-encode anything else (GIF, WebP, SVG)
 * to PNG via canvas. We avoid sending custom headers so the browser does not trigger a CORS
 * preflight (Supabase Storage public buckets do not respond to OPTIONS for arbitrary headers).
 */
export const imageUrlToBase64 = async (url: string): Promise<string> => {
  if (!url) return '';
  // Cache-bust via query param instead of Cache-Control header (no preflight).
  const busted = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;

  // Strategy 1: fetch + FileReader / canvas re-encode.
  try {
    const response = await fetch(busted, { mode: 'cors' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const type = blob.type || '';

    if (type === 'image/png' || type === 'image/jpeg') {
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    // Re-encode GIF / WebP / SVG / unknown to PNG.
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('imageUrlToBase64 fetch path failed, falling back to <img> loader:', err);
  }

  // Strategy 2: <img crossOrigin="anonymous"> + canvas. Works when fetch is blocked
  // but the image itself is served with permissive CORS (Supabase public buckets are).
  try {
    return await new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext('2d')!.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch (e) { reject(e); }
      };
      img.onerror = () => reject(new Error('image load failed'));
      img.src = busted;
    });
  } catch (err) {
    console.error('imageUrlToBase64 failed completely:', err);
    return '';
  }
};
