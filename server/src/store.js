import { randomBytes } from 'node:crypto'
import { neon } from '@neondatabase/serverless'

function createShortCode() {
  return randomBytes(4).toString('hex')
}

function sanitizeBaseUrl(baseUrl) {
  return String(baseUrl || 'http://localhost:3000').replace(/\/+$/, '')
}

function mapRecord(row) {
  if (!row) {
    return null
  }

  return {
    shortCode: row.short_code,
    url: row.url,
    shortUrl: row.short_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    visitCount: Number(row.visit_count),
    lastVisitedAt: row.last_visited_at
  }
}

async function ensureSchema(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS urls (
      short_code text PRIMARY KEY,
      url text NOT NULL,
      short_url text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      visit_count integer NOT NULL DEFAULT 0,
      last_visited_at timestamptz NULL
    )
  `
}

class BaseUrlStore {
  constructor({ baseUrl }) {
    this.baseUrl = sanitizeBaseUrl(baseUrl)
  }

  buildShortUrl(shortCode) {
    return `${this.baseUrl}/${shortCode}`
  }

  normalizeLimit(limit, fallback = 10) {
    const parsed = Number(limit)
    if (!Number.isFinite(parsed)) {
      return fallback
    }

    return Math.max(0, parsed)
  }
}

export class InMemoryUrlStore extends BaseUrlStore {
  constructor(options = {}) {
    super(options)
    this.records = new Map()
    this.order = []
  }

  create(url) {
    let shortCode = ''

    for (let attempt = 0; attempt < 32; attempt += 1) {
      shortCode = createShortCode()
      if (!this.records.has(shortCode)) {
        break
      }
    }

    if (this.records.has(shortCode)) {
      throw new Error('Unable to generate a unique short code')
    }

    const timestamp = new Date().toISOString()
    const record = {
      shortCode,
      url,
      shortUrl: this.buildShortUrl(shortCode),
      createdAt: timestamp,
      updatedAt: timestamp,
      visitCount: 0,
      lastVisitedAt: null
    }

    this.records.set(shortCode, record)
    this.order.push(shortCode)

    return { ...record }
  }

  list(limit = 10) {
    const size = this.normalizeLimit(limit)

    return this.order
      .slice()
      .reverse()
      .slice(0, size)
      .map((shortCode) => ({ ...this.records.get(shortCode) }))
  }

  get(shortCode) {
    const record = this.records.get(shortCode)
    return record ? { ...record } : null
  }

  delete(shortCode) {
    const record = this.records.get(shortCode)
    if (!record) {
      return null
    }

    this.records.delete(shortCode)
    this.order = this.order.filter((code) => code !== shortCode)

    return { ...record }
  }

  recordVisit(shortCode) {
    const record = this.records.get(shortCode)
    if (!record) {
      return null
    }

    record.visitCount += 1
    record.updatedAt = new Date().toISOString()
    record.lastVisitedAt = record.updatedAt

    return { ...record }
  }
}

export class NeonUrlStore extends BaseUrlStore {
  constructor(options = {}) {
    super(options)
    const connectionString = options.connectionString ?? process.env.DATABASE_URL

    if (!connectionString) {
      throw new Error('DATABASE_URL is required to use NeonUrlStore.')
    }

    this.sql = neon(connectionString)
    this.readyPromise = null
  }

  async ensureReady() {
    if (!this.readyPromise) {
      this.readyPromise = ensureSchema(this.sql)
    }

    return this.readyPromise
  }

  async create(url) {
    await this.ensureReady()

    for (let attempt = 0; attempt < 32; attempt += 1) {
      const shortCode = createShortCode()
      const [row] = await this.sql`
        INSERT INTO urls (
          short_code,
          url,
          short_url,
          created_at,
          updated_at,
          visit_count,
          last_visited_at
        )
        VALUES (
          ${shortCode},
          ${url},
          ${this.buildShortUrl(shortCode)},
          NOW(),
          NOW(),
          0,
          NULL
        )
        ON CONFLICT (short_code) DO NOTHING
        RETURNING short_code, url, short_url, created_at, updated_at, visit_count, last_visited_at
      `

      if (row) {
        return mapRecord(row)
      }
    }

    throw new Error('Unable to generate a unique short code')
  }

  async list(limit = 10) {
    await this.ensureReady()
    const size = this.normalizeLimit(limit)
    const rows = await this.sql`
      SELECT short_code, url, short_url, created_at, updated_at, visit_count, last_visited_at
      FROM urls
      ORDER BY created_at DESC
      LIMIT ${size}
    `

    return rows.map(mapRecord)
  }

  async get(shortCode) {
    await this.ensureReady()
    const rows = await this.sql`
      SELECT short_code, url, short_url, created_at, updated_at, visit_count, last_visited_at
      FROM urls
      WHERE short_code = ${shortCode}
      LIMIT 1
    `

    return mapRecord(rows[0])
  }

  async delete(shortCode) {
    await this.ensureReady()
    const rows = await this.sql`
      DELETE FROM urls
      WHERE short_code = ${shortCode}
      RETURNING short_code, url, short_url, created_at, updated_at, visit_count, last_visited_at
    `

    return mapRecord(rows[0])
  }

  async recordVisit(shortCode) {
    await this.ensureReady()
    const rows = await this.sql`
      UPDATE urls
      SET
        visit_count = visit_count + 1,
        updated_at = NOW(),
        last_visited_at = NOW()
      WHERE short_code = ${shortCode}
      RETURNING short_code, url, short_url, created_at, updated_at, visit_count, last_visited_at
    `

    return mapRecord(rows[0])
  }
}

export function createDefaultUrlStore(options = {}) {
  const connectionString = options.connectionString ?? process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('Set DATABASE_URL to a Neon connection string before starting the API.')
  }

  return new NeonUrlStore({ ...options, connectionString })
}
