import { createServer } from 'node:http';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/app.js';

async function startServer() {
  const app = createApp({ baseUrl: 'http://localhost:3000' });
  const server = createServer(app);

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return { server, baseUrl };
}

async function stopServer(server) {
  await new Promise((resolve) => {
    server.close(resolve);
  });
}

async function requestJson(baseUrl, path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init.headers ?? {})
    }
  });

  const body = await response.json().catch(() => null);
  return { response, body };
}

test('health endpoint reports ok', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const { response, body } = await requestJson(baseUrl, '/api/health');
    assert.equal(response.status, 200);
    assert.deepEqual(body, { data: { status: 'ok' } });
  } finally {
    await stopServer(server);
  }
});

test('creates, lists, inspects, redirects, and deletes a short url', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const created = await requestJson(baseUrl, '/api/urls', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/articles/hello-world' })
    });

    assert.equal(created.response.status, 201);
    assert.equal(created.body.data.url, 'https://example.com/articles/hello-world');
    assert.match(created.body.data.shortCode, /^[a-f0-9]{8}$/);
    assert.equal(created.body.data.visitCount, 0);

    const shortCode = created.body.data.shortCode;

    const list = await requestJson(baseUrl, '/api/urls');
    assert.equal(list.response.status, 200);
    assert.equal(list.body.data.length, 1);
    assert.equal(list.body.data[0].shortCode, shortCode);

    const details = await requestJson(baseUrl, `/api/urls/${shortCode}`);
    assert.equal(details.response.status, 200);
    assert.equal(details.body.data.shortCode, shortCode);

    const redirect = await fetch(`${baseUrl}/${shortCode}`, { redirect: 'manual' });
    assert.equal(redirect.status, 302);
    assert.equal(redirect.headers.get('location'), 'https://example.com/articles/hello-world');

    const visited = await requestJson(baseUrl, `/api/urls/${shortCode}`);
    assert.equal(visited.body.data.visitCount, 1);
    assert.ok(visited.body.data.lastVisitedAt);

    const deleted = await requestJson(baseUrl, `/api/urls/${shortCode}`, {
      method: 'DELETE'
    });

    assert.equal(deleted.response.status, 200);
    assert.equal(deleted.body.data.deleted, true);

    const missing = await requestJson(baseUrl, `/api/urls/${shortCode}`);
    assert.equal(missing.response.status, 404);
    assert.equal(missing.body.error, 'Short code not found.');
  } finally {
    await stopServer(server);
  }
});

test('rejects invalid urls', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const invalid = await requestJson(baseUrl, '/api/urls', {
      method: 'POST',
      body: JSON.stringify({ url: 'ftp://example.com' })
    });

    assert.equal(invalid.response.status, 400);
    assert.equal(invalid.body.error, 'Provide a valid HTTP or HTTPS URL.');
  } finally {
    await stopServer(server);
  }
});
