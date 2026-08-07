import { randomBytes } from 'node:crypto';

function createShortCode() {
  return randomBytes(4).toString('hex');
}

function sanitizeBaseUrl(baseUrl) {
  return String(baseUrl || 'http://localhost:3000').replace(/\/+$/, '');
}

export class UrlStore {
  constructor() {
    this.records = new Map();
    this.order = [];
  }

  create(url, baseUrl) {
    const normalizedBaseUrl = sanitizeBaseUrl(baseUrl);
    let shortCode = '';

    for (let attempt = 0; attempt < 32; attempt += 1) {
      shortCode = createShortCode();
      if (!this.records.has(shortCode)) {
        break;
      }
    }

    if (this.records.has(shortCode)) {
      throw new Error('Unable to generate a unique short code');
    }

    const timestamp = new Date().toISOString();
    const record = {
      shortCode,
      url,
      shortUrl: `${normalizedBaseUrl}/${shortCode}`,
      createdAt: timestamp,
      updatedAt: timestamp,
      visitCount: 0,
      lastVisitedAt: null
    };

    this.records.set(shortCode, record);
    this.order.push(shortCode);

    return { ...record };
  }

  list(limit = 10) {
    const size = Number.isFinite(Number(limit)) ? Math.max(0, Number(limit)) : 10;

    return this.order
      .slice()
      .reverse()
      .slice(0, size)
      .map((shortCode) => ({ ...this.records.get(shortCode) }));
  }

  get(shortCode) {
    const record = this.records.get(shortCode);
    return record ? { ...record } : null;
  }

  delete(shortCode) {
    const record = this.records.get(shortCode);
    if (!record) {
      return null;
    }

    this.records.delete(shortCode);
    this.order = this.order.filter((code) => code !== shortCode);

    return { ...record };
  }

  recordVisit(shortCode) {
    const record = this.records.get(shortCode);
    if (!record) {
      return null;
    }

    record.visitCount += 1;
    record.updatedAt = new Date().toISOString();
    record.lastVisitedAt = record.updatedAt;

    return { ...record };
  }
}
