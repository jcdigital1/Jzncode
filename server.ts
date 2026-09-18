import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

// Load Firebase configuration for server-side Firestore direct queries
let firebaseConfig: {
  projectId?: string;
  firestoreDatabaseId?: string;
  apiKey?: string;
} = {};

try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
} catch (err) {
  console.error('[JZN CODE] Erro ao carregar firebase-applet-config.json:', err);
}

const PROJECT_ID = firebaseConfig.projectId || 'gen-lang-client-0535309250';
const DATABASE_ID = firebaseConfig.firestoreDatabaseId || 'ai-studio-2d69f472-d9be-4e92-972f-512039725aae';
const API_KEY = firebaseConfig.apiKey || 'AIzaSyAjVcB10uYqQQGodk1nBeL9AWjudNl2Jo0';

/**
 * Valida se a URL é estritamente HTTP ou HTTPS para segurança.
 */
function isValidRedirectUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function renderUnconfiguredHtml(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Plaquinha Não Configurada</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      min-height: 100vh;
      background-color: #070a12;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background-color: #0d121f;
      border: 1px solid #1e293b;
      border-radius: 20px;
      padding: 40px 24px;
      max-width: 380px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 30px -10px rgba(0, 0, 0, 0.6);
    }
    .icon-box {
      width: 60px;
      height: 60px;
      border-radius: 16px;
      background: rgba(59, 130, 246, 0.12);
      border: 1px solid rgba(59, 130, 246, 0.3);
      color: #60a5fa;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      font-size: 26px;
    }
    h1 {
      font-size: 18px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 10px 0;
      line-height: 1.4;
    }
    p {
      font-size: 13px;
      color: #94a3b8;
      margin: 0;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-box">▦</div>
    <h1>Esta plaquinha ainda não foi configurada.</h1>
    <p>O destino desta plaquinha será configurado em breve.</p>
  </div>
</body>
</html>`;
}

/**
 * Renderiza página simples de erro APENAS se o QR não existir, estiver inativo ou destino inválido.
 * Em funcionamento normal, NENHUMA página é exibida (HTTP 302 imediato).
 */
function renderErrorHtml(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JZN CODE - ${title}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      min-height: 100vh;
      background-color: #070a12;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .card {
      background-color: #0d121f;
      border: 1px solid #1e293b;
      border-radius: 16px;
      padding: 32px 24px;
      max-width: 380px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .badge {
      display: inline-block;
      font-family: monospace;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: #60a5fa;
      background: rgba(30, 58, 138, 0.4);
      border: 1px solid rgba(59, 130, 246, 0.4);
      padding: 4px 10px;
      border-radius: 9999px;
      margin-bottom: 20px;
    }
    .icon-box {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.35);
      color: #f87171;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      font-size: 24px;
      font-weight: bold;
    }
    h1 {
      font-size: 18px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 8px 0;
    }
    p {
      font-size: 13px;
      color: #94a3b8;
      margin: 0 0 24px 0;
      line-height: 1.5;
    }
    a {
      display: inline-block;
      padding: 11px 22px;
      background: #1e293b;
      color: #cbd5e1;
      text-decoration: none;
      font-size: 12px;
      font-weight: 600;
      border-radius: 10px;
      border: 1px solid #334155;
      transition: all 0.2s ease;
    }
    a:hover {
      background: #2563eb;
      border-color: #3b82f6;
      color: #ffffff;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">JZN CODE</div>
    <div class="icon-box">!</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="/">Voltar ao início</a>
  </div>
</body>
</html>`;
}

/**
 * Consulta o documento no Firestore REST API pelo slug
 */
