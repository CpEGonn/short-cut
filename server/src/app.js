import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { UrlStore } from './store.js';

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

function parseAndValidateUrl(input) {
  if (typeof input !== 'string') {
    return null;
  }

  const candidate = input.trim();
  if (!candidate) {
    return null;
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

export function createApp(options = {}) {
  const store = options.store ?? new UrlStore();
  const baseUrl = options.baseUrl ?? process.env.BASE_URL ?? 'http://localhost:3000';
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ data: { status: 'ok' } });
  });

  app.get('/api/urls', (req, res) => {
    const limit = req.query.limit ?? 10;
    const data = store.list(limit);
    res.json({ data });
  });

  app.post('/api/urls', (req, res) => {
    const normalizedUrl = parseAndValidateUrl(req.body?.url);
    if (!normalizedUrl) {
      return sendError(res, 400, 'Provide a valid HTTP or HTTPS URL.');
    }

    const record = store.create(normalizedUrl, baseUrl);
    return res.status(201).json({ data: record });
  });

  app.get('/api/urls/:shortCode', (req, res) => {
    const record = store.get(req.params.shortCode);
    if (!record) {
      return sendError(res, 404, 'Short code not found.');
    }

    return res.json({ data: record });
  });

  app.delete('/api/urls/:shortCode', (req, res) => {
    const deleted = store.delete(req.params.shortCode);
    if (!deleted) {
      return sendError(res, 404, 'Short code not found.');
    }

    return res.json({ data: { shortCode: deleted.shortCode, deleted: true } });
  });

  app.get('/:shortCode', (req, res) => {
    const record = store.get(req.params.shortCode);
    if (!record) {
      return sendError(res, 404, 'Short code not found.');
    }

    store.recordVisit(req.params.shortCode);
    res.redirect(302, record.url);
  });

  app.use((err, _req, res, _next) => {
    if (err?.type === 'entity.parse.failed' || err instanceof SyntaxError) {
      return sendError(res, 400, 'Invalid JSON body.');
    }

    console.error(err);
    return sendError(res, 500, 'Internal server error.');
  });

  return app;
}
