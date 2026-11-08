// Seed-скрипт демо-данных (Шаг 6): наполняет каталог и брони через REST API.
//
// Зачем: DataInitializer наполняет только пустую БД при старте. Скрипт можно
// запустить в любой момент (в том числе после APP_SEED_ENABLED=false или на
// PostgreSQL), чтобы получить полный набор для демонстрации: техника разных
// групп, брони во всех статусах, отзыв и бизнес-заявка.
//
// Идемпотентность: техника проверяется по номерному знаку, брони — по паре
// (carId, startDate), повторный запуск ничего не дублирует.
//
// Запуск: node scripts/seed-demo.mjs   (из каталога backend/)
const BASE = process.env.BASE_URL || 'http://localhost:8080'

let created = 0
let skipped = 0

const log = (msg) => console.log(`  ${msg}`)

const req = async (path, { method = 'GET', token, body, params } = {}) => {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const query = params
    ? '?' + Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
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

const login = async (email, password) => {
  const r = await req('/api/v1/auth/login', {
    method: 'POST',
    body: { email, password }
  })
  return r.status === 200 ? r.data.token : null
}

const daysFromNow = (n) => {
  const shifted = new Date(Date.now() + n * 86400000 + 5 * 3600 * 1000)
  return shifted.toISOString().slice(0, 10)
}

// Демо-техника: легковые, грузовая (права C), спецтехника (почасовая),
// автобус с оператором — покрывает все группы каталога и подборки.
const VEHICLES = [
  {
    brand: 'Hyundai', model: 'Accent', year: 2023, licensePlate: 'S1SEED01',
    category: 'ECONOMY', transmission: 'AUTOMATIC', fuelType: 'PETROL', seats: 5,
    pricePerDay: 18000, city: 'Almaty', status: 'ACTIVE',
    description: 'Компактный седан для города.', tags: ['city', 'family'],
    pickupAddress: 'Алматы, пр. Абая, 44 — паркинг под офисом',
    latitude: 43.238, longitude: 76.945,
    pickupInstructions: 'Ящик с ключом у входа в паркинг, код от ящика придёт в SMS.'
  },
  {
    brand: 'Toyota', model: 'Land Cruiser', year: 2024, licensePlate: 'S1SEED02',
    category: 'SUV', transmission: 'AUTOMATIC', fuelType: 'PETROL', seats: 7,
    pricePerDay: 75000, city: 'Astana', status: 'ACTIVE',
    description: 'Внедорожник для поездок в горы и по трассе.', tags: ['mountains', 'family', 'longtrip'],
    pickupAddress: 'Астана, пр. Кабанбай батыра, 62 — подземный паркинг',
    latitude: 51.169, longitude: 71.449,
    pickupInstructions: 'Ключи на стойке ресепшена — назовите номер брони.'
  },
  {
    brand: 'KamAZ', model: '43118', year: 2022, licensePlate: 'S1SEED03',
    category: 'HEAVY_TRUCK', type: 'CARGO', transmission: 'MANUAL', fuelType: 'DIESEL',
    seats: 3, capacity: 10, requiredLicense: 'C', pricePerDay: 95000,
    city: 'Shymkent', status: 'ACTIVE',
    description: 'Среднетоннажный грузовик для перевозок.', tags: ['construction'],
    pickupAddress: 'Шымкент, ул. Тәуке хана, 5 — парковка у дома',
    latitude: 42.315, longitude: 69.587,
    pickupInstructions: 'Встреча у шлагбаума: назовите номер машины, охрана откроет.'
  },
  {
    brand: 'JCB', model: '3CX', year: 2023, licensePlate: 'S1SEED04',
    category: 'LOADER', type: 'SPECIAL', transmission: 'AUTOMATIC', fuelType: 'DIESEL',
    seats: 2, capacity: 3, requiredLicense: 'SPECIAL',
    pricePerDay: 85000, pricePerHour: 7000,
    city: 'Karaganda', status: 'ACTIVE',
    description: 'Погрузчик-поворотный для стройки, почасовая аренда.', tags: ['construction'],
    pickupAddress: 'Караганда, пр. Незабудимого, 25 — паркинг БЦ «Сити»',
    latitude: 49.806, longitude: 73.085,
    pickupInstructions: 'Ключ в терминале самообслуживания, PIN придет в SMS.'
  },
  {
    brand: 'Yutong', model: 'ZK6122', year: 2023, licensePlate: 'S1SEED05',
    category: 'BUS', type: 'SPECIAL', transmission: 'AUTOMATIC', fuelType: 'DIESEL',
    seats: 45, requiredLicense: 'SPECIAL',
    pricePerDay: 150000, withOperator: true, operatorPricePerDay: 40000,
    city: 'Aktau', status: 'ACTIVE',
    description: 'Автобус для корпоративных перевозок, только с оператором.',
    tags: ['wedding', 'longtrip'],
    pickupAddress: 'Актау, пр. Мұншықтар, 19 — парковка у магазина',
    latitude: 43.65, longitude: 51.16,
    pickupInstructions: 'Встреча у шлагбаума: назовите номер машины, охрана откроет.'
  }
]

async function main() {
  console.log(`=== Seed демо-данных → ${BASE} ===`)

  const adminToken = await login('admin@autorrent.kz', 'Admin123!')
  if (!adminToken) {
    console.error('  ✗ Не удалось войти как admin@autorrent.kz.')
    console.error('    Похоже, демо-данные отключены (APP_SEED_ENABLED=false).')
    console.error('    Включите сидинг при старте приложения или передайте BASE_URL.')
    process.exit(1)
  }
  log('✓ админ вошёл')

  // 1. Техника: создаём недостающую по номерному знаку.
  const catalog = await req('/api/v1/vehicles', { params: { size: 500 } })
  const existing = new Set((catalog.data?.content || []).map((v) => v.licensePlate))
  for (const vehicle of VEHICLES) {
    if (existing.has(vehicle.licensePlate)) {
      skipped++
      continue
    }
    const r = await req('/api/v1/vehicles', { method: 'POST', token: adminToken, body: vehicle })
    if (r.status === 201 || r.status === 200) created++
    else log(`✗ ${vehicle.brand} ${vehicle.model}: ${r.status} ${JSON.stringify(r.data)}`)
  }
  log(`✓ техника: создано ${created}, уже было ${skipped}`)

  // 2. Пользователь для броней (вход, при отсутствии — пропускаем брони).
  const userToken = await login('user@autorrent.kz', 'User123!')
  if (!userToken) {
    log('⚠ user@autorrent.kz недоступен — брони не создаются')
    return
  }

  // Найдём технику для броней (свежие номера + демо Camry из DataInitializer).
  const fresh = await req('/api/v1/vehicles', { params: { size: 500, sortBy: 'id', direction: 'desc' } })
  const all = fresh.data?.content || []
  const byPlate = (plate) => all.find((v) => v.licensePlate === plate)
  const economy = byPlate('S1SEED01') || all.find((v) => v.category === 'ECONOMY')
  const suv = byPlate('S1SEED02') || all.find((v) => v.category === 'SUV')

  // Уже существующие брони — чтобы не дублировать при повторном запуске.
  const existingReservations = await req('/api/v1/reservations', {
    token: adminToken,
    params: { size: 500 }
  })
  const haveRes = new Set(
    (existingReservations.data?.content || []).map((r) => `${r.carId}:${r.startDate}`)
  )

  // Брони во всех статусах: завершённая (отзыв), подтверждённая (будущее),
  // отменённая (история) — закрывает сценарии каталога и «Моих броней».
  const RESERVATIONS = [
    { car: economy, start: daysFromNow(-30), end: daysFromNow(-27), status: 'COMPLETED' },
    { car: economy, start: daysFromNow(5), end: daysFromNow(9), status: 'CONFIRMED' },
    { car: suv, start: daysFromNow(14), end: daysFromNow(21), status: 'CANCELLED' }
  ]

  for (const plan of RESERVATIONS) {
    if (!plan.car) continue
    const key = `${plan.car.id}:${plan.start}`
    if (haveRes.has(key)) {
      skipped++
      continue
    }
    const r = await req('/api/v1/reservations', {
      method: 'POST',
      token: userToken,
      body: { carId: plan.car.id, startDate: plan.start, endDate: plan.end }
    })
    if (r.status !== 201 && r.status !== 200) {
      log(`⚠ бронь ${plan.start}..${plan.end}: ${r.status} ${JSON.stringify(r.data)}`)
      continue
    }
    // Переводим в нужный статус через админа (отмена — с причиной).
    if (plan.status === 'CANCELLED') {
      await req(`/api/v1/reservations/${r.data.id}/cancel`, {
        method: 'PATCH', token: userToken, params: { reason: 'Демо-отмена (seed)' }
      })
    } else if (plan.status === 'CONFIRMED') {
      await req(`/api/v1/reservations/${r.data.id}/status`, {
        method: 'PATCH', token: adminToken, body: { status: 'CONFIRMED' }
      })
    } else if (plan.status === 'COMPLETED') {
      await req(`/api/v1/reservations/${r.data.id}/status`, {
        method: 'PATCH', token: adminToken, body: { status: 'CONFIRMED' }
      })
      await req(`/api/v1/reservations/${r.data.id}/status`, {
        method: 'PATCH', token: adminToken, body: { status: 'COMPLETED' }
      })
    }
    created++
    log(`✓ бронь: ${plan.car.brand} ${plan.car.model} ${plan.start}..${plan.end} → ${plan.status}`)
  }

  // 3. Отзыв по завершённой брони (если его ещё нет).
  const completed = (existingReservations.data?.content || []).concat([])
  const mine = await req('/api/v1/reservations/my', { token: userToken, params: { size: 100 } })
  const doneRes = (mine.data?.content || []).find(
    (r) => r.status === 'COMPLETED' && !r.reviewId
  )
  if (doneRes) {
    const rv = await req('/api/v1/reviews', {
      method: 'POST',
      token: userToken,
      body: { reservationId: doneRes.id, rating: 5, comment: 'Отличный сервис, спасибо!' }
    })
    if (rv.status === 201 || rv.status === 200) log('✓ отзыв по завершённой брони создан')
  }

  console.log(`=== Готово: создано ${created}, пропущено (уже есть) ${skipped} ===`)
}

main().catch((err) => {
  console.error('Seed упал:', err.message)
  process.exit(1)
})
