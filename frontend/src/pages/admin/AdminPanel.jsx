import { useCallback, useEffect, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { apiGet, apiPost, apiPut, apiPatch, apiDelete, apiUpload } from '../../api.js'
import { Alert, EmptyState, Modal, Pagination, Spinner, StatusBadge } from '../../components/ui.jsx'
import { useAuth } from '../../AuthContext.jsx'
import {
  CAR_STATUS_LABELS,
  CITIES,
  CATEGORY_GROUPS,
  CATEGORY_LABELS,
  FUEL_LABELS,
  LICENSE_LABELS,
  RESERVATION_STATUS_LABELS,
  REVIEW_STATUS_LABELS,
  TAG_LABELS,
  TRANSMISSION_LABELS,
  VEHICLE_TYPE_LABELS,
  dateLabel,
  money,
  today
} from '../../utils.js'

const EMPTY_CAR = {
  brand: '',
  model: '',
  year: 2024,
  licensePlate: '',
  type: 'PASSENGER',
  category: 'COMFORT',
  transmission: 'AUTOMATIC',
  fuelType: 'PETROL',
  seats: 5,
  capacity: '',
  requiredLicense: 'B',
  withOperator: false,
  operatorPricePerDay: '',
  pricePerHour: '',
  pricePerDay: 20000,
  city: 'Almaty',
  description: '',
  imageUrl: '',
  images: [],
  tags: []
}

export default function AdminPanel() {
  const { isAdmin } = useAuth()
  const title = isAdmin ? 'Панель администратора' : 'Моя техника'
  return (
    <div className="container section">
      <h1>{title}</h1>
      <nav className="admin-tabs">
        <NavLink to="/admin" end>
          Автомобили
        </NavLink>
        <NavLink to="/admin/reservations">Брони</NavLink>
        {/* Модерация отзывов — только у админа. */}
        {isAdmin && <NavLink to="/admin/reviews">Отзывы</NavLink>}
      </nav>
      <Routes>
        <Route index element={<AdminCars />} />
        <Route path="reservations" element={<AdminReservations />} />
        {isAdmin && <Route path="reviews" element={<AdminReviews />} />}
      </Routes>
    </div>
  )
}

/* ---------------- Cars ---------------- */

function AdminCars() {
  const { isAdmin } = useAuth()
  const [data, setData] = useState(null)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [editing, setEditing] = useState(null) // null | car object for edit | 'new'
  const [form, setForm] = useState(EMPTY_CAR)
  const [busy, setBusy] = useState(false)
  const [pendingFiles, setPendingFiles] = useState([]) // выбранные, ещё не загруженные фото

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Владелец видит свою технику (/mine), админ — весь каталог.
      const path = isAdmin ? '/api/v1/vehicles' : '/api/v1/vehicles/mine'
      setData(await apiGet(path, { page, size: 10, sortBy: 'id', direction: 'asc' }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [page, isAdmin])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setForm(EMPTY_CAR)
    setEditing('new')
    setMessage(null)
    setPendingFiles([])
  }

  const openEdit = (car) => {
    setForm({
      ...car,
      pricePerDay: Number(car.pricePerDay),
      capacity: car.capacity ?? '',
      operatorPricePerDay: car.operatorPricePerDay ?? '',
      pricePerHour: car.pricePerHour ?? '',
      withOperator: !!car.withOperator,
      images: Array.isArray(car.images) ? car.images : car.imageUrl ? [car.imageUrl] : [],
      tags: Array.isArray(car.tags) ? car.tags : []
    })
    setEditing(car)
    setMessage(null)
    setPendingFiles([])
  }

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    const images = Array.isArray(form.images) ? form.images.filter(Boolean) : []
    const payload = {
      ...form,
      year: Number(form.year),
      pricePerDay: Number(form.pricePerDay),
      seats: form.seats === '' ? null : Number(form.seats),
      capacity: form.capacity === '' ? null : Number(form.capacity),
      operatorPricePerDay: form.operatorPricePerDay === '' ? null : Number(form.operatorPricePerDay),
      pricePerHour: form.pricePerHour === '' ? null : Number(form.pricePerHour),
      withOperator: !!form.withOperator,
      images,
      imageUrl: images[0] || null,
      tags: Array.isArray(form.tags) ? form.tags : []
    }
    try {
      let savedId = editing !== 'new' ? editing.id : null

      if (editing === 'new') {
        const created = await apiPost('/api/v1/vehicles', payload)
        savedId = created?.id ?? null
        setMessage({ kind: 'success', text: 'Техника добавлена.' })
      } else {
        await apiPut(`/api/v1/vehicles/${editing.id}`, payload)
        setMessage({ kind: 'success', text: 'Техника обновлена.' })
      }

      // Загрузка выбранных файлов: у новой техники — после создания (нужен id).
      if (savedId && pendingFiles.length > 0) {
        await apiUpload(`/api/v1/vehicles/${savedId}/images`, pendingFiles)
        setMessage({
          kind: 'success',
          text: `Фото загружено: ${pendingFiles.length}. Не забудьте сохранить, если добавляли ссылки вручную.`
        })
      }

      setPendingFiles([])
      setEditing(null)
      load()
    } catch (err) {
      const fields = err.fieldErrors
        ? Object.entries(err.fieldErrors)
            .map(([f, m]) => `${f}: ${m}`)
            .join('; ')
        : ''
      setMessage({ kind: 'error', text: fields || err.message })
    } finally {
      setBusy(false)
    }
  }

  const changeStatus = async (car, status) => {
    try {
      await apiPatch(`/api/v1/vehicles/${car.id}/status`, { status })
      setMessage({ kind: 'success', text: `Статус «${car.brand} ${car.model}» → ${CAR_STATUS_LABELS[status]}.` })
      load()
    } catch (err) {
      setMessage({ kind: 'error', text: err.message })
    }
  }

  const remove = async (car) => {
    if (!window.confirm(`Удалить ${car.brand} ${car.model} (${car.licensePlate})?`)) return
    try {
      await apiDelete(`/api/v1/vehicles/${car.id}`)
      setMessage({
        kind: 'success',
        text: 'Техника удалена. Если по ней были брони — она переведена в архив.'
      })
      load()
    } catch (err) {
      setMessage({ kind: 'error', text: err.message })
    }
  }

  const update = (key) => (e) => {
    const value = e.target.value
    if (key === 'type') {
      // При смене группы подбираем первую подкатегорию и сбрасываем зависимые поля.
      const firstCat = (CATEGORY_GROUPS[value] || [])[0] || ''
      setForm((f) => ({
        ...f,
        type: value,
        category: firstCat,
        capacity: '',
        withOperator: false,
        operatorPricePerDay: '',
        pricePerHour: '',
        requiredLicense: value === 'PASSENGER' ? 'B' : value === 'CARGO' ? 'C' : 'SPECIAL'
      }))
    } else if (key === 'withOperator') {
      setForm((f) => ({ ...f, withOperator: e.target.checked }))
    } else {
      setForm({ ...form, [key]: value })
    }
  }

  const isPassenger = form.type === 'PASSENGER'
  const categoryChoices = CATEGORY_GROUPS[form.type] || Object.keys(CATEGORY_LABELS)

  return (
    <>
      <div className="admin-toolbar">
        <button className="btn btn-primary" onClick={openCreate}>
          + Добавить автомобиль
        </button>
      </div>

      <Alert kind={message?.kind}>{message?.text}</Alert>
      <Alert>{error}</Alert>
      {loading && <Spinner label="Загружаем автопарк…" />}

      {!loading && data && data.content.length === 0 && <EmptyState icon="🚗" title="Автомобилей нет" />}

      {!loading && data && data.content.length > 0 && (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Автомобиль</th>
                  <th>Номер</th>
                  <th>Город</th>
                  <th>Цена/день</th>
                  <th>Статус</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {data.content.map((car) => (
                  <tr key={car.id}>
                    <td>{car.id}</td>
                    <td>
                      {car.brand} {car.model} <span className="muted">({car.year})</span>
                    </td>
                    <td>{car.licensePlate}</td>
                    <td>{car.city}</td>
                    <td>{money(car.pricePerDay)}</td>
                    <td>
                      <StatusBadge value={car.status} labels={CAR_STATUS_LABELS} />
                    </td>
                    <td className="table-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(car)}>
                        ✏️
                      </button>
                      {car.status !== 'ACTIVE' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => changeStatus(car, 'ACTIVE')}>
                          Активировать
                        </button>
                      )}
                      {car.status === 'ACTIVE' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => changeStatus(car, 'MAINTENANCE')}>
                          На ТО
                        </button>
                      )}
                      <button className="btn btn-danger btn-sm" onClick={() => remove(car)}>
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} totalElements={data.totalElements} onChange={setPage} />
        </>
      )}

      {editing && (
        <Modal title={editing === 'new' ? 'Новый автомобиль' : `Редактирование: ${editing.brand} ${editing.model}`} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="form">
            <div className="form-row">
              <label>
                Марка
                <input required maxLength={50} value={form.brand} onChange={update('brand')} />
              </label>
              <label>
                Модель
                <input required maxLength={50} value={form.model} onChange={update('model')} />
              </label>
            </div>
            <div className="form-row">
              <label>
                Год
                <input type="number" min="1990" max="2100" required value={form.year} onChange={update('year')} />
              </label>
              <label>
                Номер
                <input required maxLength={20} value={form.licensePlate} onChange={update('licensePlate')} placeholder="123ABC02" />
              </label>
            </div>
            <div className="form-row">
              <label>
                Группа
                <select value={form.type} onChange={update('type')}>
                  {Object.entries(VEHICLE_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Категория
                <select value={form.category} onChange={update('category')}>
                  {categoryChoices.map((v) => (
                    <option key={v} value={v}>
                      {CATEGORY_LABELS[v]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-row">
              <label>
                Коробка
                <select value={form.transmission} onChange={update('transmission')}>
                  {Object.entries(TRANSMISSION_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Топливо
                <select value={form.fuelType} onChange={update('fuelType')}>
                  {Object.entries(FUEL_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-row">
              {isPassenger ? (
                <label>
                  Мест
                  <input type="number" min="2" max="9" value={form.seats} onChange={update('seats')} />
                </label>
              ) : (
                <label>
                  Грузоподъёмность, т
                  <input type="number" min="0" step="0.1" value={form.capacity} onChange={update('capacity')} placeholder="Например: 5" />
                </label>
              )}
              <label>
                Права / удостоверение
                <select value={form.requiredLicense} onChange={update('requiredLicense')}>
                  {Object.entries(LICENSE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {!isPassenger && (
              <div className="form-row">
                <label className="checkbox-label">
                  <input type="checkbox" checked={!!form.withOperator} onChange={update('withOperator')} />
                  Аренда с оператором
                </label>
                <label>
                  Цена с оператором, ₸/день
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={form.operatorPricePerDay}
                    onChange={update('operatorPricePerDay')}
                    disabled={!form.withOperator}
                    placeholder="0"
                  />
                </label>
              </div>
            )}
            <div className="form-row">
              <label>
                Цена за день, ₸
                <input type="number" min="1" step="0.01" required value={form.pricePerDay} onChange={update('pricePerDay')} />
              </label>
              <label>
                Цена за час, ₸ {form.type === 'SPECIAL' ? '' : '(необязательно)'}
                <input type="number" min="1" step="0.01" value={form.pricePerHour} onChange={update('pricePerHour')} placeholder="0" />
              </label>
            </div>
            <label>
              Город
              <select value={form.city} onChange={update('city')}>
                {CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Описание
              <textarea rows={3} maxLength={2000} value={form.description || ''} onChange={update('description')} />
            </label>

            {/* Теги умных подборок: «для стройки», «для свадьбы», «для гор»… */}
            <div className="tags-field">
              <span className="photos-label">Теги подборок</span>
              <div className="tags-list">
                {Object.entries(TAG_LABELS).map(([tag, label]) => {
                  const checked = (form.tags || []).includes(tag)
                  return (
                    <label key={tag} className={`tag-chip ${checked ? 'tag-chip-on' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setForm((f) => ({
                            ...f,
                            tags: checked
                              ? (f.tags || []).filter((t) => t !== tag)
                              : [...(f.tags || []), tag]
                          }))
                        }
                      />
                      {label}
                    </label>
                  )
                })}
              </div>
              <small className="muted">Теги помогают найти технику в умных подборках на главной.</small>
            </div>

            {/* Фотографии: загрузка нескольких файлов + список ссылок с удалением. */}
            <div className="photos-field">
              <span className="photos-label">Фотографии</span>

              <div className="photos-list">
                {(form.images || []).length === 0 && pendingFiles.length === 0 && (
                  <span className="muted">Фото пока нет — добавьте файлы или ссылку ниже.</span>
                )}
                {(form.images || []).map((img, i) => (
                  <div key={img} className="photo-item">
                    <img src={img} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.opacity = 0.25 }} />
                    <button
                      type="button"
                      className="icon-btn"
                      title="Убрать фото"
                      onClick={() =>
                        setForm((f) => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }))
                      }
                    >
                      ✕
                    </button>
                    {i === 0 && pendingFiles.length === 0 && <span className="photo-main-tag">главное</span>}
                  </div>
                ))}
                {/* Превью ещё не загруженных файлов: попадут в галерею после «Сохранить». */}
                {pendingFiles.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="photo-item photo-item-new">
                    <img src={URL.createObjectURL(f)} alt="" loading="lazy" />
                    <button
                      type="button"
                      className="icon-btn"
                      title="Убрать файл"
                      onClick={() => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      ✕
                    </button>
                    <span className="photo-new-tag">новое</span>
                  </div>
                ))}
              </div>

              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const chosen = Array.from(e.target.files || [])
                  if (chosen.length === 0) return
                  setPendingFiles((prev) => [...prev, ...chosen])
                  e.target.value = ''
                }}
              />
              <small className="muted">
                Можно выбрать несколько фото разом. Файлы сохранятся при нажатии «Сохранить» (до 10 МБ, jpg/png/webp/gif).
              </small>

              <div className="photo-url-row">
                <input
                  maxLength={500}
                  placeholder="Или вставьте ссылку и нажмите Enter: /images/vehicles/1/1.jpg"
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return
                    e.preventDefault()
                    const value = form.imageUrl?.trim()
                    if (!value) return
                    setForm((f) => ({
                      ...f,
                      images: [...(f.images || []), value],
                      imageUrl: ''
                    }))
                  }}
                  value={form.imageUrl || ''}
                  onChange={update('imageUrl')}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
                Отмена
              </button>
              <button className="btn btn-primary" disabled={busy}>
                {busy ? 'Сохраняем…' : 'Сохранить'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}

/* ---------------- Reservations ---------------- */

// Цикл статусов: PENDING → CONFIRMED → ACTIVE → COMPLETED;
// CANCELLED доступен на активных этапах.
const NEXT_STATUS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['ACTIVE', 'COMPLETED', 'CANCELLED'],
  ACTIVE: ['COMPLETED', 'CANCELLED'],
  CANCELLED: [],
  COMPLETED: []
}

function AdminReservations() {
  const { isAdmin } = useAuth()
  const [data, setData] = useState(null)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Владелец управляет бронями по своей технике, админ — всеми.
      const path = isAdmin
        ? '/api/v1/reservations'
        : '/api/v1/reservations/for-my-vehicles'
      setData(await apiGet(path, { page, size: 10, sortBy: 'createdAt', direction: 'desc' }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [page, isAdmin])

  useEffect(() => {
    load()
  }, [load])

  const updateStatus = async (reservation, status) => {
    try {
      await apiPatch(`/api/v1/reservations/${reservation.id}/status`, { status })
      setMessage({ kind: 'success', text: `Бронь #${reservation.id} → ${RESERVATION_STATUS_LABELS[status]}.` })
      load()
    } catch (err) {
      setMessage({ kind: 'error', text: err.message })
    }
  }

  return (
    <>
      <Alert kind={message?.kind}>{message?.text}</Alert>
      <Alert>{error}</Alert>
      {loading && <Spinner label="Загружаем брони…" />}

      {!loading && data && data.content.length === 0 && <EmptyState icon="🗓" title="Броней нет" />}

      {!loading && data && data.content.length > 0 && (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Клиент</th>
                  <th>Автомобиль</th>
                  <th>Даты</th>
                  <th>Сумма</th>
                  <th>Статус</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {data.content.map((reservation) => (
                  <tr key={reservation.id}>
                    <td>{reservation.id}</td>
                    <td>{reservation.userEmail}</td>
                    <td>
                      {reservation.carBrand} {reservation.carModel}
                    </td>
                    <td>
                      {dateLabel(reservation.startDate)} → {dateLabel(reservation.endDate)}
                    </td>
                    <td>{money(reservation.totalPrice)}</td>
                    <td>
                      <StatusBadge value={reservation.status} labels={RESERVATION_STATUS_LABELS} />
                    </td>
                    <td className="table-actions">
                      {NEXT_STATUS[reservation.status]?.map((status) => (
                        <button
                          key={status}
                          className={`btn btn-sm ${status === 'CANCELLED' ? 'btn-danger' : 'btn-primary'}`}
                          onClick={() => updateStatus(reservation, status)}
                        >
                          {status === 'CONFIRMED' && '✓ Подтвердить'}
                          {status === 'ACTIVE' && '▶ Активировать'}
                          {status === 'COMPLETED' && '🏁 Завершить'}
                          {status === 'CANCELLED' && '✕ Отменить'}
                        </button>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} totalElements={data.totalElements} onChange={setPage} />
        </>
      )}
    </>
  )
}

/* ---------------- Reviews ---------------- */

function AdminReviews() {
  const [data, setData] = useState(null)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await apiGet('/api/v1/reviews', { page, size: 10, sortBy: 'createdAt', direction: 'desc' }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    load()
  }, [load])

  const setStatus = async (review, status) => {
    try {
      await apiPatch(`/api/v1/reviews/${review.id}/visibility`, { status })
      setMessage({ kind: 'success', text: `Отзыв #${review.id} → ${REVIEW_STATUS_LABELS[status]}.` })
      load()
    } catch (err) {
      setMessage({ kind: 'error', text: err.message })
    }
  }

  const remove = async (review) => {
    if (!window.confirm(`Удалить отзыв #${review.id}?`)) return
    try {
      await apiDelete(`/api/v1/reviews/${review.id}`)
      setMessage({ kind: 'success', text: 'Отзыв удалён.' })
      load()
    } catch (err) {
      setMessage({ kind: 'error', text: err.message })
    }
  }

  return (
    <>
      <Alert kind={message?.kind}>{message?.text}</Alert>
      <Alert>{error}</Alert>
      {loading && <Spinner label="Загружаем отзывы…" />}

      {!loading && data && data.content.length === 0 && <EmptyState icon="💬" title="Отзывов нет" />}

      {!loading && data && data.content.length > 0 && (
        <>
          <div className="reviews-list">
            {data.content.map((review) => (
              <article key={review.id} className={`card review ${review.status === 'HIDDEN' ? 'review-hidden' : ''}`}>
                <div className="review-head">
                  <b>
                    {review.userFirstName} {review.userLastName}
                  </b>
                  <span className="review-rating">{'⭐'.repeat(review.rating)}</span>
                  <span className="muted">
                    {review.carBrand} {review.carModel} · бронь #{review.reservationId} · {dateLabel(review.createdAt)}
                  </span>
                  <StatusBadge value={review.status} labels={REVIEW_STATUS_LABELS} />
                </div>
                <p>{review.comment}</p>
                <div className="review-actions">
                  {review.status === 'VISIBLE' ? (
                    <button className="btn btn-ghost btn-sm" onClick={() => setStatus(review, 'HIDDEN')}>
                      👁 Скрыть
                    </button>
                  ) : (
                    <button className="btn btn-ghost btn-sm" onClick={() => setStatus(review, 'VISIBLE')}>
                      👁 Показать
                    </button>
                  )}
                  <button className="btn btn-danger btn-sm" onClick={() => remove(review)}>
                    🗑 Удалить
                  </button>
                </div>
              </article>
            ))}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} totalElements={data.totalElements} onChange={setPage} />
        </>
      )}
    </>
  )
}