async function fetchQRCodeFromFirestore(slug: string) {
  const docUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/dynamicQRCodes/${encodeURIComponent(slug)}?key=${API_KEY}`;
  const res = await fetch(docUrl);

  if (res.status === 404) {
    try {
      const queryUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents:runQuery?key=${API_KEY}`;
      const queryRes = await fetch(queryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'dynamicQRCodes' }],
            where: {
              fieldFilter: {
                field: { fieldPath: 'slug' },
                op: 'EQUAL',
                value: { stringValue: slug },
              },
            },
            limit: 1,
          },
        }),
      });

      if (queryRes.ok) {
        const queryResults = await queryRes.json();
        if (Array.isArray(queryResults) && queryResults.length > 0 && queryResults[0].document) {
          const docItem = queryResults[0].document;
          const fields = docItem.fields || {};
          const docId = docItem.name ? docItem.name.split('/').pop() : slug;
          return {
            notFound: false,
            error: false,
            docId,
            data: {
              slug: fields.slug?.stringValue || slug,
              destinationUrl: fields.destinationUrl?.stringValue || '',
              active: fields.active ? fields.active.booleanValue !== false : true,
              status: fields.status?.stringValue || (fields.destinationUrl?.stringValue ? 'active' : 'available'),
              name: fields.name?.stringValue || '',
              scansCount: fields.scansCount?.integerValue ? parseInt(fields.scansCount.integerValue, 10) : 0,
              lastScanAt: fields.lastScanAt?.timestampValue || null,
            },
          };
        }
      }
    } catch (e) {
      console.warn('[JZN CODE] Erro no fallback runQuery:', e);
    }
    return { notFound: true, error: false, docId: null, data: null };
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error(`[JZN CODE] Erro Firestore status ${res.status}:`, errText);
    return { notFound: false, error: true, docId: null, data: null };
  }

  const json = await res.json();
  const fields = json.fields || {};

  return {
    notFound: false,
    error: false,
    docId: slug,
    data: {
      slug: fields.slug?.stringValue || slug,
      destinationUrl: fields.destinationUrl?.stringValue || '',
      active: fields.active ? fields.active.booleanValue !== false : true,
      status: fields.status?.stringValue || (fields.destinationUrl?.stringValue ? 'active' : 'available'),
      name: fields.name?.stringValue || '',
      scansCount: fields.scansCount?.integerValue ? parseInt(fields.scansCount.integerValue, 10) : 0,
      lastScanAt: fields.lastScanAt?.timestampValue || null,
    },
  };
}

/**
 * Registra leitura de forma atômica no Firestore sem atrasar o redirecionamento
 */
