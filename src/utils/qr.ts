import QRCode from 'qrcode';

/**
 * Generates an 8-character unique alphanumeric slug (e.g., k8F2pQ9x).
 * Uses crypto.getRandomValues for cryptographic randomness.
 */
export function generateSlug(length = 8): string {
  const chars = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

/**
 * Generates a unique QR ID in the format QR_xxxxxxxxx.
 */
export function generateQRId(): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let result = '';
  const randomValues = new Uint8Array(9);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < 9; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return `QR_${result}`;
}

/**
 * Sanitizes an app/business name to create a clean, human-readable file name for download.
 * e.g., "Barbearia Jeann" -> "barbearia-jeann-qrcode.png" or ".svg"
 */
export function getQRCodeFilename(name: string, ext: 'png' | 'svg' = 'png'): string {
  const sanitized = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${sanitized || 'jzn-code'}-qrcode.${ext}`;
}

/**
 * Formats a destination URL visually for clean display on cards (e.g., instagram.com/...)
 * NEVER alters the real URL stored in Firestore.
 */
export function formatDisplayUrl(rawUrl: string, maxLength = 32): string {
  if (!rawUrl) return '';
  try {
    const normalized = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
    const urlObj = new URL(normalized);
    const host = urlObj.hostname.replace(/^www\./i, '');
    let path = urlObj.pathname;
    if (path === '/') path = '';
    const query = urlObj.search ? '?...' : '';
    const full = `${host}${path}${query}`;
    if (full.length > maxLength) {
      return `${full.slice(0, maxLength - 3)}...`;
    }
    return full;
  } catch {
    const stripped = rawUrl.replace(/^https?:\/\/(www\.)?/i, '');
    if (stripped.length > maxLength) {
      return `${stripped.slice(0, maxLength - 3)}...`;
    }
    return stripped;
  }
}

/**
 * Ensures a valid URL with http/https prefix.
 */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Generates high-resolution PNG data URL for the QR code (1024x1024).
 */
export async function generateQRCodeDataUrl(text: string, width = 1024): Promise<string> {
  return QRCode.toDataURL(text, {
    width,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#0a0d14',
      light: '#ffffff',
    },
  });
}

/**
 * Generates real vector SVG string for maximum printing quality.
 */
export async function generateQRCodeSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: 'svg',
    margin: 2,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#0a0d14',
      light: '#ffffff',
    },
  });
}

/**
 * Downloads a data URL as a file on user device.
 */
export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Downloads an SVG string as a vector file on user device.
 */
export function downloadSvg(svgString: string, filename: string) {
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
