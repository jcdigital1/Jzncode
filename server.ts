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
 * Rejeita protocolos perigosos como javascript:, data:, vbscript:, etc.
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
    return { notFound: true, data: null };
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error(`[JZN CODE] Erro Firestore status ${res.status}:`, errText);
    return { error: true, data: null };
  }

  const json = await res.json();
  const fields = json.fields || {};

  return {
    notFound: false,
    error: false,
    data: {
      slug: fields.slug?.stringValue || slug,
      destinationUrl: fields.destinationUrl?.stringValue || '',
      active: fields.active ? fields.active.booleanValue !== false : true,
      name: fields.name?.stringValue || '',
    },
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

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

      const { destinationUrl, active } = result.data;

      // Verifica se está ativo
      if (active === false) {
        return res.status(403).send(renderErrorHtml('QR Code Inativo', 'Este QR Code está temporariamente inativo.'));
      }

      // Valida destinationUrl
      if (!destinationUrl || !isValidRedirectUrl(destinationUrl)) {
        return res.status(400).send(renderErrorHtml('Destino Inválido', 'O link de destino deste QR Code é inválido ou não foi configurado.'));
      }

      // REDIRECIONAMENTO HTTP 302 IMEDIATO
      // Headers para garantir que o navegador NUNCA faça cache do redirecionamento
      // Dessa forma, quando o usuário altera o destino no JZN CODE, o próximo escaneamento
      // do mesmo QR Code já abrirá o novo destino sem nenhum conflito de cache.
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      return res.redirect(302, destinationUrl);
    } catch (err) {
      console.error('[JZN CODE] Falha ao processar redirecionamento:', err);
      return res.status(500).send(renderErrorHtml('Erro no Servidor', 'Ocorreu uma instabilidade momentânea ao tentar redirecionar.'));
    }
  });

  // 3. API endpoint para consultar destino se necessário
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
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 4. VITE MIDDLEWARE (DEV) OU STATIC ASSETS (PROD)
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
