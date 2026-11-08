// Smoke-тест API Шага 8 (Node): код от ключа и акты приёма-передачи.
// Запуск: node scripts/smoke-step8.mjs
const BASE = process.env.BASE_URL || 'http://localhost:8080'

let passed = 0
let failed = 0

const ok = (name, cond, extra = '') => {
  if (cond) {
    passed++
    console.log(`  ✓ ${name}`)
  } else {
    failed++
    console.log(`  ✗ ${name} ${extra}`)
  }
}

const req = async (path, { method = 'GET', token, body, params } = {}) => {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const query = params
    ? '?' + Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&')
    : ''
  const res = await fetch(`${BASE}${path}${query}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  })
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { message: text }
  }
  return { status: res.status, data }
}

// Multipart: поля + файлы одним запросом (как форма акта на фронте).
const reqMultipart = async (path, { token, fields = {}, files = [] } = {}) => {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) form.append(key, String(value))
  }
  for (const file of files) form.append('files', file)
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: form })
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { message: text }
  }
  return { status: res.status, data }
}

const login = async (email, password) => {
  const { status, data } = await req('/api/v1/auth/login', {
    method: 'POST',
    body: { email, password }
  })
  if (status !== 200) throw new Error(`login ${email} failed: ${status}`)
  return data.token
}

const iso = (d) => {
  const shifted = new Date(d.getTime() + 5 * 3600 * 1000)
  return shifted.toISOString().slice(0, 10)
}
const daysFromNow = (n) => iso(new Date(Date.now() + n * 86400000))

// 1x1 PNG (для проверки загрузки фото акта).
const pngBytes = () =>
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  )

async function main() {
  console.log(`\n=== Smoke-тест Шага 8 → ${BASE} ===\n`)

  const adminToken = await login('admin@autorrent.kz', 'Admin123!')
  const userToken = await login('user@autorrent.kz', 'User123!')
  const ownerToken = await login('owner@autorrent.kz', 'Owner123!')

  // --- 1. Код от ключа: виден только клиенту-владельцу брони ---
  console.log('1. Код от ключа')
  const my = await req('/api/v1/reservations/my', { token: userToken, params: { size: 20 } })
  ok('GET /reservations/my работает', my.status === 200)
  const mine = my.data?.content || []

  const confirmed = mine.find((r) => r.status === 'CONFIRMED')
  ok('есть подтверждённая бронь клиента', Boolean(confirmed))
  if (confirmed) {
    ok('у подтверждённой брони есть keyCode (4 цифры)',
      /^\d{4}$/.test(confirmed.keyCode || ''), `got=${confirmed.keyCode}`)
    ok('в ответе есть адрес точки выдачи', Boolean(confirmed.pickupAddress))
    ok('в ответе есть координаты',
      typeof confirmed.latitude === 'number' && typeof confirmed.longitude === 'number')
  }

  const pending = mine.find((r) => r.status === 'PENDING')
  if (pending) {
    ok('у брони до подтверждения keyCode отсутствует', pending.keyCode == null,
      `got=${pending.keyCode}`)
  }

  // Клиенту чужой брони / админу / владельцу — код не отдаётся.
  if (confirmed) {
    const asAdmin = await req(`/api/v1/reservations/${confirmed.id}`, { token: adminToken })
    ok('админ не видит keyCode чужой брони', asAdmin.data?.keyCode == null,
      `got=${asAdmin.data?.keyCode}`)

    const asOwner = await req(`/api/v1/reservations/${confirmed.id}`, { token: ownerToken })
    ok('владелец не видит keyCode чужой брони', asOwner.data?.keyCode == null,
      `got=${asOwner.data?.keyCode}`)
  }

  // Генерация при подтверждении: новая бронь → CONFIRMED → keyCode появился.
  const newRes = await req('/api/v1/reservations', {
    method: 'POST', token: userToken,
    body: { carId: 1, startDate: daysFromNow(30), endDate: daysFromNow(33) }
  })
  ok('клиент бронирует машину', newRes.status === 201, `status=${newRes.status}`)
  if (newRes.status === 201) {
    ok('новая бронь без кода (до подтверждения)', newRes.data?.keyCode == null)
    const confirmedNew = await req(`/api/v1/reservations/${newRes.data.id}/status`, {
      method: 'PATCH', token: adminToken, body: { status: 'CONFIRMED' }
    })
    ok('админ подтверждает бронь', confirmedNew.status === 200,
      `status=${confirmedNew.status}`)
    ok('ответ подтверждения скрывает keyCode (это админ)',
      confirmedNew.data?.keyCode == null, `got=${confirmedNew.data?.keyCode}`)

    const ownerView = await req(`/api/v1/reservations/${newRes.data.id}`, { token: userToken })
    ok('владелец брони видит сгенерированный keyCode',
      /^\d{4}$/.test(ownerView.data?.keyCode || ''), `got=${ownerView.data?.keyCode}`)
  }

  // --- 2. Акты приёма-передачи ---
  console.log('\n2. Акты приёма-передачи')
  if (confirmed) {
    const rid = confirmed.id

    const before = await req(`/api/v1/reservations/${rid}/handover`, { token: userToken })
    ok('GET /handover работает у владельца брони', before.status === 200)
    ok('список актов — массив', Array.isArray(before.data))
    const hasPickupBefore = (before.data || []).some((r) => r.type === 'PICKUP')
    const hasReturnBefore = (before.data || []).some((r) => r.type === 'RETURN')

    // Создаём акт выдачи (маленький PNG).
    if (!hasPickupBefore) {
      const file = new File([pngBytes()], 'pickup.png', { type: 'image/png' })
      const created = await reqMultipart(`/api/v1/reservations/${rid}/handover`, {
        token: userToken,
        fields: { type: 'PICKUP', fuelLevel: 'HALF', mileage: 12500, damagesNote: 'Царапина на бампере' },
        files: [file]
      })
      ok('акт выдачи создаётся (201)', created.status === 201,
        `status=${created.status} ${JSON.stringify(created.data)}`)
      ok('акт сохранён с типом PICKUP', created.data?.type === 'PICKUP')
      ok('у акта есть фото', (created.data?.photos || []).length === 1,
        `photos=${JSON.stringify(created.data?.photos)}`)

      if (created.data?.photos?.[0]) {
        const photo = await fetch(`${BASE}${created.data.photos[0]}`)
        ok('фото акта отдаётся по /images/handover/…', photo.status === 200,
          `status=${photo.status}`)
      }

      // Повторный акт выдачи — конфликт.
      const dup = await reqMultipart(`/api/v1/reservations/${rid}/handover`, {
        token: userToken, fields: { type: 'PICKUP' }
      })
      ok('повторный акт выдачи — 409', dup.status === 409, `status=${dup.status}`)

      // Чужой пользователь доступа не имеет.
      const strangerEmail = `stranger${Date.now()}@test.kz`
      await req('/api/v1/auth/register', {
        method: 'POST',
        body: {
          email: strangerEmail, password: 'Test123!', firstName: 'Чужой',
          lastName: 'Пользователь', phone: '+77000000001', drivingLicense: 'B'
        }
      })
      const strangerToken = await login(strangerEmail, 'Test123!').catch(() => null)
      if (strangerToken) {
        const denied = await req(`/api/v1/reservations/${rid}/handover`, { token: strangerToken })
        ok('чужому пользователю акты не отдаются', denied.status !== 200,
          `status=${denied.status}`)
      }
    }

    const after = await req(`/api/v1/reservations/${rid}/handover`, { token: userToken })
    const pickup = (after.data || []).find((r) => r.type === 'PICKUP')
    ok('акт выдачи виден в списке', Boolean(pickup))
    if (pickup) {
      ok('поля акта на месте', pickup.fuelLevel === 'HALF' && pickup.mileage === 12500,
        `fuel=${pickup.fuelLevel} mileage=${pickup.mileage}`)
      ok('заметка о повреждениях сохранена',
        (pickup.damagesNote || '').includes('Царапина'))
    }

    // Акт возврата: у подтверждённой (не активной) брони — нельзя.
    const earlyReturn = await reqMultipart(`/api/v1/reservations/${rid}/handover`, {
      token: userToken, fields: { type: 'RETURN' }
    })
    ok('акт возврата на подтверждённой брони — 409', earlyReturn.status === 409,
      `status=${earlyReturn.status}`)

    // Админ тоже может составить акт (права: админ/владелец техники/клиент).
    if (!hasReturnBefore) {
      const byAdmin = await reqMultipart(`/api/v1/reservations/${rid}/handover`, {
        token: adminToken, fields: { type: 'RETURN' }
      })
      ok('админ не может составить акт возврата до активации (409)', byAdmin.status === 409,
        `status=${byAdmin.status}`)
    }
  }

  console.log(`\n=== Итог: ${passed} успешно, ${failed} ошибок ===\n`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('Ошибка smoke-теста:', err.message)
  process.exit(1)
})
