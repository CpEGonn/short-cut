import { createServer } from 'node:http'
import assert from 'node:assert/strict'
import test from 'node:test'
import { requestJson } from '../../client/src/api.js'
import { createApp } from '../src/app.js'
import { InMemoryUrlStore } from '../src/store.js'

async function startServer() {
  const app = createApp({
    baseUrl: 'http://localhost:3000',
    store: new InMemoryUrlStore({ baseUrl: 'http://localhost:3000' })
  })
  const server = createServer(app)

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })

  const address = server.address()
  const baseUrl = `http://127.0.0.1:${address.port}`

  return { server, baseUrl }
}

async function stopServer(server) {
  await new Promise((resolve) => {
    server.close(resolve)
  })
}

test('client helper stays in sync with the delete endpoint', async () => {
  const { server, baseUrl } = await startServer()
  const previousApiRoot = globalThis.__SHORTCUT_API_URL__
  globalThis.__SHORTCUT_API_URL__ = `${baseUrl}/api`

  try {
    const created = await requestJson('/urls', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/articles/delete-sync' })
    })

    const deleted = await requestJson(`/urls/${created.shortCode}`, {
      method: 'DELETE'
    })

    assert.equal(deleted.shortCode, created.shortCode)
    assert.equal(deleted.deleted, true)

    const list = await requestJson('/urls')
    assert.deepEqual(list, [])

    await assert.rejects(
      () => requestJson(`/urls/${created.shortCode}`),
      (error) => {
        assert.equal(error.message, 'Short code not found.')
        return true
      }
    )
  } finally {
    globalThis.__SHORTCUT_API_URL__ = previousApiRoot
    await stopServer(server)
  }
})