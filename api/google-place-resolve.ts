import type { IncomingMessage, ServerResponse } from 'http';

interface VercelRequest extends IncomingMessage {
  body?: any;
}

interface VercelResponse extends ServerResponse {
  json?: (data: any) => void;
  status?: (code: number) => VercelResponse;
}

function cleanText(str: string): string {
  return (str || '')
    .replace(/\+/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Método não permitido' }));
    return;
  }

  // Parse body if not parsed
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  } else if (!body) {
    const buffers: Buffer[] = [];
    for await (const chunk of req) {
      buffers.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const rawData = Buffer.concat(buffers).toString('utf-8');
    try {
      body = JSON.parse(rawData);
    } catch {
      body = {};
    }
  }

  const rawInput = (body?.url || body?.link || '').trim();

  if (!rawInput) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: 'Por favor, cole o link da empresa no Google Maps.' }));
    return;
  }

  try {
    // Caso 1: Place ID direto (ChIJ...)
    if (/^ChIJ[a-zA-Z0-9_-]{20,}$/.test(rawInput)) {
      const placeId = rawInput;
      const reviewUrl = `https://search.google.com/local/writereview?placeid=${placeId}`;
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: true,
        placeId,
        name: 'Empresa no Google',
        address: 'Google Maps Local',
        city: '',
        reviewUrl,
      }));
      return;
    }

    // Caso 2: URL com placeid=
    const directPlaceIdMatch = rawInput.match(/placeid=([a-zA-Z0-9_-]+)/i) || rawInput.match(/query_place_id=([a-zA-Z0-9_-]+)/i);
    if (directPlaceIdMatch && directPlaceIdMatch[1]) {
      const placeId = directPlaceIdMatch[1];
      const reviewUrl = `https://search.google.com/local/writereview?placeid=${placeId}`;
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: true,
        placeId,
        name: 'Empresa Google',
        address: 'Endereço registrado no Google',
        city: '',
        reviewUrl,
      }));
      return;
    }

    // Caso 3: URL do Google Maps
    let targetUrl = rawInput;
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = `https://${targetUrl}`;
    }

    const response = await fetch(targetUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      },
    });

    const finalUrl = response.url || targetUrl;
    const html = await response.text().catch(() => '');

    let placeId = '';
    const urlPlaceIdMatch =
      finalUrl.match(/!1s(ChIJ[a-zA-Z0-9_-]{20,})/i) ||
      finalUrl.match(/place_id=([a-zA-Z0-9_-]{20,})/i);

    if (urlPlaceIdMatch && urlPlaceIdMatch[1]) {
      placeId = urlPlaceIdMatch[1];
    }

    if (!placeId && html) {
      const htmlPlaceIdMatch =
        html.match(/["'](ChIJ[a-zA-Z0-9_-]{22,})["']/i) ||
        html.match(/data-pid=["']([a-zA-Z0-9_-]+)["']/i) ||
        html.match(/\["place_id","(ChIJ[a-zA-Z0-9_-]+)"\]/i) ||
        html.match(/search\.google\.com\/local\/writereview\?placeid=([a-zA-Z0-9_-]+)/i);

      if (htmlPlaceIdMatch && htmlPlaceIdMatch[1]) {
        placeId = htmlPlaceIdMatch[1];
      }
    }

    let businessName = '';
    const placePathMatch = finalUrl.match(/\/maps\/place\/([^/@]+)/i);
    if (placePathMatch && placePathMatch[1]) {
      businessName = cleanText(decodeURIComponent(placePathMatch[1]));
    }

    if (!businessName && html) {
      const ogTitleMatch = html.match(/<meta property=["']og:title["'] content=["']([^"']+)["']/i);
      if (ogTitleMatch && ogTitleMatch[1]) {
        businessName = cleanText(ogTitleMatch[1].replace(/ - Google Maps.*$/i, ''));
      } else {
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          businessName = cleanText(titleMatch[1].replace(/ - Google Maps.*$/i, ''));
        }
      }
    }

    if (!businessName) {
      businessName = 'Empresa no Google';
    }

    let address = '';
    let city = '';

    if (html) {
      const ogDescMatch =
        html.match(/<meta property=["']og:description["'] content=["']([^"']+)["']/i) ||
        html.match(/<meta name=["']description["'] content=["']([^"']+)["']/i);

      if (ogDescMatch && ogDescMatch[1]) {
        const desc = cleanText(ogDescMatch[1]);
        const cleanDesc = desc.replace(/[·•★].*$/, '').trim();
        if (cleanDesc.length > 5) {
          address = cleanDesc;
          const cityMatch = cleanDesc.match(/,\s*([A-Za-zÀ-ÿ\s]+(?:\s*-\s*[A-Z]{2})?)(?:,|$)/);
          if (cityMatch && cityMatch[1]) {
            city = cleanText(cityMatch[1]);
          }
        }
      }
    }

    if (!placeId) {
      const chijFallback = html.match(/ChIJ[a-zA-Z0-9_-]{20,}/);
      if (chijFallback && chijFallback[0]) {
        placeId = chijFallback[0];
      }
    }

    if (!placeId) {
      res.statusCode = 422;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: false,
        error:
          'Não foi possível identificar o Place ID deste link do Google Maps. Certifique-se de compartilhar o link do estabelecimento comercial no Google Maps.',
        urlResolved: finalUrl,
        name: businessName,
      }));
      return;
    }

    const reviewUrl = `https://search.google.com/local/writereview?placeid=${placeId}`;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: true,
      placeId,
      name: businessName,
      address: address || 'Endereço identificado no Google Maps',
      city: city || '',
      reviewUrl,
      finalUrl,
    }));
  } catch (err: any) {
    console.error('[JZN CODE /api/google-place-resolve] Erro:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: false,
      error: 'Falha ao analisar o link do Google Maps. Verifique se o link está correto.',
    }));
  }
}
