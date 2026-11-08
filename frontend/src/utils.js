// Группа техники (легковые / грузовые / спецтехника) — первый уровень фильтра.
export const VEHICLE_TYPE_LABELS = {
  PASSENGER: 'Легковые',
  CARGO: 'Грузовые',
  SPECIAL: 'Спецтехника'
}

// Подкатегории, сгруппированные по группе техники.
export const CATEGORY_GROUPS = {
  PASSENGER: ['ECONOMY', 'COMFORT', 'BUSINESS', 'SUV', 'ELECTRIC'],
  CARGO: ['LIGHT_TRUCK', 'MEDIUM_TRUCK', 'HEAVY_TRUCK', 'DUMP_TRUCK'],
  SPECIAL: ['EXCAVATOR', 'CRANE', 'BULLDOZER', 'LOADER', 'CONCRETE_MIXER']
}

export const CATEGORY_LABELS = {
  ECONOMY: 'Эконом',
  COMFORT: 'Комфорт',
  SUV: 'Внедорожник',
  BUSINESS: 'Бизнес',
  ELECTRIC: 'Электро',
  LIGHT_TRUCK: 'Газель (до 1.5 т)',
  MEDIUM_TRUCK: 'Средний (1.5–5 т)',
  HEAVY_TRUCK: 'Фура (5+ т)',
  DUMP_TRUCK: 'Самосвал',
  EXCAVATOR: 'Экскаватор',
  CRANE: 'Автокран',
  BULLDOZER: 'Бульдозер',
  LOADER: 'Погрузчик',
  CONCRETE_MIXER: 'Бетономешалка'
}

export const LICENSE_LABELS = {
  B: 'Права категории B',
  C: 'Права категории C',
  E: 'Права категории E',
  SPECIAL: 'Спецудостоверение'
}

export const TRANSMISSION_LABELS = {
  MANUAL: 'Механика',
  AUTOMATIC: 'Автомат'
}

export const FUEL_LABELS = {
  PETROL: 'Бензин',
  DIESEL: 'Дизель',
  HYBRID: 'Гибрид',
  ELECTRIC: 'Электро'
}

export const CAR_STATUS_LABELS = {
  ACTIVE: 'Активен',
  MAINTENANCE: 'На обслуживании',
  ARCHIVED: 'Архив'
}

export const RESERVATION_STATUS_LABELS = {
  PENDING: 'Ожидает',
  CONFIRMED: 'Подтверждена',
  ACTIVE: 'Активна',
  CANCELLED: 'Отменена',
  COMPLETED: 'Завершена'
}

// Подписи статусов для кнопок управления (владелец/админ меняют статус брони).
export const RESERVATION_STATUS_COLORS = {
  PENDING: 'var(--warning, #b7791f)',
  CONFIRMED: 'var(--accent, #2f6f4e)',
  ACTIVE: 'var(--accent-strong, #1f5136)',
  CANCELLED: 'var(--muted, #8a8f98)',
  COMPLETED: 'var(--muted, #8a8f98)'
}

// Теги умных подборок: «для стройки», «для свадьбы», «для поездки в горы»…
export const TAG_LABELS = {
  construction: 'Для стройки',
  wedding: 'Для свадьбы',
  mountains: 'Для поездки в горы',
  city: 'Для города',
  longtrip: 'По трассе',
  family: 'Для семьи'
}

export const TAG_ICONS = {
  construction: 'construction',
  wedding: 'wedding',
  mountains: 'mountains',
  city: 'city',
  longtrip: 'longtrip',
  family: 'family'
}

// Умные подборки на главной: заголовок + тег.
export const COLLECTIONS = [
  { key: 'construction', title: 'Для стройки', tag: 'construction' },
  { key: 'wedding', title: 'Для свадьбы', tag: 'wedding' },
  { key: 'mountains', title: 'Для поездки в горы', tag: 'mountains' }
]

export const REVIEW_STATUS_LABELS = {
  VISIBLE: 'Виден',
  HIDDEN: 'Скрыт'
}

export const CITIES = ['Almaty', 'Astana', 'Shymkent', 'Karaganda', 'Aktau']

export const money = (value) => {
  if (value === null || value === undefined) return '—'
  const number = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Number(value))
  return `${number} ₸`
}

export const dateLabel = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('ru-RU')
}

export const today = () => new Date().toISOString().slice(0, 10)

export const addDays = (isoDate, days) => {
  const date = new Date(`${isoDate}T00:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export const daysBetween = (start, end) => {
  if (!start || !end) return 0
  const a = new Date(`${start}T00:00:00`)
  const b = new Date(`${end}T00:00:00`)
  const diff = Math.round((b - a) / 86400000)
  return diff > 0 ? diff : 0
}

// Mirrors the backend pricing strategy: 10% discount from 7 rental days,
// 20% from 30 days. Operator option adds operatorPricePerDay * days.
export const previewPrice = (pricePerDay, start, end, { withOperator = false, operatorPricePerDay } = {}) => {
  const days = daysBetween(start, end)
  if (!days || !pricePerDay) return { days: 0, total: 0, discounted: false, discountPercent: 0 }
  const base = Number(pricePerDay) * days
  let discountPercent = 0
  if (days >= 30) discountPercent = 20
  else if (days >= 7) discountPercent = 10
  const rental = discountPercent ? Math.round(base * (1 - discountPercent / 100)) : base
  const operator = withOperator && operatorPricePerDay
    ? Number(operatorPricePerDay) * days
    : 0
  return {
    days,
    total: rental + operator,
    discounted: discountPercent > 0,
    discountPercent,
    operatorTotal: operator
  }
}

// Предпросмотр почасовой аренды: pricePerHour * hours.
export const previewHourlyPrice = (pricePerHour, hours) => {
  if (!pricePerHour || !hours) return { total: 0 }
  return { total: Math.round(Number(pricePerHour) * Number(hours)) }
}

// Следующий доступный статус брони (для владельца/админа).
export const NEXT_RESERVATION_STATUS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['ACTIVE', 'COMPLETED', 'CANCELLED'],
  ACTIVE: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: []
}

// --- Фотографии техники ---
// images — массив путей (/images/vehicles/{id}/N.jpg); imageUrl — главное фото
// (дублирует images[0] для обратной совместимости). Возвращаем чистый список.

export const carImages = (car) => {
  if (!car) return []
  const list = Array.isArray(car.images) ? car.images.filter(Boolean) : []
  if (list.length > 0) return list
  return car.imageUrl ? [car.imageUrl] : []
}

export const mainImage = (car) => carImages(car)[0] || null
