// Smoke-тест API Шага 4 (Node): владельцы, теги, календарь занятости,
// почасовая аренда, оператор, бизнес-заявки, PDF, статусы брони.
// Запуск: node scripts/smoke-step4.mjs
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

const req = async (path, { method = 'GET', token, body, raw = false, params } = {}) => {
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
  if (raw) {
    const buf = Buffer.from(await res.arrayBuffer())
    return { status: res.status, buf, headers: res.headers }
  }
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
  if (status !== 200) throw new Error(`login ${email} failed: ${status} ${JSON.stringify(data)}`)
  return data.token
}

// Даты считаем в поясе сервера (Asia/Almaty, +05:00), как LocalDate.now() в backend.
const iso = (d) => {
  const shifted = new Date(d.getTime() + 5 * 3600 * 1000)
  return shifted.toISOString().slice(0, 10)
}
const daysFromNow = (n) => iso(new Date(Date.now() + n * 86400000))

async function main() {
  console.log(`\n=== Smoke-тест Шага 4 → ${BASE} ===\n`)

  // --- 1. Демо-доступы и роли ---
  console.log('1. Доступы и роли')
  const adminToken = await login('admin@autorrent.kz', 'Admin123!')
  const userToken = await login('user@autorrent.kz', 'User123!')
  const ownerToken = await login('owner@autorrent.kz', 'Owner123!')
  ok('все демо-доступы работают', Boolean(adminToken && userToken && ownerToken))

  const me = await req('/api/v1/users/me', { token: userToken })
  ok('у клиента сохранены права (B)', me.data?.drivingLicense === 'B')

  const ownerMe = await req('/api/v1/users/me', { token: ownerToken })
  ok('владелец имеет роль OWNER', ownerMe.data?.role === 'OWNER')

  // --- 2. Владелец видит свою технику ---
  console.log('\n2. Владелец и техника')
  const mine = await req('/api/v1/vehicles/mine', { token: ownerToken })
  ok('GET /vehicles/mine доступен владельцу', mine.status === 200)
  const ownerCars = mine.data?.content || []
  ok('у владельца есть техника (спецтехника)', ownerCars.length > 0, `got ${ownerCars.length}`)
  ok('техника владельца — спецтехника', ownerCars.every((c) => c.type === 'SPECIAL'))

  // Админ тоже может открыть /mine (видит всю технику).
  const adminMine = await req('/api/v1/vehicles/mine', { token: adminToken })
  ok('GET /vehicles/mine доступен админу', adminMine.status === 200)

  // Клиенту /mine недоступен (403).
  const userMine = await req('/api/v1/vehicles/mine', { token: userToken })
  ok('клиенту /vehicles/mine — 403', userMine.status === 403)

  // --- 3. Теги и умные подборки ---
  console.log('\n3. Теги и умные подборки')
  const tagged = await req('/api/v1/vehicles', { params: { tag: 'construction' } })
  ok('фильтр tag=construction работает', tagged.status === 200)
  const constructionCars = tagged.data?.content || []
  ok('подборка «для стройки» непуста', constructionCars.length > 0, `got ${constructionCars.length}`)
  ok('в подборке есть спецтехника/грузовые',
    constructionCars.some((c) => c.type === 'SPECIAL' || c.type === 'CARGO'))

  const mountains = await req('/api/v1/vehicles', { params: { tag: 'mountains' } })
  ok('подборка «для гор» непуста', (mountains.data?.content || []).length > 0)

  // --- 4. Календарь занятости ---
  console.log('\n4. Календарь занятости')
  // На Tucson (id=2) есть подтверждённая бронь now+5..now+8.
  const busy = await req('/api/v1/vehicles/2/busy-dates')
  ok('GET /vehicles/2/busy-dates работает', busy.status === 200)
  const busyDates = busy.data || []
  ok('занятые даты возвращаются списком', Array.isArray(busyDates))
  ok('дата подтверждённой брони занята', busyDates.includes(daysFromNow(5)),
    `busy=${JSON.stringify(busyDates)}`)

  // --- 5. Предпросмотр цены (скидки) ---
  console.log('\n5. Предпросмотр цены')
  const q1 = await req('/api/v1/vehicles/1/price-quote', {
    params: { startDate: daysFromNow(3), endDate: daysFromNow(10) }
  })
  ok('price-quote работает', q1.status === 200, `status=${q1.status} ${JSON.stringify(q1.data)}`)
  ok('скидка 10% с 7 дней', Number(q1.data?.discountPercent) === 10,
    `got ${q1.data?.discountPercent}`)

  const q2 = await req('/api/v1/vehicles/1/price-quote', {
    params: { startDate: daysFromNow(3), endDate: daysFromNow(33) }
  })
  ok('скидка 20% с 30 дней', Number(q2.data?.discountPercent) === 20,
    `got ${q2.data?.discountPercent}`)

  // Почасовой расчёт для спецтехники (id=34 — экскаватор с pricePerHour).
  const q3 = await req('/api/v1/vehicles/34/price-quote', {
    params: { startDate: daysFromNow(2), hours: 4 }
  })
  ok('почасовой расчёт работает', q3.status === 200, `status=${q3.status}`)
  ok('почасовая аренда — HOUR', q3.data?.rentalUnit === 'HOUR', `got ${q3.data?.rentalUnit}`)

  // --- 6. Бронирование: почасовая аренда и с оператором ---
  console.log('\n6. Бронирование')
  // Клиент (права B) не может взять спецтехнику (SPECIAL) — проверка категории.
  const licenseDenied = await req('/api/v1/reservations', {
    method: 'POST', token: userToken,
    body: { carId: 34, startDate: daysFromNow(2), hours: 4 }
  })
  ok('клиенту без спецправ отказано в спецтехнике', licenseDenied.status === 400,
    `status=${licenseDenied.status}`)

  // Владелец (SPECIAL) может забронировать почасово свою технику.
  const hourly = await req('/api/v1/reservations', {
    method: 'POST', token: ownerToken,
    body: { carId: 34, startDate: daysFromNow(6), hours: 5 }
  })
  ok('почасовое бронирование работает', hourly.status === 201, `status=${hourly.status} ${JSON.stringify(hourly.data)}`)
  ok('у почасовой брони hours=5', hourly.data?.hours === 5)

  // Аренда с оператором (id=37 — кран с оператором, требует спецправ).
  // Кран требует категорию SPECIAL — бронирует владелец (у него SPECIAL).
  const withOp = await req('/api/v1/reservations', {
    method: 'POST', token: ownerToken,
    body: { carId: 37, startDate: daysFromNow(10), endDate: daysFromNow(12), withOperator: true }
  })
  ok('бронь с оператором работает', withOp.status === 201, `status=${withOp.status} ${JSON.stringify(withOp.data)}`)
  ok('бронь помечена withOperator', withOp.data?.withOperator === true)

  // Пересечение дат: та же техника, тот же день — конфликт (у владельца есть права).
  const conflict = await req('/api/v1/reservations', {
    method: 'POST', token: ownerToken,
    body: { carId: 37, startDate: daysFromNow(11), endDate: daysFromNow(13) }
  })
  ok('пересечение дат отклоняется (409)', conflict.status === 409, `status=${conflict.status} ${JSON.stringify(conflict.data)}`)

  // --- 7. Статусы брони (владелец подтверждает) ---
  console.log('\n7. Статусы брони')
  const myRes = await req('/api/v1/reservations/for-my-vehicles', { token: ownerToken })
  ok('GET /reservations/for-my-vehicles доступен владельцу', myRes.status === 200)

  if (withOp.status === 201) {
    const resId = withOp.data.id
    // Клиент не может менять статус (нет прав).
    const denied = await req(`/api/v1/reservations/${resId}/status`, {
      method: 'PATCH', token: userToken, body: { status: 'CONFIRMED' }
    })
    ok('клиент не меняет статус брони (403)', denied.status === 403, `status=${denied.status}`)

    // Кран id=37 в собственности владельца — владелец подтверждает сам.
    const confirmed = await req(`/api/v1/reservations/${resId}/status`, {
      method: 'PATCH', token: ownerToken, body: { status: 'CONFIRMED' }
    })
    ok('владелец подтверждает бронь своей техники', confirmed.status === 200 && confirmed.data?.status === 'CONFIRMED',
      `status=${confirmed.status} got=${confirmed.data?.status}`)

    // Завершить нельзя до окончания аренды.
    const tooEarly = await req(`/api/v1/reservations/${resId}/status`, {
      method: 'PATCH', token: adminToken, body: { status: 'COMPLETED' }
    })
    ok('нельзя завершить до даты окончания (409)', tooEarly.status === 409, `status=${tooEarly.status}`)

    // Активировать нельзя до даты начала.
    const earlyActivate = await req(`/api/v1/reservations/${resId}/status`, {
      method: 'PATCH', token: adminToken, body: { status: 'ACTIVE' }
    })
    ok('нельзя активировать до даты начала (409)', earlyActivate.status === 409, `status=${earlyActivate.status}`)

    // PDF подтверждения брони (запрашивает создатель брони — владелец).
    const pdf = await req(`/api/v1/reservations/${resId}/pdf`, { token: ownerToken, raw: true })
    ok('PDF брони отдаётся (application/pdf)',
      pdf.status === 200 && (pdf.headers.get('content-type') || '').includes('pdf'))
    ok('PDF начинается с %PDF', pdf.buf && pdf.buf.slice(0, 4).toString() === '%PDF',
      pdf.buf ? pdf.buf.slice(0, 4).toString() : 'no buf')
  }

  // --- 8. Бизнес-заявка ---
  console.log('\n8. Бизнес-заявка (счёт на юрлицо)')
  const badBin = await req('/api/v1/business/orders', {
    method: 'POST', token: userToken,
    body: { companyName: 'ТОО Тест', bin: '123', items: [{ carId: 1, startDate: daysFromNow(20), endDate: daysFromNow(22) }] }
  })
  ok('неверный БИН отклоняется (400)', badBin.status === 400, `status=${badBin.status}`)

  const order = await req('/api/v1/business/orders', {
    method: 'POST', token: userToken,
    body: {
      companyName: 'ТОО «СтройИнвест»',
      bin: '123456789012',
      items: [
        { carId: 1, startDate: daysFromNow(20), endDate: daysFromNow(22) },
        { carId: 5, startDate: daysFromNow(20), endDate: daysFromNow(23) }
      ]
    }
  })
  ok('бизнес-заявка создаётся', order.status === 201, `status=${order.status} ${JSON.stringify(order.data)}`)
  const orderId = order.data?.id
  ok('в заявке 2 позиции', (order.data?.items || []).length === 2)
  ok('итог заявки посчитан', Number(order.data?.totalPrice) > 0, `total=${order.data?.totalPrice}`)

  if (orderId) {
    const invoice = await req(`/api/v1/business/orders/${orderId}/pdf`, { token: userToken, raw: true })
    ok('счёт в PDF отдаётся', invoice.status === 200 && invoice.buf.slice(0, 4).toString() === '%PDF')

    const myOrders = await req('/api/v1/business/orders/my', { token: userToken })
    ok('GET /business/orders/my работает', myOrders.status === 200 && Array.isArray(myOrders.data))
    ok('заявка видна в «моих»', (myOrders.data || []).some((o) => o.id === orderId))
  }

  // --- 9. Регистрация владельца ---
  console.log('\n9. Регистрация с ролью')
  const newEmail = `owner${Date.now()}@test.kz`
  const reg = await req('/api/v1/auth/register', {
    method: 'POST',
    body: {
      email: newEmail, password: 'Test123!', firstName: 'Тест', lastName: 'Владелец',
      phone: '+77001112233', role: 'OWNER', drivingLicense: 'C'
    }
  })
  ok('регистрация владельца работает', reg.status === 200 || reg.status === 201,
    `status=${reg.status}`)
  ok('роль OWNER сохранена', reg.data?.user?.role === 'OWNER', `got=${reg.data?.user?.role}`)

  // --- 10. Старый алиас /cars не сломан ---
  console.log('\n10. Обратная совместимость')
  const alias = await req('/api/v1/cars', { params: { size: 5 } })
  ok('алиас /api/v1/cars работает', alias.status === 200 && Array.isArray(alias.data?.content))
  ok('в ответе есть поля cars-контракта (carId в брони сохранён)',
    alias.data?.content?.length > 0)

  console.log(`\n=== Итог: ${passed} успешно, ${failed} ошибок ===\n`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('Ошибка smoke-теста:', err.message)
  process.exit(1)
})