async function recordScanInFirestore(slug: string) {
  try {
    const commitUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents:commit?key=${API_KEY}`;
    await fetch(commitUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        writes: [
          {
            transform: {
              document: `projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/dynamicQRCodes/${slug}`,
              fieldTransforms: [
                {
                  fieldPath: 'scansCount',
                  increment: { integerValue: '1' },
                },
                {
                  fieldPath: 'lastScanAt',
                  setToServerValue: 'REQUEST_TIME',
                },
              ],
            },
          },
        ],
      }),
    });
  } catch (err) {
    console.warn('[JZN CODE] Aviso ao registrar leitura no Firestore:', err);
  }
}

/**
 * Limpa e formata strings extraídas do Google Maps
 */
function cleanText(str: string): string {
  return (str || '')
    .replace(/\+/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // 1. HEALTHCHECK
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'JZN CODE' });
  });

  // 2. ROTA PÚBLICA DE REDIRECIONAMENTO IMEDIATO (/q/:slug)
  // Processamento server-side puro: consulta o destino no Firestore e retorna HTTP 302 direto
  app.get('/q/:slug', async (req, res) => {
    const rawSlug = req.params.slug;
    const slug = (rawSlug || '').trim();

    if (!slug || slug.length > 80) {
      return res.status(404).send(renderErrorHtml('QR Code não encontrado', 'O código informado não foi localizado.'));
    }

    try {
      const result = await fetchQRCodeFromFirestore(slug);

      if (result.notFound || !result.data) {
        return res.status(404).send(renderErrorHtml('QR Code não encontrado', 'Este QR Code não existe ou foi removido.'));
      }

      if (result.error) {
        return res.status(500).send(renderErrorHtml('Erro temporário', 'Não foi possível consultar o destino. Tente novamente em instantes.'));
      }

      const { active, status } = result.data;
      let destinationUrl = (result.data.destinationUrl || '').trim();

      // Se for um QR ainda Disponível (sem destino configurado), exibe página neutra
      if (status === 'available' || !destinationUrl) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(renderUnconfiguredHtml());
      }

      // Normaliza URL caso falte http/https
      if (destinationUrl && !/^https?:\/\//i.test(destinationUrl)) {
        destinationUrl = `https://${destinationUrl}`;
      }

      // Verifica se está ativo
      if (active === false || status === 'inactive') {
        return res.status(403).send(renderErrorHtml('QR Code Inativo', 'Este QR Code está temporariamente inativo.'));
      }

      // Valida destinationUrl
      if (!destinationUrl || !isValidRedirectUrl(destinationUrl)) {
        return res.status(400).send(renderErrorHtml('Destino Inválido', 'O link de destino deste QR Code é inválido ou não foi configurado.'));
      }

      // Incrementa o contador de leitura e data/hora em segundo plano (não atrasa o redirect)
      const targetDocId = result.docId || slug;
      recordScanInFirestore(targetDocId).catch(() => {});

      // REDIRECIONAMENTO HTTP 302 IMEDIATO
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      return res.redirect(302, destinationUrl);
    } catch (err) {
      console.error('[JZN CODE] Falha ao processar redirecionamento:', err);
      return res.status(500).send(renderErrorHtml('Erro no Servidor', 'Ocorreu uma instabilidade momentânea ao tentar redirecionar.'));
    }
  });

  // 3. API endpoint para consultar dados de QR Code
  app.get('/api/qr/:slug', async (req, res) => {
    const slug = (req.params.slug || '').trim();
    if (!slug) return res.status(400).json({ error: 'Slug obrigatório' });

    try {
      const result = await fetchQRCodeFromFirestore(slug);
      if (result.notFound || !result.data) return res.status(404).json({ error: 'QR Code não encontrado' });
      if (result.error) return res.status(500).json({ error: 'Erro ao consultar banco de dados' });

      res.setHeader('Cache-Control', 'no-cache');
      return res.json({
        slug: result.data.slug,
        destinationUrl: result.data.destinationUrl,
        active: result.data.active,
        name: result.data.name,
        scansCount: result.data.scansCount,
        lastScanAt: result.data.lastScanAt,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 4. API GERADOR DE AVALIAÇÃO GOOGLE: RESOLUÇÃO DE LINK & PLACE ID
  app.post('/api/google-place/resolve', async (req, res) => {
    const rawInput = (req.body?.url || req.body?.link || '').trim();

    if (!rawInput) {
      return res.status(400).json({
        success: false,
        error: 'Por favor, cole o link da empresa no Google Maps.',
      });
    }

    try {
      // Caso 1: Usuário colou diretamente um Place ID válido (prefixo ChIJ)
      if (/^ChIJ[a-zA-Z0-9_-]{20,}$/.test(rawInput)) {
        const placeId = rawInput;
        const reviewUrl = `https://search.google.com/local/writereview?placeid=${placeId}`;
        return res.json({
          success: true,
          placeId,
          name: 'Empresa no Google',
          address: 'Google Maps Local',
          city: '',
          reviewUrl,
        });
      }

      // Caso 2: URL com placeid= diretamente (ex: search.google.com/local/writereview?placeid=...)
      const directPlaceIdMatch = rawInput.match(/placeid=([a-zA-Z0-9_-]+)/i) || rawInput.match(/query_place_id=([a-zA-Z0-9_-]+)/i);
      if (directPlaceIdMatch && directPlaceIdMatch[1]) {
        const placeId = directPlaceIdMatch[1];
        const reviewUrl = `https://search.google.com/local/writereview?placeid=${placeId}`;
        return res.json({
          success: true,
          placeId,
          name: 'Empresa Google',
          address: 'Endereço registrado no Google',
          city: '',
          reviewUrl,
        });
      }

      // Caso 3: URL encurtada ou completa do Google Maps (maps.app.goo.gl, goo.gl, google.com/maps)
      let targetUrl = rawInput;
      if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = `https://${targetUrl}`;
      }

      // Faz fetch server-side seguindo redirects para obter a URL canônica e HTML
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

      // Extrai Place ID (ChIJ...)
      // Procura primeiro no URL final (ex: !1sChIJ... ou data=!4m...1sChIJ...)
      let placeId = '';
      const urlPlaceIdMatch =
        finalUrl.match(/!1s(ChIJ[a-zA-Z0-9_-]{20,})/i) ||
        finalUrl.match(/place_id=([a-zA-Z0-9_-]{20,})/i);

      if (urlPlaceIdMatch && urlPlaceIdMatch[1]) {
        placeId = urlPlaceIdMatch[1];
      }

      // Se não encontrou no URL, procura no HTML da página do Google Maps
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

      // Extrai Nome da Empresa
      let businessName = '';
      // 1. Do path /maps/place/Nome+Da+Empresa/
      const placePathMatch = finalUrl.match(/\/maps\/place\/([^/@]+)/i);
      if (placePathMatch && placePathMatch[1]) {
        businessName = cleanText(decodeURIComponent(placePathMatch[1]));
      }

      // 2. Do <meta property="og:title"> ou <title>
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

      // Extrai Endereço & Cidade
      let address = '';
      let city = '';

      if (html) {
        const ogDescMatch =
          html.match(/<meta property=["']og:description["'] content=["']([^"']+)["']/i) ||
          html.match(/<meta name=["']description["'] content=["']([^"']+)["']/i);

        if (ogDescMatch && ogDescMatch[1]) {
          const desc = cleanText(ogDescMatch[1]);
          // Google costuma colocar o endereço completo ou avaliações no description
          // Ex: "Rua Exemplo, 123 - Centro, Patrocínio - MG, 38740-000 · ★★★★★"
          const cleanDesc = desc.replace(/[·•★].*$/, '').trim();
          if (cleanDesc.length > 5) {
            address = cleanDesc;
            // Tenta isolar Cidade - UF
            const cityMatch = cleanDesc.match(/,\s*([A-Za-zÀ-ÿ\s]+(?:\s*-\s*[A-Z]{2})?)(?:,|$)/);
            if (cityMatch && cityMatch[1]) {
              city = cleanText(cityMatch[1]);
            }
          }
        }
      }

      // Se nenhum Place ID foi extraído, mas temos nome e coordenadas:
      if (!placeId) {
        // Tenta extrair Place ID alternativo via busca no HTML
        const chijFallback = html.match(/ChIJ[a-zA-Z0-9_-]{20,}/);
        if (chijFallback && chijFallback[0]) {
          placeId = chijFallback[0];
        }
      }

      if (!placeId) {
        return res.status(422).json({
          success: false,
          error:
            'Não foi possível identificar o Place ID deste link do Google Maps. Certifique-se de compartilhar o link do estabelecimento comercial no Google Maps.',
          urlResolved: finalUrl,
          name: businessName,
        });
      }

      const reviewUrl = `https://search.google.com/local/writereview?placeid=${placeId}`;

      return res.json({
        success: true,
        placeId,
        name: businessName,
        address: address || 'Endereço identificado no Google Maps',
        city: city || '',
        reviewUrl,
        finalUrl,
      });
    } catch (err: any) {
      console.error('[JZN CODE] Erro ao resolver link Google Maps:', err);
      return res.status(500).json({
        success: false,
        error: 'Falha ao analisar o link do Google Maps. Verifique se o link está correto.',
      });
    }
  });

  // 5. VITE MIDDLEWARE (DEV) OU STATIC ASSETS (PROD)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[JZN CODE] Servidor rodando na porta ${PORT}`);
  });
}

startServer();
