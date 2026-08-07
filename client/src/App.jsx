import { useEffect, useMemo, useState } from 'react'
import { requestJson } from './api.js'

function formatDate(value) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

function formatRelativeTime(value) {
  const date = new Date(value)
  const diff = date.getTime() - Date.now()
  const abs = Math.abs(diff)
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  if (abs < minute) {
    return 'just now'
  }

  if (abs < hour) {
    return formatter.format(Math.round(diff / minute), 'minute')
  }

  if (abs < day) {
    return formatter.format(Math.round(diff / hour), 'hour')
  }

  return formatter.format(Math.round(diff / day), 'day')
}

function compactUrl(value) {
  try {
    const parsed = new URL(value)
    const path = parsed.pathname.length > 24 ? `${parsed.pathname.slice(0, 24)}�` : parsed.pathname
    const query = parsed.search ? '�' : ''
    return `${parsed.hostname}${path}${query}`
  } catch {
    return value
  }
}

function hostFromUrl(value) {
  try {
    return new URL(value).hostname
  } catch {
    return value
  }
}

function LinkCard({ link, onCopy, copiedCode }) {
  const isCopied = copiedCode === link.shortCode

  return (
    <article className="link-card">
      <div className="link-card__header">
        <div className="link-card__heading">
          <p className="label">Short link</p>
          <a className="short-link" href={link.shortUrl} target="_blank" rel="noreferrer">
            {link.shortUrl}
          </a>
        </div>

        <div className="link-card__actions">
          <a className="button button--ghost" href={link.url} target="_blank" rel="noreferrer">
            Open source
          </a>
          <button type="button" className="button button--secondary" onClick={() => onCopy(link.shortUrl, link.shortCode)}>
            {isCopied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <p className="original-link">{compactUrl(link.url)}</p>

      <div className="meta-grid">
        <span>
          <strong>Code</strong>
          <br />
          {link.shortCode}
        </span>
        <span>
          <strong>Visits</strong>
          <br />
          {link.visitCount}
        </span>
        <span>
          <strong>Created</strong>
          <br />
          {formatDate(link.createdAt)}
        </span>
      </div>

      <p className="link-card__footer">
        Destination host: <strong>{hostFromUrl(link.url)}</strong>
        {link.lastVisitedAt ? ` � Last visit ${formatRelativeTime(link.lastVisitedAt)}` : ' � Never visited'}
      </p>
    </article>
  )
}

export default function App() {
  const [url, setUrl] = useState('')
  const [links, setLinks] = useState([])
  const [status, setStatus] = useState({ type: 'idle', message: '' })
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [copiedCode, setCopiedCode] = useState('')

  const recentLinks = useMemo(() => links.slice(0, 6), [links])
  const totalVisits = useMemo(() => links.reduce((sum, link) => sum + (link.visitCount ?? 0), 0), [links])
  const latestCreatedAt = links[0]?.createdAt

  async function loadLinks() {
    setRefreshing(true)

    try {
      const data = await requestJson('/urls')
      setLinks(Array.isArray(data) ? data : [])
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadLinks().catch(() => {
      setStatus({ type: 'error', message: 'Unable to load recent links. Start the API and refresh.' })
    })
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    const nextUrl = url.trim()

    if (!nextUrl) {
      setStatus({ type: 'error', message: 'Paste a valid HTTP or HTTPS URL first.' })
      return
    }

    setLoading(true)
    setStatus({ type: 'idle', message: '' })

    try {
      const data = await requestJson('/urls', {
        method: 'POST',
        body: JSON.stringify({ url: nextUrl })
      })

      setLinks((current) => {
        const next = [data, ...current.filter((item) => item.shortCode !== data.shortCode)]
        return next.slice(0, 10)
      })
      setStatus({ type: 'success', message: 'Short link created and added to the archive.' })
      setUrl('')

      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(data.shortUrl)
          setCopiedCode(data.shortCode)
          window.setTimeout(() => setCopiedCode(''), 1800)
        } catch {
          // A clipboard failure should not block a successful create.
        }
      }
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy(value, code) {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard API is unavailable.')
      }

      await navigator.clipboard.writeText(value)
      setCopiedCode(code)
      window.setTimeout(() => setCopiedCode(''), 1800)
      setStatus({ type: 'success', message: 'Short link copied to clipboard.' })
    } catch {
      setStatus({ type: 'error', message: 'Copying is not available in this browser context.' })
    }
  }

  return (
    <div className="page-shell">
      <main className="app-shell">
        <section className="hero">
          <div className="hero__content">
            <div className="brand-lockup">
              <img className="brand-logo" src="/logo.webp" alt="ShortCut Atlas" />
              <div className="brand-name">
                <span>ShortCut</span>
                <small>Atlas</small>
              </div>
            </div>
            <h1>Short links, made easy to manage.</h1>
            <p className="hero-copy">
              A focused workspace for turning long destinations into concise, shareable links. Create a short URL,
              copy it instantly, and keep the ten most recent records in view without leaving the page.
            </p>

            <div className="tag-list" aria-label="Product highlights">
              <span className="tag">HTTP/HTTPS only</span>
              <span className="tag">One-click copy</span>
              <span className="tag">Visit counts included</span>
            </div>

            <div className="metric-grid" aria-label="Current archive metrics">
              <article className="metric-card">
                <span className="metric-card__label">Stored links</span>
                <strong>{links.length}</strong>
                <span className="metric-card__note">Latest records from the API</span>
              </article>
              <article className="metric-card">
                <span className="metric-card__label">Total visits</span>
                <strong>{totalVisits}</strong>
                <span className="metric-card__note">Across the current archive</span>
              </article>
              <article className="metric-card">
                <span className="metric-card__label">Most recent</span>
                <strong>{latestCreatedAt ? formatRelativeTime(latestCreatedAt) : 'No links yet'}</strong>
                <span className="metric-card__note">Based on the newest record</span>
              </article>
            </div>
          </div>

          <aside className="control-panel">
            <div className="control-panel__top">
              <p className="label">Create link</p>
              <h2>Paste a URL and let ShortCut do the trimming.</h2>
            </div>

            <form className="shorten-form" onSubmit={handleSubmit}>
              <label className="field">
                <span>Destination URL</span>
                <input
                  type="url"
                  inputMode="url"
                  placeholder="https://example.com/very/long/path"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  required
                />
              </label>

              <button className="button button--primary" type="submit" disabled={loading}>
                {loading ? 'Shortening�' : 'Shorten URL'}
              </button>
            </form>

            <p className="helper-copy">The app normalizes the destination before saving and copies the short link on success.</p>

            {status.message ? <p className={`notice notice--${status.type}`}>{status.message}</p> : null}
          </aside>
        </section>

        <section className="panel">
          <div className="panel__header">
            <div>
              <p className="label">Recent links</p>
              <h2>Audit the latest short codes and their usage at a glance.</h2>
            </div>
            <button
              type="button"
              className="button button--ghost"
              onClick={() =>
                loadLinks().catch(() =>
                  setStatus({ type: 'error', message: 'Unable to reload recent links.' })
                )
              }
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing�' : 'Refresh'}
            </button>
          </div>

          {recentLinks.length > 0 ? (
            <div className="link-list">
              {recentLinks.map((link) => (
                <LinkCard
                  key={link.shortCode}
                  link={link}
                  onCopy={handleCopy}
                  copiedCode={copiedCode}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p className="empty-state__title">No links yet.</p>
              <p>Shorten a URL to populate the archive and start tracking visit counts.</p>
            </div>
          )}
        </section>
      </main>

    </div>
  )
}
