// Dependency-free Chromium smoke tests. Uses local fixtures; never calls a real API.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createServer } from 'vite'

function installMock() {
  const permissions =
    sessionStorage.getItem('qa-role') === 'sales'
      ? [
          'dashboard:leads',
          'leads:view',
          'leads:update',
          'leads:export',
          'subscriptions:view',
          'plans:view',
          'tenants:view',
        ]
      : ['*']
  const me = {
    id: 'me',
    name: 'QA Admin',
    email: 'qa@example.test',
    role: permissions.includes('*') ? 'super_admin' : 'sales',
    permissions,
  }
  const roles = [
    {
      key: 'super_admin',
      name: 'Super admin',
      permissions: ['*'],
      activeStaff: 1,
    },
    {
      key: 'sales',
      name: 'Sales',
      permissions: ['leads:view'],
      activeStaff: 2,
    },
    {
      key: 'quality',
      name: 'Quality team',
      permissions: ['subscriptions:view'],
      activeStaff: 1,
    },
  ]
  let lead = {
    id: 'lead-1',
    name: 'Test Contact',
    email: 'contact@example.test',
    phone: '03001234567',
    businessName: 'Test Bakery',
    status: 'new',
    lastSource: 'pricing',
    assignedTo: null,
    nextFollowUpAt: null,
    lastSubmissionAt: '2026-11-17T09:00:00Z',
    submissionsCount: 1,
    planKey: 'startup',
    billingInterval: 'month',
    isSpam: false,
    hasSubscription: true,
    notes: [],
    activities: [],
    subscriptions: [],
    submissions: [
      {
        id: 'submission-1',
        source: 'pricing',
        topic: 'Startup plan',
        message: 'Please call about setup.',
        branchCount: 2,
        createdAt: '2026-11-17T09:00:00Z',
      },
    ],
  }
  let subscription = {
    id: 'sub-1',
    email: lead.email,
    lead: {
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      businessName: lead.businessName,
    },
    planKey: 'startup',
    billingInterval: 'month',
    status: 'trial',
    onboardingStatus: 'pending',
    onboardingAssignedTo: null,
    onboardingNotes: 'Original notes',
    trialEndsAt: '2026-11-24T09:00:00Z',
    createdAt: '2026-11-17T09:00:00Z',
    currentPeriodEnd: '2026-12-17T09:00:00Z',
    price: { amount: 12900, currency: 'usd' },
    history: [],
    stripe: {
      customerUrl: 'https://dashboard.stripe.com/test/customers/test',
      subscriptionUrl: 'https://dashboard.stripe.com/test/subscriptions/test',
    },
  }
  lead.subscriptions = [subscription]
  subscription.tenant = null
  let tenant = {
    id: 'tenant-1',
    slug: 'test-bakery',
    name: 'Test Bakery',
    status: 'onboarding',
    plan: {
      key: 'startup',
      interval: 'month',
      status: 'trial',
      onboardingStatus: 'in_progress',
    },
    owner: null,
    pendingOwnerInvite: true,
    createdAt: '2026-11-17T10:00:00Z',
    wentLiveAt: null,
    timezone: 'Asia/Karachi',
    currencyCode: 'PKR',
    contactEmail: lead.email,
    contactPhone: null,
    suspendedAt: null,
    suspendedReason: null,
    subscriptionId: 'sub-1',
    theme: {
      preset: 'indigo',
      primary: '#554CF1',
      appName: null,
      currencySymbol: 'Rs',
      logoUrl: null,
    },
    people: 0,
    branches: { active: 1, total: 2 },
    owners: [],
    pendingInvites: [
      {
        id: 'tinvite-1',
        email: 'owner@example.test',
        role: 'tenant_owner',
        expiresAt: '2026-11-16T10:00:00Z',
        expired: true,
      },
    ],
    recentActivity: [
      {
        id: 'act-1',
        action: 'tenant.created',
        actor: { type: 'staff', id: 'me', name: 'QA Admin' },
        createdAt: '2026-11-17T10:00:00Z',
      },
      {
        id: 'act-2',
        action: 'tenant.owner_invited',
        actor: { type: 'staff', id: 'me', name: 'Second Actor' },
        createdAt: '2026-11-17T11:00:00Z',
      },
    ],
  }
  const staff = [
    { ...me, isActive: true, activeSessions: 2, recentActivity: [] },
    {
      id: 'staff-2',
      name: 'Test Staff',
      email: 'staff@example.test',
      role: 'sales',
      roleName: 'Sales',
      permissions: ['leads:view'],
      isActive: true,
      isLocked: true,
      lockedUntil: '2026-11-17T15:00:00Z',
      activeSessions: 3,
      recentActivity: [],
    },
  ]
  const invites = [
    {
      id: 'invite-1',
      email: 'invite@example.test',
      name: 'Test Invite',
      role: 'sales',
      invitedBy: me,
      expired: true,
      expiresAt: '2026-11-16T09:00:00Z',
    },
  ]
  const email = {
    id: 'email-1',
    recipients: ['contact@example.test', 'owner@example.test'],
    subject: 'Welcome to Test Bakery',
    template: 'subscription_welcome',
    status: 'failed',
    error: 'Test provider unavailable',
    createdAt: '2026-11-17T09:00:00Z',
  }
  const audit = {
    id: 'audit-1',
    staff: me,
    action: 'lead.updated',
    entityType: 'lead',
    entityId: 'lead-1',
    changes: { status: { from: 'new', to: 'contacted' } },
    createdAt: '2026-11-17T09:00:00Z',
  }
  window.__requests = []
  window.fetch = async (input, options = {}) => {
    const url = new URL(String(input), location.origin)
    const path = url.pathname.replace('/v1/admin/', '')
    const method = options.method ?? 'GET'
    const body = options.body ? JSON.parse(options.body) : undefined
    window.__requests.push({
      path,
      method,
      body,
      query: Object.fromEntries(url.searchParams),
    })
    const response = (data, status = 200, extra = {}) =>
      new Response(JSON.stringify({ success: status < 400, data, ...extra }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
    const list = (items, key) =>
      response({
        [key]: items,
        pagination: {
          currentPage: Number(url.searchParams.get('page') || 1),
          itemsPerPage: Number(url.searchParams.get('limit') || 10),
          totalItems: 21,
          totalPages: 3,
        },
      })
    if (window.__failure?.path === path) {
      const failure = window.__failure
      window.__failure = null
      return response(null, failure.status, {
        message: 'Please check the highlighted field.',
        error: failure.fields,
      })
    }
    if (path === 'auth/refresh')
      return response({ accessToken: 'mock-token', staff: me })
    if (path === 'auth/logout') return response(null)
    if (path === 'me') return response(me)
    if (path === 'leads/assignees' || path === 'subscriptions/assignees')
      return response([{ id: 'staff-2', name: 'Test Staff' }])
    if (path === 'leads/export')
      return new Response('name,email\nTest,contact@example.test', {
        headers: {
          'Content-Disposition': 'attachment; filename="qa-leads.csv"',
        },
      })
    if (path === 'leads') return list([lead], 'leads')
    if (path === 'leads/lead-1/notes') {
      const note = {
        id: 'note-1',
        ...body,
        staff: me,
        createdAt: new Date().toISOString(),
      }
      lead.notes.unshift(note)
      return response(note, 201)
    }
    if (path === 'leads/lead-1') {
      if (method === 'PATCH')
        lead = {
          ...lead,
          ...body,
          assignedTo:
            'assignedTo' in body
              ? body.assignedTo
                ? { id: body.assignedTo, name: 'Test Staff' }
                : null
              : lead.assignedTo,
        }
      return response(lead)
    }
    if (path === 'subscriptions') return list([subscription], 'subscriptions')
    if (path === 'subscriptions/sub-1/onboarding') {
      subscription = {
        ...subscription,
        ...body,
        onboardingNotes: body.notes ?? subscription.onboardingNotes,
      }
      return response(subscription)
    }
    if (path === 'subscriptions/sub-1') return response(subscription)
    if (path === 'subscriptions/sub-1/create-tenant') {
      if (subscription.tenant) return response(null, 409)
      tenant = { ...tenant, name: body.name, slug: body.slug ?? 'test-bakery' }
      subscription.tenant = {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        status: tenant.status,
      }
      return response(
        {
          tenant,
          invite: {
            email: body.ownerEmail,
            expiresAt: '2026-11-19T10:00:00Z',
            emailSent: false,
          },
        },
        201,
      )
    }
    if (path === 'tenants') return list([tenant], 'tenants')
    if (path === 'tenants/tenant-1') return response(tenant)
    if (path === 'tenants/tenant-1/status') {
      tenant =
        body.action === 'suspend'
          ? {
              ...tenant,
              status: 'suspended',
              suspendedAt: '2026-11-18T09:00:00Z',
              suspendedReason: body.reason,
            }
          : {
              ...tenant,
              status: 'onboarding',
              suspendedAt: null,
              suspendedReason: null,
            }
      return response(tenant)
    }
    if (path === 'tenants/tenant-1/owner-invite')
      return response({
        email: body.email ?? 'owner@example.test',
        expiresAt: '2026-11-20T10:00:00Z',
        emailSent: true,
      })
    if (path === 'staff/roles') return response(roles)
    if (path === 'staff/invites') {
      if (method === 'POST') {
        invites.unshift({
          id: `invite-${invites.length + 1}`,
          ...body,
          expiresAt: '2026-11-19T09:00:00Z',
        })
        return response(invites[0], 201)
      }
      return response(invites)
    }
    if (path.startsWith('staff/invites/') && method === 'DELETE') {
      const index = invites.findIndex((i) => i.id === path.split('/')[2])
      invites.splice(index, 1)
      return response(null)
    }
    if (path === 'staff') return list(staff, 'staff')
    if (path.startsWith('staff/')) {
      const entry = staff.find((s) => s.id === path.split('/')[1])
      if (method === 'PATCH') Object.assign(entry, body)
      if (path.endsWith('/unlock'))
        Object.assign(entry, { lockedUntil: null, isLocked: false })
      if (path.endsWith('/revoke-sessions')) entry.activeSessions = 0
      return response(entry)
    }
    if (path === 'email-logs/templates')
      return response(['subscription_welcome', 'staff_invite'])
    if (path === 'audit-logs/actions')
      return response(['lead.updated', 'staff.updated'])
    if (path === 'email-logs') return list([email], 'emailLogs')
    if (path === 'audit-logs') return list([audit], 'auditLogs')
    if (path === 'plans')
      return response([
        {
          key: 'startup',
          name: 'Startup',
          description: 'Start selling online',
          isActive: true,
          isPublic: true,
          needsStripeSync: true,
          subscriptionsCount: 4,
          features: ['Online ordering'],
          limits: { locations: 1, products: null },
          prices: [
            {
              interval: 'month',
              amount: 12900,
              currency: 'usd',
              trialDays: 7,
              stripeLinked: false,
            },
          ],
        },
      ])
    if (path === 'dashboard')
      return response({
        range: { from: '2026-10-19', to: '2026-11-17' },
        generatedAt: new Date().toISOString(),
        leads: {
          newLeads: 12,
          conversionPercent: null,
          spamInRange: 2,
          byDay: [{ day: '2026-11-17', count: 12 }],
          bySource: [{ source: 'pricing', count: 12 }],
          statusSnapshot: { new: 12 },
          needsAttention: { unassignedNew: 3, followUpsDue: 2 },
          mine: { open: 7, followUpsDue: 2 },
        },
        ...(permissions.includes('*')
          ? {
              onboarding: {
                statusCounts: { pending: 2, in_progress: 3, live: 4 },
                needsAttention: { unassigned: 1, waitingOverThreeDays: 2 },
                mine: { open: 2 },
                wentLiveInRange: 4,
                avgDaysToLive: 2.5,
                oldestWaiting: [subscription],
              },
              subscriptions: {
                byStatus: { trial: 1, active: 4 },
                trialsEndingSoon: { count: 1, items: [subscription] },
                pastDue: { count: 0, items: [] },
                cancelling: 0,
                startedInRange: 1,
                startedByDay: [{ day: '2026-11-17', count: 1 }],
              },
              revenue: {
                mrr: [{ currency: 'usd', amount: 51600 }],
                payingSubscriptions: 4,
                trialMrr: [{ currency: 'usd', amount: 12900 }],
                trialSubscriptions: 1,
                unpricedPayingSubscriptions: 0,
                failedPaymentsLast30Days: 0,
                cancellationsInRange: 0,
              },
            }
          : {}),
      })
    return response(null, 404, {
      message: `No QA fixture for ${method} ${path}`,
    })
  }
}

const chromium =
  process.env.CHROME_PATH ||
  [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
  ].find(existsSync)
assert.ok(chromium, 'Install Chromium or set CHROME_PATH to run browser tests')
const profilePrefix = resolve(tmpdir(), 'cozy-admin-qa-')
const profile = await mkdtemp(profilePrefix)
console.log('QA: starting local preview')
let browser, server, socket
try {
  server = await createServer({
    server: { host: '127.0.0.1', port: 0, strictPort: false },
  })
  await server.listen()
  const origin = server.resolvedUrls.local[0]
  console.log(`QA: preview ready at ${origin}`)
  browser = spawn(
    chromium,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    { windowsHide: true },
  )
  const debuggingUrl = await new Promise((resolveUrl, reject) => {
    let output = ''
    const timeout = setTimeout(
      () => reject(new Error('Chromium startup timed out')),
      20000,
    )
    browser.once('error', reject)
    browser.stderr.on('data', (chunk) => {
      output += chunk
      const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/)
      if (match) {
        clearTimeout(timeout)
        resolveUrl(match[1])
      }
    })
    browser.once('exit', (code) => {
      clearTimeout(timeout)
      reject(new Error(`Chromium exited ${code}: ${output.slice(-1000)}`))
    })
  })
  console.log('QA: Chromium ready')
  socket = new WebSocket(debuggingUrl)
  await new Promise((resolveOpen, reject) => {
    socket.addEventListener('open', resolveOpen)
    socket.addEventListener('error', reject)
  })
  let nextId = 0
  const pending = new Map()
  const errors = []
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data)
    if (message.id) {
      const entry = pending.get(message.id)
      pending.delete(message.id)
      message.error
        ? entry.reject(new Error(message.error.message))
        : entry.resolve(message.result)
    }
    if (message.method === 'Runtime.exceptionThrown')
      errors.push(
        message.params.exceptionDetails.exception?.description ??
          message.params.exceptionDetails.text,
      )
    if (
      message.method === 'Runtime.consoleAPICalled' &&
      message.params.type === 'error'
    )
      errors.push(
        message.params.args.map((a) => a.value ?? a.description).join(' '),
      )
  })
  const command = (method, params = {}, sessionId) =>
    new Promise((resolveCommand, reject) => {
      const id = ++nextId
      const timeout = setTimeout(() => {
        pending.delete(id)
        reject(new Error(`CDP timeout: ${method}`))
      }, 15000)
      pending.set(id, {
        resolve: (value) => {
          clearTimeout(timeout)
          resolveCommand(value)
        },
        reject: (error) => {
          clearTimeout(timeout)
          reject(error)
        },
      })
      socket.send(JSON.stringify({ id, method, params, sessionId }))
    })
  const { targetId } = await command('Target.createTarget', {
    url: 'about:blank',
  })
  const { sessionId } = await command('Target.attachToTarget', {
    targetId,
    flatten: true,
  })
  const send = (method, params) => command(method, params, sessionId)
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `(${installMock.toString()})()`,
  })
  const evaluate = async (fn, ...args) => {
    const result = await send('Runtime.evaluate', {
      expression: `(${fn.toString()})(...${JSON.stringify(args)})`,
      returnByValue: true,
      awaitPromise: true,
    })
    if (result.exceptionDetails)
      throw new Error(
        result.exceptionDetails.exception?.description ??
          result.exceptionDetails.text,
      )
    return result.result.value
  }
  const waitFor = async (fn, ...args) => {
    const deadline = Date.now() + 12000
    while (Date.now() < deadline) {
      if (await evaluate(fn, ...args)) return
      await new Promise((r) => setTimeout(r, 80))
    }
    throw new Error(
      `Browser assertion timed out: ${fn} ${JSON.stringify(args)}\n${await evaluate(() => document.body.innerText)}`,
    )
  }
  const navigate = async (path) => {
    await send('Page.navigate', { url: origin.replace(/\/$/, '') + path })
    await waitFor(
      () =>
        !document.querySelector('.admin-boot') &&
        Boolean(document.querySelector('h1, .admin-empty')),
    )
  }
  const click = async (text) =>
    evaluate((target) => {
      const el = [...document.querySelectorAll('button, a, summary')].find(
        (e) => e.textContent.trim() === target,
      )
      if (!el) throw new Error(`Missing control: ${target}`)
      el.click()
    }, text)
  const fill = async (title, value) =>
    evaluate(
      (name, next) => {
        const label = [...document.querySelectorAll('label')]
          .filter((el) => el.textContent.trim() === name)
          .at(-1)
        const input = label && document.getElementById(label.htmlFor)
        if (!input) throw new Error(`Missing field ${name}`)
        const prototype =
          input.tagName === 'SELECT'
            ? HTMLSelectElement.prototype
            : input.tagName === 'TEXTAREA'
              ? HTMLTextAreaElement.prototype
              : HTMLInputElement.prototype
        Object.getOwnPropertyDescriptor(prototype, 'value').set.call(
          input,
          next,
        )
        input.dispatchEvent(
          new Event(input.tagName === 'SELECT' ? 'change' : 'input', {
            bubbles: true,
          }),
        )
      },
      title,
      value,
    )
  const waitText = (text) =>
    waitFor((target) => document.body.innerText.includes(target), text)
  const waitRequest = (path, method, body) =>
    waitFor(
      (p, m, b) =>
        window.__requests.some(
          (r) =>
            r.path === p &&
            r.method === m &&
            (!b ||
              Object.entries(b).every(
                ([key, value]) => r.body?.[key] === value,
              )),
        ),
      path,
      method,
      body,
    )
  const screenshot = async (name) => {
    if (!process.env.QA_SCREENSHOTS) return
    await mkdir(process.env.QA_SCREENSHOTS, { recursive: true })
    const { cssContentSize } = await send('Page.getLayoutMetrics')
    const { data } = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
      clip: {
        x: 0,
        y: 0,
        width: cssContentSize.width,
        height: cssContentSize.height,
        scale: 1,
      },
    })
    await writeFile(
      join(process.env.QA_SCREENSHOTS, `${name}.png`),
      Buffer.from(data, 'base64'),
    )
  }

  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await navigate('/')
  await waitText('Revenue estimates')
  await waitText('$516.00')
  await screenshot('dashboard')
  await click('Last 7 days')
  await waitFor(() =>
    window.__requests.some(
      (r) => r.path === 'dashboard' && r.query.from && r.query.to,
    ),
  )
  console.log('PASS: live dashboard sections, currency and date presets')

  await navigate('/leads?assignedTo=me&page=2')
  await waitText('Test Contact')
  await screenshot('leads')
  await fill('Search', 'Test')
  await waitFor(
    () =>
      location.search.includes('q=Test') &&
      !new URLSearchParams(location.search).has('page'),
  )
  await click('Next')
  await waitFor(() => new URLSearchParams(location.search).get('page') === '2')
  await waitText('Test Contact')
  await evaluate(() =>
    document.querySelector('a[href="/leads/lead-1"]').click(),
  )
  await waitText('Manage lead')
  await fill('Status', 'contacted')
  await fill('Follow-up (Karachi, UTC+5)', '2026-11-20T14:30')
  await evaluate(() => {
    window.__failure = {
      path: 'leads/lead-1',
      status: 422,
      fields: [{ path: 'status', message: 'This status is unavailable.' }],
    }
  })
  await click('Save changes')
  await waitText('This status is unavailable.')
  assert.ok(
    await evaluate(() =>
      [...document.querySelectorAll('select')].some(
        (s) => s.getAttribute('aria-invalid') === 'true',
      ),
    ),
  )
  await click('Save changes')
  await waitRequest('leads/lead-1', 'PATCH', {
    status: 'contacted',
    nextFollowUpAt: '2026-11-20T14:30:00+05:00',
  })
  await fill('Add internal note', 'Call after lunch')
  await click('Add note')
  await waitText('Call after lunch')
  await click('Delete lead')
  await waitText('cannot be undone')
  await click('Cancel')
  assert.equal(
    await evaluate(
      () => window.__requests.filter((r) => r.method === 'DELETE').length,
    ),
    0,
  )
  console.log(
    'PASS: lead filters, paging, detail navigation, partial updates, timezone, notes and deletion confirmation',
  )

  await navigate('/subscriptions/sub-1')
  await waitText('Manage onboarding')
  await fill('Onboarding status', 'live')
  await click('Save changes')
  await waitText('Mark this bakery as live?')
  assert.equal(
    await evaluate(
      () => window.__requests.filter((r) => r.method === 'PATCH').length,
    ),
    0,
  )
  await click('Confirm')
  await waitRequest('subscriptions/sub-1/onboarding', 'PATCH', {
    onboardingStatus: 'live',
  })
  assert.ok(
    await evaluate(() => !document.querySelector('select[name="status"]')),
  )
  console.log('PASS: onboarding live confirmation and read-only billing')

  const submitDialog = () =>
    evaluate(() =>
      document.querySelector('.admin-dialog button[type="submit"]').click(),
    )
  await navigate('/subscriptions/sub-1')
  await click('Create bakery')
  await waitText('Address: test-bakery')
  await fill('Address name (optional)', 'Taken Name')
  await waitText('Address: taken-name')
  await evaluate(() => {
    window.__failure = {
      path: 'subscriptions/sub-1/create-tenant',
      status: 422,
      fields: [{ path: 'body.slug', message: 'That address is taken.' }],
    }
  })
  await submitDialog()
  await waitText('That address is taken.')
  await fill('Address name (optional)', 'qa-bakery')
  await submitDialog()
  await waitRequest('subscriptions/sub-1/create-tenant', 'POST', {
    name: 'Test Bakery',
    slug: 'qa-bakery',
    ownerName: 'Test Contact',
    ownerEmail: 'contact@example.test',
  })
  assert.ok(
    await evaluate(
      () =>
        !(
          'currencyCode' in
          window.__requests.findLast((r) => r.path.endsWith('create-tenant'))
            .body
        ),
    ),
    'Unchanged defaults are left to the server',
  )
  await waitFor(() => location.pathname === '/bakeries/tenant-1')
  await waitText('did not go out')
  await waitText('2 branches, 1 switched off')
  await waitText('Expired')
  assert.ok(
    await evaluate(() =>
      document
        .querySelector('.admin-timeline li')
        ?.innerText.includes('Second Actor'),
    ),
    'Activity is newest first with the actor name',
  )
  await screenshot('bakery-detail')
  await click('Send invitation again')
  await submitDialog()
  await waitText('A fresh invitation was emailed to owner@example.test')
  assert.equal(
    await evaluate(
      () =>
        Object.keys(
          window.__requests.find((r) => r.path.endsWith('owner-invite')).body,
        ).length,
    ),
    0,
    'Resending to the same address sends an empty body',
  )
  await click('Suspend bakery')
  await waitText('signed out at once')
  await fill('Reason', 'Payment dispute')
  await submitDialog()
  await waitRequest('tenants/tenant-1/status', 'PATCH', {
    action: 'suspend',
    reason: 'Payment dispute',
  })
  await waitText('Reason: Payment dispute')
  await click('Reactivate bakery')
  await click('Confirm')
  await waitRequest('tenants/tenant-1/status', 'PATCH', {
    action: 'reactivate',
  })
  await waitFor(() => !document.body.innerText.includes('Reason: Payment'))
  console.log(
    'PASS: create bakery with slug preview and field errors, invite warning and resend, suspend and reactivate',
  )

  await navigate('/bakeries?status=live,suspended')
  await waitText('Invitation pending')
  await waitText('test-bakery')
  await waitFor(() =>
    window.__requests.some(
      (r) => r.path === 'tenants' && r.query.status === 'live,suspended',
    ),
  )
  await fill('Search', 'owner@example.test')
  await waitFor(() =>
    window.__requests.some(
      (r) => r.path === 'tenants' && r.query.q === 'owner@example.test',
    ),
  )
  await screenshot('bakeries')
  console.log(
    'PASS: bakeries list, owner invitation state, search and status filter',
  )

  await navigate('/plans')
  await waitText('Some prices are not linked to Stripe yet.')
  await waitText('$129.00')
  await click('4 subscriptions')
  await waitFor(
    () =>
      location.pathname === '/subscriptions' &&
      location.search.includes('planKey=startup'),
  )
  console.log('PASS: read-only plans, cents conversion and subscription links')

  await navigate('/staff')
  await waitText('Quality team')
  await fill('Full name', 'New Person')
  await fill('Work email', 'new@example.test')
  await fill('Role', 'quality')
  await click('Send invitation')
  await waitRequest('staff/invites', 'POST', { role: 'quality' })
  await waitText('Invitation sent to new@example.test.')
  await navigate('/staff/staff-2')
  await waitText('Edit staff member')
  await click('Unlock account')
  await waitRequest('staff/staff-2/unlock', 'POST')
  await waitFor(
    () =>
      ![...document.querySelectorAll('button')].some(
        (b) => b.textContent === 'Unlock account',
      ),
  )
  await fill('Role', 'quality')
  await click('Save changes')
  await waitText('They will lose access')
  await click('Confirm')
  await waitRequest('staff/staff-2', 'PATCH', { role: 'quality' })
  await click('Sign out everywhere')
  await click('Confirm')
  await waitRequest('staff/staff-2/revoke-sessions', 'POST')
  await navigate('/staff/me')
  await waitText('You cannot change your own role')
  assert.ok(
    await evaluate(() =>
      [...document.querySelectorAll('select')].some((s) => s.disabled),
    ),
  )
  assert.ok(
    await evaluate(
      () => !document.body.innerText.includes('Switch off account'),
    ),
  )
  console.log(
    'PASS: dynamic roles, invitations, unlock, role confirmations, session revocation and self-protection',
  )

  await navigate('/audit-logs?staffUserId=staff-2')
  await waitText('Changed a lead')
  await waitText('new → contacted')
  await navigate('/email-logs?leadId=lead-1')
  await waitText('Welcome to Test Bakery')
  await click('Error details')
  await waitText('Test provider unavailable')
  console.log('PASS: audit changes, linked filters and email failure details')

  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })
  await navigate('/leads')
  await waitText('Test Contact')
  await screenshot('leads-mobile')
  assert.ok(
    await evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    'Mobile page should not overflow horizontally',
  )
  await evaluate(() => {
    sessionStorage.setItem('qa-role', 'sales')
  })
  await navigate('/')
  await waitText('Needs attention')
  assert.ok(
    await evaluate(
      () =>
        !document.body.innerText.includes('Revenue estimates') &&
        !document.querySelector('nav').innerText.includes('Staff'),
    ),
  )
  await navigate('/staff')
  await waitText('You do not have access to this')
  assert.equal(
    await evaluate(
      () => window.__requests.filter((r) => r.path.startsWith('staff')).length,
    ),
    0,
  )
  await navigate('/subscriptions/sub-1')
  await waitText('Onboarding notes')
  assert.ok(
    await evaluate(
      () => !document.body.innerText.includes('Manage onboarding'),
    ),
  )
  await navigate('/bakeries/tenant-1')
  await waitText('Recent activity')
  assert.ok(
    await evaluate(
      () =>
        document.querySelector('nav').innerText.includes('Bakeries') &&
        !document.body.innerText.includes('Suspend bakery') &&
        !document.body.innerText.includes('Send invitation again'),
    ),
    'Sales sees bakeries but cannot suspend or invite',
  )
  await navigate('/subscriptions/sub-1')
  await waitText('Onboarding or a super admin creates it.')
  console.log(
    'PASS: mobile layout, permission-gated menus, direct routes and onboarding controls',
  )

  assert.deepEqual(errors, [], 'No browser runtime errors or React warnings')
  console.log('All browser smoke tests passed.')
} finally {
  socket?.close()
  if (browser && browser.exitCode === null) {
    browser.kill()
    await new Promise((resolveExit) => {
      browser.once('exit', resolveExit)
      setTimeout(resolveExit, 3000)
    })
  }
  await server?.close()
  // Remove only the unique profile directory created by this test run.
  if (
    resolve(profile).startsWith(profilePrefix) &&
    resolve(profile) !== profilePrefix
  )
    await rm(profile, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 200,
    })
}
