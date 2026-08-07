import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { createServer } from 'node:http';
import { createApp } from '../src/app.js';
import { resetStore } from '../src/store.js';

const app = createApp();
let server;
let baseUrl;

before(async () => {
  server = createServer(app);

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

beforeEach(() => {
  resetStore();
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('reports health', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(payload, { data: { status: 'ok' } });
});

test('creates, lists, retrieves, and redirects URLs', async () => {
  const createResponse = await fetch(`${baseUrl}/api/urls`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com/some/path' }),
  });
  const createPayload = await createResponse.json();

  assert.equal(createResponse.status, 201);
  assert.equal(createPayload.data.url, 'https://example.com/some/path');
  assert.match(createPayload.data.shortCode, /^[0-9a-zA-Z]{7}$/);
  assert.equal(createPayload.data.visits, 0);

  const listResponse = await fetch(`${baseUrl}/api/urls`);
  const listPayload = await listResponse.json();
  assert.equal(listResponse.status, 200);
  assert.equal(listPayload.data.length, 1);

  const infoResponse = await fetch(`${baseUrl}/api/urls/${createPayload.data.shortCode}`);
  const infoPayload = await infoResponse.json();
  assert.equal(infoResponse.status, 200);
  assert.equal(infoPayload.data.shortUrl, createPayload.data.shortUrl);

  const redirectResponse = await fetch(`${baseUrl}/${createPayload.data.shortCode}`, {
    redirect: 'manual',
  });
  assert.equal(redirectResponse.status, 302);
  assert.equal(redirectResponse.headers.get('location'), 'https://example.com/some/path');

  const visitedResponse = await fetch(`${baseUrl}/api/urls/${createPayload.data.shortCode}`);
  const visitedPayload = await visitedResponse.json();
  assert.equal(visitedPayload.data.visits, 1);
});

test('rejects invalid urls', async () => {
  const response = await fetch(`${baseUrl}/api/urls`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url: 'ftp://example.com' }),
  });

  assert.equal(response.status, 400);
});

test('deletes urls', async () => {
  const created = await fetch(`${baseUrl}/api/urls`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com/delete-me' }),
  }).then((response) => response.json());

  const deleteResponse = await fetch(`${baseUrl}/api/urls/${created.data.shortCode}`, {
    method: 'DELETE',
  });
  assert.equal(deleteResponse.status, 204);

  const missingResponse = await fetch(`${baseUrl}/api/urls/${created.data.shortCode}`);
  assert.equal(missingResponse.status, 404);
});

