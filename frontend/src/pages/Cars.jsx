import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiGet } from '../api.js'
import CarCard from '../components/CarCard.jsx'
import VehicleMap from '../components/VehicleMap.jsx'
import { Alert, EmptyState, Pagination, Spinner } from '../components/ui.jsx'
import {
  IconCalendar,
  IconCatalog,
  IconConstruction,
  IconMountains,
  IconRoutes,
  IconWedding
} from '../components/icons.jsx'
import { useTranslation } from '../i18n.jsx'
import {
  CITIES,
  CATEGORY_GROUPS,
  CATEGORY_LABELS,
  COLLECTIONS,
  VEHICLE_TYPE_LABELS,
  money,
  today,
  addDays
} from '../utils.js'

// Иконки умных подборок — авторские SVG вместо эмодзи.
const COLLECTION_ICONS = {
  construction: IconConstruction,
  wedding: IconWedding,
  mountains: IconMountains
}

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

  // Шаг 7: режим «На карте» — все доступные единицы пинами на одной карте.
  const navigate = useNavigate()
  const [mapView, setMapView] = useState(false)
  const [mapVehicles, setMapVehicles] = useState([])
  const [mapLoading, setMapLoading] = useState(false)

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

  // Техника для карты: применяем текущие фильтры, но берём все страницы разом
  // (одним запросом size=200), чтобы пинами показать весь доступный каталог.
  const loadMapVehicles = useCallback(async () => {
    setMapLoading(true)
    try {
      const params = { ...filters, size: 200, sortBy: 'pricePerDay', direction: 'asc' }
      Object.keys(params).forEach((k) => params[k] === '' && delete params[k])
      const path = filters.startDate && filters.endDate ? '/api/v1/vehicles/available' : '/api/v1/vehicles'
      const res = await apiGet(path, params)
      setMapVehicles(res?.content || [])
    } catch (err) {
      setError(err.message)
      setMapVehicles([])
    } finally {
      setMapLoading(false)
    }
  }, [filters])

  // При включении карты (или смене фильтров при открытой карте) — подгружаем пины.
  useEffect(() => {
    if (mapView) loadMapVehicles()
  }, [mapView, loadMapVehicles])

  // Точки для карты: у техники без координат пина нет — пропускаем.
  // Мемоизируем, чтобы карта не перерисовывалась на каждый рендер.
  const mapPoints = useMemo(
    () =>
      mapVehicles
        .filter((c) => c.latitude != null && c.longitude != null)
        .map((c) => ({
          id: c.id,
          lat: Number(c.latitude),
          lng: Number(c.longitude),
          title: `${c.brand} ${c.model}`,
          address: c.pickupAddress,
          price: money(c.pricePerDay)
        })),
    [mapVehicles]
  )

  // Клик по пину открывает карточку техники.
  const openFromMap = useCallback((p) => navigate(`/cars/${p.id}`), [navigate])

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
            const CollectionIcon =
              COLLECTION_ICONS[collection.key] || IconConstruction
            return (
              <button
                key={collection.key}
                type="button"
                className={`collection-chip ${active ? 'collection-chip-on' : ''}`}
                onClick={() => pickTag(collection.tag)}
              >
                <span className="collection-icon">
                  <CollectionIcon size={17} />
                </span>
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
              <IconCalendar size={15} /> {t('home.dates')}
            </button>
            {/* Кнопка «На карте» — все доступные единицы техники пинами. */}
            <button
              type="button"
              className={`btn btn-sm ${mapView ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setMapView((v) => !v)}
            >
              <IconRoutes size={15} /> На карте
            </button>
            <button className="btn btn-ghost btn-sm" onClick={reset}>
              {t('home.reset')}
            </button>
          </div>
        </div>

        <Alert>{error}</Alert>
        {loading && !mapView && <Spinner label={t('common.loading')} />}

        {/* Шаг 7: карта каталога — клик по пину открывает карточку техники. */}
        {mapView && (
          <div className="catalog-map card">
            {mapLoading ? (
              <Spinner label={t('common.loading')} />
            ) : mapVehicles.length === 0 ? (
              <EmptyState
                icon={<IconRoutes size={44} />}
                title="Под текущими фильтрами техника не найдена"
                hint="Сбросьте фильтры или выберите другие даты."
                action={
                  <button className="btn btn-primary" onClick={reset}>
                    {t('home.reset')}
                  </button>
                }
              />
            ) : (
              <>
                <p className="muted catalog-map-hint">
                  Пинов: {mapPoints.length} · клик по пину открывает карточку техники
                </p>
                <VehicleMap points={mapPoints} onPick={openFromMap} height={480} />
              </>
            )}
          </div>
        )}

        {!mapView && !loading && data && data.content.length === 0 && (
          <EmptyState
            icon={<IconCatalog size={44} />}
            title={t('home.empty')}
            hint={t('home.emptyText')}
            action={
              <button className="btn btn-primary" onClick={reset}>
                {t('home.reset')}
              </button>
            }
          />
        )}

        {!mapView && !loading && data && data.content.length > 0 && (
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
