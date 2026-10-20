export const CATEGORY_LABELS = {
  ECONOMY: 'Эконом',
  COMFORT: 'Комфорт',
  SUV: 'Внедорожник',
  BUSINESS: 'Бизнес',
  ELECTRIC: 'Электро'
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
  CANCELLED: 'Отменена',
  COMPLETED: 'Завершена'
}

export const REVIEW_STATUS_LABELS = {
  VISIBLE: 'Виден',
  HIDDEN: 'Скрыт'
}

export const CATEGORY_ICONS = {
  ECONOMY: '🚗',
  COMFORT: '🚙',
  SUV: '🚜',
  BUSINESS: '🚘',
  ELECTRIC: '⚡'
}

export const CITIES = ['Almaty', 'Astana', 'Shymkent', 'Karaganda', 'Aktobe']

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

// Mirrors the backend pricing strategy: 10% discount from 7 rental days.
export const previewPrice = (pricePerDay, start, end) => {
  const days = daysBetween(start, end)
  if (!days || !pricePerDay) return { days: 0, total: 0, discounted: false }
  const base = Number(pricePerDay) * days
  const discounted = days >= 7
  return { days, total: discounted ? Math.round(base * 0.9) : base, discounted }
}
