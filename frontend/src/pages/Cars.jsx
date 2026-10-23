import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiGet } from '../api.js'
import CarCard from '../components/CarCard.jsx'
import { Alert, EmptyState, Pagination, Spinner } from '../components/ui.jsx'
import { useTranslation } from '../i18n.jsx'
import {
  CITIES,
  CATEGORY_GROUPS,
  CATEGORY_LABELS,
  COLLECTIONS,
  VEHICLE_TYPE_LABELS,
  today,
  addDays
} from '../utils.js'

// Группа техники → какие поля показывать. У грузовых/спецтехники появляется
// «Грузоподъёмность, т» и «Только с оператором», у легковых — ничего нового.
const isPassenger = (type) => type === 'PASSENGER' || type === ''

export default function Cars() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const initialCategory = searchParams.get('category') || ''
  const initialTag = searchParams.get('tag') || ''
  const [filters, setFilters] = useState({
    brand: '',
    city: '',
    type: '',
    category: initialCategory,
    maxPrice: '',
    maxCapacity: '',
    withOperator: '',
    startDate: '',
    endDate: '',
    tag: initialTag
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
      endDate: '',
      tag: ''
    })
    setPage(0)
  }

  // Выбор умной подборки: клик по чипсу переключает тег (повторный — снимает).
  const pickTag = (tag) => {
    setFilters((f) => ({ ...f, tag: f.tag === tag ? '' : tag }))
    setPage(0)
  }

  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>{t('home.title')}</h1>
          <p>{t('home.subtitle')}</p>
        </div>
      </section>

      <div className="container section">
        {/* Умные подборки: «для стройки», «для свадьбы», «для поездки в горы». */}
        <div className="collections">
          {COLLECTIONS.map((collection) => {
            const active = filters.tag === collection.tag
            const label = t(`home.collection${collection.key[0].toUpperCase()}${collection.key.slice(1)}`)
            return (
              <button
                key={collection.key}
                type="button"
                className={`collection-chip ${active ? 'collection-chip-on' : ''}`}
                onClick={() => pickTag(collection.tag)}
              >
                <span className="collection-icon">{collection.icon}</span>
                {label}
              </button>
            )
          })}
          {filters.tag && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => pickTag(filters.tag)}>
              {t('home.reset')}
            </button>
          )}
        </div>

        <div className="filters card">
          <div className="filters-grid">
            <label>
              {t('home.group')}
              <select value={filters.type} onChange={update('type')}>
                <option value="">{t('home.groupAll')}</option>
                {Object.entries(VEHICLE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('home.category')}
              <select value={filters.category} onChange={update('category')}>
                <option value="">{t('home.categoryAny')}</option>
                {categoryOptions.map((value) => (
                  <option key={value} value={value}>
                    {CATEGORY_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('home.brand')}
              <input value={filters.brand} onChange={update('brand')} placeholder="Toyota, Kia, KamAZ…" />
            </label>
            <label>
              {t('home.city')}
              <select value={filters.city} onChange={update('city')}>
                <option value="">{t('home.cityAny')}</option>
                {CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('home.maxPrice')}
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
              {t('home.startDate')}
              <input type="date" value={filters.startDate} onChange={update('startDate')} />
            </label>
            <label>
              {t('home.endDate')}
              <input type="date" value={filters.endDate} onChange={update('endDate')} />
            </label>
          </div>
          <div className="filters-actions">
            <button className="btn btn-ghost btn-sm" onClick={quickDates}>
              📅 {t('home.dates')}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={reset}>
              {t('home.reset')}
            </button>
          </div>
        </div>

        <Alert>{error}</Alert>
        {loading && <Spinner label={t('common.loading')} />}

        {!loading && data && data.content.length === 0 && (
          <EmptyState
            icon="🚗"
            title={t('home.empty')}
            hint={t('home.emptyText')}
            action={
              <button className="btn btn-primary" onClick={reset}>
                {t('home.reset')}
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
