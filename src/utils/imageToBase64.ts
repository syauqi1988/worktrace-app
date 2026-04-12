/**
 * Convert an image URL to a base64 data URI.
 * @react-pdf/renderer only supports PNG and JPEG.
 * This function re-encodes any image (including GIF, WebP, etc.) to PNG via canvas.
 */
export const imageUrlToBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url, { mode: 'cors', headers: { 'Cache-Control': 'no-cache' } });
    const blob = await response.blob();
    const originalType = blob.type; // e.g. "image/gif", "image/png", "image/jpeg"

    // If already PNG or JPEG, return as-is via FileReader
    if (originalType === 'image/png' || originalType === 'image/jpeg') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    // For GIF, WebP, SVG, etc. — re-encode to PNG via canvas
    const imageBitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(imageBitmap, 0, 0);
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Failed to convert image:', error);
    return '';
  }
};
