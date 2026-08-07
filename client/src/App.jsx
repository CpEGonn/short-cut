import { useEffect, useMemo, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

function formatDate(value) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function compactUrl(value) {
  try {
    const parsed = new URL(value);
    const path = parsed.pathname.length > 22 ? `${parsed.pathname.slice(0, 22)}...` : parsed.pathname;
    return `${parsed.hostname}${path}${parsed.search ? '...' : ''}`;
  } catch {
    return value;
  }
}

function LinkCard({ link, onCopy, copiedCode }) {
  const isCopied = copiedCode === link.shortCode;

  return (
    <article className="link-card">
      <div className="link-card__top">
        <div>
          <p className="label">Short link</p>
          <a className="short-link" href={link.shortUrl} target="_blank" rel="noreferrer">
            {link.shortUrl}
          </a>
        </div>
        <button type="button" className="button button--secondary" onClick={() => onCopy(link.shortUrl, link.shortCode)}>
          {isCopied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <p className="original-link">{link.url}</p>

      <div className="meta-grid">
        <span>
          <strong>Code</strong>
          <br />
          {link.shortCode}
        </span>
        <span>
          <strong>Visits</strong>
          <br />
          {link.visits}
        </span>
        <span>
          <strong>Created</strong>
          <br />
          {formatDate(link.createdAt)}
        </span>
      </div>
    </article>
  );
}

export default function App() {
  const [url, setUrl] = useState('');
  const [links, setLinks] = useState([]);
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState('');

  const hasLinks = links.length > 0;
  const recentLinks = useMemo(() => links.slice(0, 6), [links]);

  async function loadLinks() {
    const response = await fetch(`${API_BASE_URL}/urls`);
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error ?? 'Unable to load recent links.');
    }

    setLinks(payload.data.items);
  }

  useEffect(() => {
    loadLinks().catch(() => {
      setStatus({ type: 'error', message: 'Unable to load recent links. Start the API and refresh.' });
    });
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setStatus({ type: 'idle', message: '' });

    try {
      const response = await fetch(`${API_BASE_URL}/urls`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to shorten the URL.');
      }

      setLinks((current) => {
        const next = [payload.data, ...current.filter((item) => item.shortCode !== payload.data.shortCode)];
        return next.slice(0, 10);
      });
      setStatus({ type: 'success', message: 'Short link created.' });
      setUrl('');

      await navigator.clipboard.writeText(payload.data.shortUrl).catch(() => {});
      setCopiedCode(payload.data.shortCode);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(value, code) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode(''), 1800);
    } catch {
      setStatus({ type: 'error', message: 'Copying is not available in this browser context.' });
    }
  }

  return (
    <div className="page-shell">
      <main className="app">
        <section className="hero">
          <div>
            <p className="eyebrow">ShortCut</p>
            <h1>Turn long URLs into short, shareable links.</h1>
            <p className="hero-copy">
              Paste an HTTP or HTTPS URL, generate a compact link, copy it in one click, and inspect recent creations
              without leaving the page.
            </p>
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
              {loading ? 'Shortening...' : 'Shorten URL'}
            </button>
          </form>

          {status.message ? <p className={`banner banner--${status.type}`}>{status.message}</p> : null}
        </section>

        <section className="panel">
          <div className="panel__header">
            <div>
              <p className="label">Recent links</p>
              <h2>Track the latest short codes and visit counts.</h2>
            </div>
            <button type="button" className="button button--ghost" onClick={() => loadLinks().catch(() => setStatus({ type: 'error', message: 'Unable to reload recent links.' }))}>
              Refresh
            </button>
          </div>

          {hasLinks ? (
            <div className="link-list">
              {recentLinks.map((link) => (
                <LinkCard key={link.shortCode} link={link} onCopy={handleCopy} copiedCode={copiedCode} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No links yet.</p>
              <p>Submit a URL to see the first short link appear here.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}