import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { createDefaultUrlStore } from './store.js'

function sendError(res, status, message) {
  return res.status(status).json({ error: message })
}

function parseAndValidateUrl(input) {
  if (typeof input !== 'string') {
    return null
  }

  const candidate = input.trim()
  if (!candidate) {
    return null
  }

  try {
    const parsed = new URL(candidate)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null
    }

    return parsed.toString()
  } catch {
    return null
  }
}

export function createApp(options = {}) {
  const deployedBaseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : null
  const baseUrl = options.baseUrl ?? process.env.BASE_URL ?? deployedBaseUrl ?? 'http://localhost:3000'
  const store = options.store ?? createDefaultUrlStore({ baseUrl })
  const app = express()

  app.disable('x-powered-by')
  app.use(helmet({ contentSecurityPolicy: false }))
  app.use(cors())
  app.use(express.json({ limit: '1mb' }))

  app.get('/api/health', (_req, res) => {
    res.json({ data: { status: 'ok' } })
  })

  app.get('/api/urls', async (req, res, next) => {
    try {
      const limit = req.query.limit ?? 10
      const data = await store.list(limit)
      res.json({ data })
    } catch (error) {
      next(error)
    }
  })

  app.post('/api/urls', async (req, res, next) => {
    try {
      const normalizedUrl = parseAndValidateUrl(req.body?.url)
      if (!normalizedUrl) {
        return sendError(res, 400, 'Provide a valid HTTP or HTTPS URL.')
      }

      const record = await store.create(normalizedUrl)
      return res.status(201).json({ data: record })
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/urls/:shortCode', async (req, res, next) => {
    try {
      const record = await store.get(req.params.shortCode)
      if (!record) {
        return sendError(res, 404, 'Short code not found.')
      }

      return res.json({ data: record })
    } catch (error) {
      next(error)
    }
  })

  app.delete('/api/urls/:shortCode', async (req, res, next) => {
    try {
      const deleted = await store.delete(req.params.shortCode)
      if (!deleted) {
        return sendError(res, 404, 'Short code not found.')
      }

      return res.json({ data: { shortCode: deleted.shortCode, deleted: true } })
    } catch (error) {
      next(error)
    }
  app.get('/api/redirect/:shortCode', async (req, res, next) => {
    try {
      const record = await store.get(req.params.shortCode)
      if (!record) {
        return sendError(res, 404, 'Short code not found.')
      }

      await store.recordVisit(req.params.shortCode)
      return res.redirect(302, record.url)
    } catch (error) {
      next(error)
    }
  })

  })

  app.get('/:shortCode', async (req, res, next) => {
    try {
      const record = await store.get(req.params.shortCode)
      if (!record) {
        return sendError(res, 404, 'Short code not found.')
      }

      await store.recordVisit(req.params.shortCode)
      res.redirect(302, record.url)
    } catch (error) {
      next(error)
    }
  })

  app.use((err, _req, res, _next) => {
    if (err?.type === 'entity.parse.failed' || err instanceof SyntaxError) {
      return sendError(res, 400, 'Invalid JSON body.')
    }

    console.error(err)
    return sendError(res, 500, 'Internal server error.')
  })

  return app
}
