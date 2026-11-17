import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

let server
let api
let admin
const originalFetch = globalThis.fetch
const json = (data, status = 200) =>
  new Response(JSON.stringify({ success: status < 400, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

before(async () => {
  server = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
  })
  api = await server.ssrLoadModule('/src/services/api.js')
  admin = await server.ssrLoadModule('/src/services/admin.js')
})
after(async () => {
  globalThis.fetch = originalFetch
  await server?.close()
})

test('concurrent and late 401s share a single token refresh and preserve cookies', async () => {
  api.startSession({
    accessToken: 'old-token',
    staff: { id: 'me', permissions: ['*'] },
  })
  const calls = []
  let releaseSlow
  const slow = new Promise((resolve) => {
    releaseSlow = resolve
  })
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options })
    if (url.endsWith('/auth/refresh')) {
      await new Promise((resolve) => setTimeout(resolve, 10))
      return json({
        accessToken: 'new-token',
        staff: { id: 'me', permissions: ['*'] },
      })
    }
    if (options.headers.Authorization === 'Bearer old-token') {
      if (url.endsWith('/slow')) await slow
      return json(null, 401)
    }
    return json({ ok: true })
  }
  const late = api.request('/v1/admin/slow')
  await Promise.all([
    api.request('/v1/admin/leads'),
    api.request('/v1/admin/subscriptions'),
  ])
  releaseSlow()
  await late
  assert.equal(
    calls.filter((call) => call.url.endsWith('/auth/refresh')).length,
    1,
  )
  assert.ok(calls.every((call) => call.options.credentials === 'include'))
  assert.equal(
    calls.filter(
      (call) => call.options.headers.Authorization === 'Bearer new-token',
    ).length,
    3,
  )
})

test('failed refresh ends the session without retrying the protected request', async () => {
  api.startSession({ accessToken: 'expired' })
  const calls = []
  globalThis.fetch = async (url) => {
    calls.push(url)
    return json(null, 401)
  }
  await assert.rejects(
    api.request('/v1/admin/leads'),
    (error) => error.status === 401,
  )
  assert.equal(calls.length, 2)
  assert.equal(api.getSessionState().status, 'signedOut')
})

test('a second unauthorized response ends the session after one retry', async () => {
  api.startSession({ accessToken: 'old' })
  let count = 0
  globalThis.fetch = async (url) => {
    count++
    return url.endsWith('/auth/refresh')
      ? json({ accessToken: 'new' })
      : json(null, 401)
  }
  await assert.rejects(
    api.request('/v1/admin/leads'),
    (error) => error.status === 401,
  )
  assert.equal(count, 3)
  assert.equal(api.getSessionState().status, 'signedOut')
})

test('422 errors preserve nested field paths and 429 never retries', async () => {
  let count = 0
  globalThis.fetch = async () => {
    count++
    return new Response(
      JSON.stringify({
        message: 'Check your fields',
        error: [
          { path: 'body.assignedTo', message: 'Staff member is inactive' },
        ],
      }),
      { status: 422 },
    )
  }
  await assert.rejects(
    admin.patchAdmin('leads/lead-1', { assignedTo: 'inactive' }),
    (error) => {
      assert.deepEqual(error.fields, [
        { path: 'assignedTo', message: 'Staff member is inactive' },
      ])
      return true
    },
  )
  globalThis.fetch = async () => {
    count++
    return json(null, 429)
  }
  await assert.rejects(
    api.request('/v1/admin/leads'),
    (error) => error.status === 429,
  )
  assert.equal(count, 2)
})

test('CSV downloads use the authenticated request and keep active filters without pagination', async () => {
  api.startSession({ accessToken: 'csv-token' })
  let captured
  let downloaded
  const originalDocument = globalThis.document
  globalThis.document = {
    body: { append() {} },
    createElement: () => ({
      click() {
        downloaded = this.download
      },
      remove() {},
    }),
  }
  globalThis.fetch = async (url, options) => {
    captured = { url, options }
    return new Response('name,email\nTest,test@example.com', {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="filtered-leads.csv"',
      },
    })
  }
  try {
    await admin.exportLeads({
      status: 'new,contacted',
      assignedTo: 'me',
      page: 3,
      limit: 25,
    })
    const url = new URL(captured.url)
    assert.equal(url.searchParams.get('status'), 'new,contacted')
    assert.equal(url.searchParams.get('assignedTo'), 'me')
    assert.ok(!url.searchParams.has('page') && !url.searchParams.has('limit'))
    assert.equal(captured.options.headers.Authorization, 'Bearer csv-token')
    assert.equal(downloaded, 'filtered-leads.csv')
  } finally {
    globalThis.document = originalDocument
  }
})
