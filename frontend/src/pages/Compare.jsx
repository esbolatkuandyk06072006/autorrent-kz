import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet } from '../api.js'
import CarImage from '../components/CarImage.jsx'
import { EmptyState, Spinner } from '../components/ui.jsx'
import { useLibrary } from '../LibraryContext.jsx'
import { useTranslation } from '../i18n.jsx'
import { IconClose, IconCompare } from '../components/icons.jsx'
import {
  CAR_STATUS_LABELS,
  CATEGORY_LABELS,
  FUEL_LABELS,
  LICENSE_LABELS,
  TRANSMISSION_LABELS,
  VEHICLE_TYPE_LABELS,
  money,
  dateLabel
} from '../utils.js'

// Сравнение до 3 машин. better: 'min' — дешевле лучше, 'max' — больше лучше.
// Лучшее значение в строке подсвечивается (как в сравнении на Kolesa.kz).
const ROWS = [
  { label: 'Цена за день', render: (c) => money(c.pricePerDay), better: 'min', value: (c) => Number(c.pricePerDay) },
  { label: 'Цена за час', render: (c) => (c.pricePerHour ? money(c.pricePerHour) : '—'), better: 'min', value: (c) => (c.pricePerHour ? Number(c.pricePerHour) : null) },
  { label: 'Группа', render: (c) => (c.type ? VEHICLE_TYPE_LABELS[c.type] || c.type : '—') },
  { label: 'Категория', render: (c) => CATEGORY_LABELS[c.category] || c.category },
  { label: 'Год выпуска', render: (c) => c.year, better: 'max', value: (c) => c.year },
  { label: 'Коробка', render: (c) => TRANSMISSION_LABELS[c.transmission] || c.transmission },
  { label: 'Топливо', render: (c) => FUEL_LABELS[c.fuelType] || c.fuelType },
  { label: 'Мест', render: (c) => c.seats ?? '—', better: 'max', value: (c) => c.seats },
  { label: 'Грузоподъёмность', render: (c) => (c.capacity != null ? `${c.capacity} т` : '—'), better: 'max', value: (c) => (c.capacity != null ? Number(c.capacity) : null) },
  { label: 'Права', render: (c) => (c.requiredLicense ? LICENSE_LABELS[c.requiredLicense] || c.requiredLicense : '—') },
  { label: 'Оператор', render: (c) => (c.withOperator ? (c.operatorPricePerDay ? `да (${money(c.operatorPricePerDay)}/дн)` : 'да') : 'нет') },
  { label: 'Город', render: (c) => c.city },
  { label: 'Номер', render: (c) => c.licensePlate },
  {
    label: 'Рейтинг',
    render: (c) => (c.averageRating != null ? `${Number(c.averageRating).toFixed(1)} (${c.reviewCount})` : '—'),
    better: 'max',
    value: (c) => (c.averageRating != null ? Number(c.averageRating) : null)
  },
  { label: 'Статус', render: (c) => CAR_STATUS_LABELS[c.status] || c.status }
]

// Индекс машины с лучшим значением строки; -1 — если сравнивать нечего.
const bestIndex = (row, cars) => {
  if (!row.better || !row.value) return -1
  let best = -1
  let bestValue = null
  cars.forEach((car, i) => {
    const value = row.value(car)
    if (value == null || Number.isNaN(value)) return
    if (best === -1) {
      best = i
      bestValue = value
      return
    }
    if (row.better === 'min' ? value < bestValue : value > bestValue) {
      best = i
      bestValue = value
    }
  })
  // Подсвечиваем только если есть конкуренция (два и более значения).
  if (best === -1) return -1
  const comparable = cars.filter((c) => row.value(c) != null && !Number.isNaN(row.value(c)))
  return comparable.length >= 2 ? best : -1
}

export default function Compare() {
  const { compare, toggleCompare, clearCompare } = useLibrary()
  const { t } = useTranslation()
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let alive = true
    if (compare.length === 0) {
      setCars([])
      return
    }
    setLoading(true)
    Promise.allSettled(compare.map((id) => apiGet(`/api/v1/vehicles/${id}`)))
      .then((results) => {
        if (!alive) return
        const byId = new Map(results.filter((r) => r.status === 'fulfilled').map((r) => [r.value.id, r.value]))
        setCars(compare.map((id) => byId.get(id)).filter(Boolean))
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [compare])

  return (
    <div className="container section">
      <div className="page-head">
        <div>
          <h1>
            <IconCompare size={26} /> {t('compare.title')}
          </h1>
          <p className="muted">{t('compare.subtitle')}</p>
        </div>
        {cars.length > 0 && (
          <button className="btn btn-ghost" onClick={clearCompare}>
            {t('compare.clear')}
          </button>
        )}
      </div>

      {loading && <Spinner label={t('common.loading')} />}

      {!loading && cars.length === 0 && (
        <EmptyState
          icon={<IconCompare size={44} />}
          title={t('compare.empty')}
          hint={t('compare.emptyText')}
          action={
            <Link className="btn btn-primary" to="/">
              {t('compare.pick')}
            </Link>
          }
        />
      )}

      {!loading && cars.length > 0 && (
        <div className="table-wrap compare-table">
          <table className="table">
            <thead>
              <tr>
                <th className="compare-label">Параметр</th>
                {cars.map((car) => (
                  <th key={car.id}>
                    <div className="compare-car">
                      <CarImage car={car} />
                      <b>
                        {car.brand} {car.model}
                      </b>
                      <button className="btn btn-ghost btn-sm" onClick={() => toggleCompare(car.id)}>
                        <IconClose size={14} /> Убрать
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => {
                const best = bestIndex(row, cars)
                return (
                  <tr key={row.label}>
                    <td className="compare-label">{row.label}</td>
                    {cars.map((car, i) => (
                      <td key={car.id} className={i === best ? 'compare-best' : ''}>
                        {row.render(car)}
                        {i === best && <span className="best-mark" title={t('compare.best')}> ★</span>}
                      </td>
                    ))}
                  </tr>
                )
              })}
              <tr>
                <td className="compare-label"> </td>
                {cars.map((car) => (
                  <td key={car.id}>
                    <Link className="btn btn-primary btn-sm" to={`/cars/${car.id}`}>
                      Забронировать
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
