import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';

interface VercelRequest extends IncomingMessage {
  query?: Record<string, string | string[]>;
  cookies?: Record<string, string>;
  body?: any;
}

interface VercelResponse extends ServerResponse {
  send?: (body: any) => VercelResponse;
  json?: (jsonBody: any) => VercelResponse;
  status?: (statusCode: number) => VercelResponse;
  redirect?: (statusOrUrl: string | number, url?: string) => VercelResponse;
}

// Carrega configurações do Firebase com fallbacks seguros
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
  console.warn('[JZN CODE /api/q] Usando credenciais padrão do Firebase');
}

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId || 'gen-lang-client-0535309250';
const DATABASE_ID = process.env.FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId || 'ai-studio-2d69f472-d9be-4e92-972f-512039725aae';
const API_KEY = process.env.FIREBASE_API_KEY || firebaseConfig.apiKey || 'AIzaSyAjVcB10uYqQQGodk1nBeL9AWjudNl2Jo0';

function isValidRedirectUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeUrl(url: string): string {
  const trimmed = (url || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
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
 * Consulta o documento no Firestore REST API
 */
async function fetchQRCode(slug: string) {
  // 1. Tenta buscar direto pelo ID do documento = slug
  const docUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/dynamicQRCodes/${encodeURIComponent(slug)}?key=${API_KEY}`;
  
  try {
    const res = await fetch(docUrl);

    if (res.status === 200) {
      const json = await res.json();
      const fields = json.fields || {};
      return {
        found: true,
        docId: slug,
        data: {
          slug: fields.slug?.stringValue || slug,
          destinationUrl: fields.destinationUrl?.stringValue || '',
          active: fields.active ? fields.active.booleanValue !== false : true,
          status: fields.status?.stringValue || (fields.destinationUrl?.stringValue ? 'active' : 'available'),
          name: fields.name?.stringValue || '',
        },
      };
    }

    // 2. Se 404, faz query estruturada de fallback (caso o documento tenha sido salvo com outro ID)
    if (res.status === 404) {
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
            found: true,
            docId,
            data: {
              slug: fields.slug?.stringValue || slug,
              destinationUrl: fields.destinationUrl?.stringValue || '',
              active: fields.active ? fields.active.booleanValue !== false : true,
              status: fields.status?.stringValue || (fields.destinationUrl?.stringValue ? 'active' : 'available'),
              name: fields.name?.stringValue || '',
            },
          };
        }
      }
      return { found: false, docId: null, data: null };
    }

    return { found: false, error: true, docId: null, data: null };
  } catch (err) {
    console.error('[JZN CODE /api/q] Erro ao consultar Firestore:', err);
    return { found: false, error: true, docId: null, data: null };
  }
}

/**
 * Incrementa contador de leituras em segundo plano
 */
async function recordScan(docId: string) {
  try {
    const commitUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents:commit?key=${API_KEY}`;
    await fetch(commitUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        writes: [
          {
            transform: {
              document: `projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/dynamicQRCodes/${docId}`,
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
    console.warn('[JZN CODE /api/q] Erro ao registrar leitura:', err);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Extrai slug
  let slug = '';
  if (req.query && req.query.slug) {
    slug = Array.isArray(req.query.slug) ? req.query.slug[0] : req.query.slug;
  }
  if (!slug && req.url) {
    const match = req.url.match(/\/q\/([^/?#]+)/i);
    if (match) slug = match[1];
  }
  slug = (slug || '').trim();

  if (!slug || slug.length > 80) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(renderErrorHtml('QR Code não encontrado', 'O código informado não foi localizado.'));
    return;
  }

  try {
    const result = await fetchQRCode(slug);

    if (!result.found || !result.data) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(renderErrorHtml('QR Code não encontrado', 'Este QR Code não existe ou foi removido.'));
      return;
    }

    const { destinationUrl, active, status } = result.data;

    // Se for um QR ainda Disponível (sem destino configurado), exibe página neutra
    if (status === 'available' || !destinationUrl) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(renderUnconfiguredHtml());
      return;
    }

    // Verifica se está ativo
    if (active === false || status === 'inactive') {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(renderErrorHtml('QR Code Inativo', 'Este QR Code está temporariamente desativado pelo proprietário.'));
      return;
    }

    // Normaliza destino (ex: instagram.com/cliente -> https://instagram.com/cliente)
    const normalizedDest = normalizeUrl(destinationUrl);

    if (!normalizedDest || !isValidRedirectUrl(normalizedDest)) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(renderErrorHtml('Destino Inválido', 'O link de destino deste QR Code é inválido ou não foi configurado.'));
      return;
    }

    // Registra leitura de forma assíncrona
    if (result.docId) {
      recordScan(result.docId).catch(() => {});
    }

    // REDIRECIONAMENTO HTTP 302 IMEDIATO
    res.setHeader('Location', normalizedDest);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (typeof res.redirect === 'function') {
      return res.redirect(302, normalizedDest);
    }

    res.statusCode = 302;
    res.end();
  } catch (err: any) {
    console.error('[JZN CODE /api/q] Falha crítica:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(renderErrorHtml('Erro no Servidor', 'Ocorreu uma instabilidade ao tentar redirecionar. Tente novamente.'));
  }
}
