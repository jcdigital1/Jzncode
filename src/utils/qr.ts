import QRCode from 'qrcode';

/**
 * Retorna a URL base definitiva e permanente para os QR Codes dinâmicos.
 * Prioridades:
 * 1. Variável de ambiente VITE_APP_URL se configurada (ex: https://jzncodee.vercel.app ou domínio próprio)
 * 2. Em ambiente de produção na Vercel (*.vercel.app) ou domínio customizado (window.location.origin)
 * 3. Se estiver em ambiente local (localhost, 127.0.0.1) ou preview efêmero (run.app, webcontainer),
 *    utiliza obrigatoriamente a URL de produção oficial: https://jzncodee.vercel.app
 */
export function getDynamicQRBaseUrl(): string {
  const envUrl = (((import.meta as any).env?.VITE_APP_URL as string) || '').trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin.replace(/\/+$/, '');
    const hostname = window.location.hostname.toLowerCase();

    const isDevOrPreview =
      hostname.includes('localhost') ||
      hostname.includes('127.0.0.1') ||
      hostname.includes('.run.app') ||
      hostname.includes('webcontainer.io');

    if (!isDevOrPreview && origin && origin !== 'null') {
      return origin;
    }
  }

  return 'https://jzncodee.vercel.app';
}

/**
 * Retorna a URL dinâmica permanente e imutável que deve ser gravada no desenho do QR Code.
 * O QR Code baixado SEMPRE apontará para esta URL.
 * Exemplo: https://jzncodee.vercel.app/q/KysTggnD
 */
export function getDynamicQRUrl(slug: string): string {
  const base = getDynamicQRBaseUrl();
  const cleanSlug = (slug || '').trim();
  return `${base}/q/${cleanSlug}`;
}

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
  const sanitized = (name || '')
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
  const trimmed = (url || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Generates high-resolution PNG data URL for the QR code.
 * When `name` is provided, renders the name visually below the QR reading area
 * in a clean white footer without diminishing the quiet-zone or touching the modules.
 */
export async function generateQRCodeDataUrl(
  text: string,
  name?: string,
  width = 1024
): Promise<string> {
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, text, {
    width,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#0a0d14',
      light: '#ffffff',
    },
  });

  const cleanName = (name || '').trim();
  if (!cleanName) {
    return qrCanvas.toDataURL('image/png');
  }

  // Calculate proportional footer height (~12% of QR width)
  const footerHeight = Math.max(48, Math.round(width * 0.12));
  const totalWidth = width;
  const totalHeight = width + footerHeight;

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = totalWidth;
  finalCanvas.height = totalHeight;
  const ctx = finalCanvas.getContext('2d');
  if (!ctx) {
    return qrCanvas.toDataURL('image/png');
  }

  // 1. Crisp white background for the whole image
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, totalWidth, totalHeight);

  // 2. Draw QR code on top (quiet zone 100% intact)
  ctx.drawImage(qrCanvas, 0, 0, totalWidth, width);

  // 3. Draw subtle separator line
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = Math.max(1, Math.round(width * 0.0015));
  ctx.beginPath();
  const lineMargin = Math.round(width * 0.08);
  ctx.moveTo(lineMargin, width);
  ctx.lineTo(totalWidth - lineMargin, width);
  ctx.stroke();

  // 4. Draw name in the footer
  // Typography: modern, bold, dark black (#0f172a), centered
  const baseFontSize = Math.round(footerHeight * 0.38);
  let fontSize = baseFontSize;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#0f172a';

  ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  const maxTextWidth = totalWidth - (lineMargin * 1.5);
  let textWidth = ctx.measureText(cleanName).width;

  while (textWidth > maxTextWidth && fontSize > Math.round(baseFontSize * 0.55)) {
    fontSize -= 2;
    ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    textWidth = ctx.measureText(cleanName).width;
  }

  const textY = width + (footerHeight / 2);
  ctx.fillText(cleanName, totalWidth / 2, textY);

  return finalCanvas.toDataURL('image/png');
}

/**
 * Retorna o nome de arquivo padronizado para plaquinha identificada (ex: google-037.png)
 */
export function getIdentifiedFilename(prefix: string, sequenceNumber: number, ext: 'png' | 'svg' = 'png'): string {
  const cleanPrefix = (prefix || 'plaquinha')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const seqStr = String(sequenceNumber).padStart(3, '0');
  return `${cleanPrefix || 'plaquinha'}-${seqStr}.${ext}`;
}

