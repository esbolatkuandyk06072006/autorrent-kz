import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet } from '../api.js'
import CarArt from '../components/CarArt.jsx'
import { EmptyState, Spinner } from '../components/ui.jsx'
import { useLibrary } from '../LibraryContext.jsx'
import {
  CAR_STATUS_LABELS,
  CATEGORY_LABELS,
  FUEL_LABELS,
  TRANSMISSION_LABELS,
  money,
  dateLabel
} from '../utils.js'

const ROWS = [
  { label: 'Цена за день', render: (c) => money(c.pricePerDay) },
  { label: 'Категория', render: (c) => CATEGORY_LABELS[c.category] || c.category },
  { label: 'Год выпуска', render: (c) => c.year },
  { label: 'Коробка', render: (c) => TRANSMISSION_LABELS[c.transmission] || c.transmission },
  { label: 'Топливо', render: (c) => FUEL_LABELS[c.fuelType] || c.fuelType },
  { label: 'Мест', render: (c) => c.seats },
  { label: 'Город', render: (c) => c.city },
  { label: 'Номер', render: (c) => c.licensePlate },
  {
    label: 'Рейтинг',
    render: (c) => (c.averageRating != null ? `⭐ ${Number(c.averageRating).toFixed(1)} (${c.reviewCount})` : '—')
  },
  { label: 'Статус', render: (c) => CAR_STATUS_LABELS[c.status] || c.status }
]

export default function Compare() {
  const { compare, toggleCompare, clearCompare } = useLibrary()
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let alive = true
    if (compare.length === 0) {
      setCars([])
      return
    }
    setLoading(true)
    Promise.allSettled(compare.map((id) => apiGet(`/api/v1/cars/${id}`)))
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
          <h1>⇄ Сравнение</h1>
          <p className="muted">До 3 машин рядом: цены, характеристики и рейтинг — как в автосалоне.</p>
        </div>
        {cars.length > 0 && (
          <button className="btn btn-ghost" onClick={clearCompare}>
            Очистить
          </button>
        )}
      </div>

      {loading && <Spinner label="Загружаем машины…" />}

      {!loading && cars.length === 0 && (
        <EmptyState
          icon="⚖️"
          title="Сравнивать пока нечего"
          hint="Нажмите ⇄ на карточках в каталоге — выберите до 3 машин."
          action={
            <Link className="btn btn-primary" to="/">
              Выбрать машины
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
                      <CarArt car={car} />
                      <b>
                        {car.brand} {car.model}
                      </b>
                      <button className="btn btn-ghost btn-sm" onClick={() => toggleCompare(car.id)}>
                        ✕ Убрать
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label}>
                  <td className="compare-label">{row.label}</td>
                  {cars.map((car) => (
                    <td key={car.id}>{row.render(car)}</td>
                  ))}
                </tr>
              ))}
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
