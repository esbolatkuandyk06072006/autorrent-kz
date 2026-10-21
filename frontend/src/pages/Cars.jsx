import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiGet } from '../api.js'
import CarCard from '../components/CarCard.jsx'
import { Alert, EmptyState, Pagination, Spinner } from '../components/ui.jsx'
import {
  CITIES,
  CATEGORY_GROUPS,
  CATEGORY_LABELS,
  VEHICLE_TYPE_LABELS,
  today,
  addDays
} from '../utils.js'

// Группа техники → какие поля показывать. У грузовых/спецтехники появляется
// «Грузоподъёмность, т» и «Только с оператором», у легковых — ничего нового.
const isPassenger = (type) => type === 'PASSENGER' || type === ''

export default function Cars() {
  const [searchParams] = useSearchParams()
  const initialCategory = searchParams.get('category') || ''
  const [filters, setFilters] = useState({
    brand: '',
    city: '',
    type: '',
    category: initialCategory,
    maxPrice: '',
    maxCapacity: '',
    withOperator: '',
    startDate: '',
    endDate: ''
  })
  const [page, setPage] = useState(0)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const update = (key) => (e) => {
    const value = e.target.value
    // При смене группы сбрасываем зависимую подкатегорию и поля.
    if (key === 'type') {
      setFilters((f) => ({ ...f, type: value, category: '', maxCapacity: '', withOperator: '' }))
    } else if (key === 'category') {
      setFilters((f) => ({ ...f, category: value }))
    } else {
      setFilters((f) => ({ ...f, [key]: value }))
    }
    setPage(0)
  }

  // Подкатегории, доступные для выбранной группы (или все, если группа не выбрана).
  const categoryOptions = useMemo(() => {
    if (!filters.type) {
      return Object.keys(CATEGORY_LABELS)
    }
    return CATEGORY_GROUPS[filters.type] || []
  }, [filters.type])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = { ...filters, page, size: 8, sortBy: 'pricePerDay', direction: 'asc' }
      // Пустые строки не должны уходить в query string.
      Object.keys(params).forEach((k) => params[k] === '' && delete params[k])
      // When dates are selected we ask the backend for vehicles available in that range.
      const path = filters.startDate && filters.endDate ? '/api/v1/vehicles/available' : '/api/v1/vehicles'
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
    setFilters((f) => ({ ...f, startDate: start, endDate: addDays(start, 3) }))
    setPage(0)
  }

  const reset = () => {
    setFilters({
      brand: '',
      city: '',
      type: '',
      category: '',
      maxPrice: '',
      maxCapacity: '',
      withOperator: '',
      startDate: '',
      endDate: ''
    })
    setPage(0)
  }

  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>Аренда техники по Казахстану</h1>
          <p>
            Легковые, грузовые и спецтехника. Выберите группу, затем класс — и забронируйте за минуту.
            Цена считается сразу, скидка от 7 дней — 10%.
          </p>
        </div>
      </section>

      <div className="container section">
        <div className="filters card">
          <div className="filters-grid">
            <label>
              Группа
              <select value={filters.type} onChange={update('type')}>
                <option value="">Все группы</option>
                {Object.entries(VEHICLE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Категория
              <select value={filters.category} onChange={update('category')}>
                <option value="">Любая</option>
                {categoryOptions.map((value) => (
                  <option key={value} value={value}>
                    {CATEGORY_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Марка
              <input value={filters.brand} onChange={update('brand')} placeholder="Toyota, Kia, KamAZ…" />
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
              Цена до, ₸/день
              <input type="number" min="0" value={filters.maxPrice} onChange={update('maxPrice')} placeholder="100000" />
            </label>

            {/* Поля, зависящие от группы: грузоподъёмность и оператор. */}
            {!isPassenger(filters.type) && (
              <>
                <label>
                  Грузоподъёмность до, т
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={filters.maxCapacity}
                    onChange={update('maxCapacity')}
                    placeholder="Например: 5"
                  />
                </label>
                <label>
                  Оператор
                  <select value={filters.withOperator} onChange={update('withOperator')}>
                    <option value="">Не важно</option>
                    <option value="true">Только с оператором</option>
                    <option value="false">Без оператора</option>
                  </select>
                </label>
              </>
            )}

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
        {loading && <Spinner label="Загружаем технику…" />}

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