/**
 * Gera PNG de alta resolução para impressão de plaquinhas identificadas:
 * - QR Code em alta resolução com quiet zone 100% preservada
 * - Título em destaque (ex: GOOGLE 037 ou PLAQUINHA 037)
 * - Código permanente (ex: Código: X8K4P9QA)
 * - Texto NUNCA encosta nem invade os módulos do QR
 */
export async function generateIdentifiedQRCodeDataUrl(
  text: string,
  title: string,
  code: string,
  width = 1024
): Promise<string> {
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, text, {
    width,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#0a0d14',
      light: '#ffffff',
    },
  });

  // Altura do rodapé para identificação visual (~18% da largura)
  const footerHeight = Math.max(90, Math.round(width * 0.18));
  const totalWidth = width;
  const totalHeight = width + footerHeight;

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = totalWidth;
  finalCanvas.height = totalHeight;
  const ctx = finalCanvas.getContext('2d');
  if (!ctx) {
    return qrCanvas.toDataURL('image/png');
  }

  // 1. Fundo branco puro
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, totalWidth, totalHeight);

  // 2. Desenha o QR Code acima
  ctx.drawImage(qrCanvas, 0, 0, totalWidth, width);

  // 3. Divisória sutil
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = Math.max(1, Math.round(width * 0.0015));
  ctx.beginPath();
  const lineMargin = Math.round(width * 0.08);
  ctx.moveTo(lineMargin, width);
  ctx.lineTo(totalWidth - lineMargin, width);
  ctx.stroke();

  // 4. Texto 1: Título em destaque (ex: GOOGLE 037)
  const titleFontSize = Math.round(footerHeight * 0.36);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#0f172a';
  ctx.font = `800 ${titleFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  const titleY = width + Math.round(footerHeight * 0.38);
  ctx.fillText((title || '').toUpperCase(), totalWidth / 2, titleY);

  // 5. Texto 2: Código permanente (ex: Código: X8K4P9QA)
  const codeFontSize = Math.round(footerHeight * 0.22);
  ctx.fillStyle = '#64748b';
  ctx.font = `600 ${codeFontSize}px monospace, -apple-system, BlinkMacSystemFont, sans-serif`;
  const codeY = width + Math.round(footerHeight * 0.74);
  ctx.fillText(`Código: ${code}`, totalWidth / 2, codeY);

  return finalCanvas.toDataURL('image/png');
}

/**
 * Generates vector SVG string for maximum printing quality.
 * When `name` is provided, integrates a clean white footer with the name below the QR.
 */
export async function generateQRCodeSvg(text: string, name?: string): Promise<string> {
  const rawSvg = await QRCode.toString(text, {
    type: 'svg',
    margin: 2,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#0a0d14',
      light: '#ffffff',
    },
  });

  const cleanName = (name || '').trim();
  if (!cleanName) {
    return rawSvg;
  }

  // Extract viewBox from rawSvg
  const viewBoxMatch = rawSvg.match(/viewBox=["']0 0 (\d+(\.\d+)?) (\d+(\.\d+)?)["']/i);
  if (!viewBoxMatch) {
    return rawSvg;
  }

  const origW = parseFloat(viewBoxMatch[1]);
  const origH = parseFloat(viewBoxMatch[3]);
  const footerH = origH * 0.13;
  const totalH = origH + footerH;

  const escapedName = cleanName
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  const fontSize = (footerH * 0.38).toFixed(2);
  const textY = (origH + (footerH / 2) + (parseFloat(fontSize) * 0.35)).toFixed(2);
  const textX = (origW / 2).toFixed(2);
  const lineY = origH.toFixed(2);

  const updatedSvg = rawSvg
    .replace(
      /viewBox=["'][^"']+["']/i,
      `viewBox="0 0 ${origW} ${totalH}"`
    )
    .replace(
      /<\/svg>/i,
      `<rect x="0" y="${origH}" width="${origW}" height="${footerH}" fill="#ffffff" />
<line x1="${(origW * 0.08).toFixed(2)}" y1="${lineY}" x2="${(origW * 0.92).toFixed(2)}" y2="${lineY}" stroke="#e2e8f0" stroke-width="0.15" />
<text x="${textX}" y="${textY}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${fontSize}" font-weight="bold" text-anchor="middle" fill="#0f172a">${escapedName}</text>
</svg>`
    );

  return updatedSvg;
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
