import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';

interface VercelRequest extends IncomingMessage {
  query?: Record<string, string | string[]>;
}

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
  // ignore
}

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId || 'gen-lang-client-0535309250';
const DATABASE_ID = process.env.FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId || 'ai-studio-2d69f472-d9be-4e92-972f-512039725aae';
const API_KEY = process.env.FIREBASE_API_KEY || firebaseConfig.apiKey || 'AIzaSyAjVcB10uYqQQGodk1nBeL9AWjudNl2Jo0';

export default async function handler(req: VercelRequest, res: ServerResponse) {
  let slug = '';
  if (req.query && req.query.slug) {
    slug = Array.isArray(req.query.slug) ? req.query.slug[0] : req.query.slug;
  }
  if (!slug && req.url) {
    const match = req.url.match(/\/api\/qr\/([^/?#]+)/i);
    if (match) slug = match[1];
  }
  slug = (slug || '').trim();

  if (!slug) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Slug obrigatório' }));
    return;
  }

  try {
    const docUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/dynamicQRCodes/${encodeURIComponent(slug)}?key=${API_KEY}`;
    const response = await fetch(docUrl);

    if (response.status === 404) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'QR Code não encontrado' }));
      return;
    }

    if (!response.ok) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Erro ao consultar banco' }));
      return;
    }

    const json = await response.json();
    const fields = json.fields || {};

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      slug: fields.slug?.stringValue || slug,
      destinationUrl: fields.destinationUrl?.stringValue || '',
      active: fields.active ? fields.active.booleanValue !== false : true,
      name: fields.name?.stringValue || '',
      scansCount: fields.scansCount?.integerValue ? parseInt(fields.scansCount.integerValue, 10) : 0,
      lastScanAt: fields.lastScanAt?.timestampValue || null,
    }));
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message }));
  }
}
