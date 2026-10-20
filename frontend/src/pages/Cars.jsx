import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '../api.js'
import CarCard from '../components/CarCard.jsx'
import { Alert, EmptyState, Pagination, Spinner } from '../components/ui.jsx'
import { CITIES, CATEGORY_LABELS, today, addDays } from '../utils.js'

export default function Cars() {
  const [filters, setFilters] = useState({
    brand: '',
    city: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    startDate: '',
    endDate: ''
  })
  const [page, setPage] = useState(0)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const update = (key) => (e) => {
    setFilters({ ...filters, [key]: e.target.value })
    setPage(0)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = { ...filters, page, size: 8, sortBy: 'pricePerDay', direction: 'asc' }
      // When dates are selected we ask the backend for cars available in that range.
      const path = filters.startDate && filters.endDate ? '/api/v1/cars/available' : '/api/v1/cars'
      setData(await apiGet(path, params))
    } catch (err) {
      setError(err.message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  useEffect(() => {
    const timer = setTimeout(load, 250)
    return () => clearTimeout(timer)
  }, [load])

  const quickDates = () => {
    const start = addDays(today(), 1)
    setFilters({ ...filters, startDate: start, endDate: addDays(start, 3) })
    setPage(0)
  }

  const reset = () => {
    setFilters({ brand: '', city: '', category: '', minPrice: '', maxPrice: '', startDate: '', endDate: '' })
    setPage(0)
  }

  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>Аренда автомобилей по Казахстану</h1>
          <p>Выберите автомобиль, даты — и забронируйте за минуту. Цена считается сразу, скидка от 7 дней — 10%.</p>
        </div>
      </section>

      <div className="container section">
        <div className="filters card">
          <div className="filters-grid">
            <label>
              Марка
              <input value={filters.brand} onChange={update('brand')} placeholder="Toyota, Kia…" />
            </label>
            <label>
              Город
              <select value={filters.city} onChange={update('city')}>
                <option value="">Любой</option>
                {CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Категория
              <select value={filters.category} onChange={update('category')}>
                <option value="">Любая</option>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Цена от
              <input type="number" min="0" value={filters.minPrice} onChange={update('minPrice')} placeholder="0" />
            </label>
            <label>
              Цена до
              <input type="number" min="0" value={filters.maxPrice} onChange={update('maxPrice')} placeholder="100000" />
            </label>
            <label>
              Свободен с
              <input type="date" value={filters.startDate} onChange={update('startDate')} />
            </label>
            <label>
              Свободен до
              <input type="date" value={filters.endDate} onChange={update('endDate')} />
            </label>
          </div>
          <div className="filters-actions">
            <button className="btn btn-ghost btn-sm" onClick={quickDates}>
              📅 Ближайшие даты
            </button>
            <button className="btn btn-ghost btn-sm" onClick={reset}>
              Сбросить фильтры
            </button>
          </div>
        </div>

        <Alert>{error}</Alert>
        {loading && <Spinner label="Загружаем автомобили…" />}

        {!loading && data && data.content.length === 0 && (
          <EmptyState
            icon="🚗"
            title="Ничего не найдено"
            hint="Попробуйте изменить фильтры или даты."
            action={
              <button className="btn btn-primary" onClick={reset}>
                Сбросить фильтры
              </button>
            }
          />
        )}

        {!loading && data && data.content.length > 0 && (
          <>
            <div className="cars-grid">
              {data.content.map((car) => (
                <CarCard key={car.id} car={car} />
              ))}
            </div>
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              totalElements={data.totalElements}
              onChange={setPage}
            />
          </>
        )}
      </div>
    </>
  )
}
