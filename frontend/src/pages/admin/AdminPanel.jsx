import { useCallback, useEffect, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '../../api.js'
import { Alert, EmptyState, Modal, Pagination, Spinner, StatusBadge } from '../../components/ui.jsx'
import {
  CAR_STATUS_LABELS,
  CITIES,
  CATEGORY_LABELS,
  FUEL_LABELS,
  RESERVATION_STATUS_LABELS,
  REVIEW_STATUS_LABELS,
  TRANSMISSION_LABELS,
  dateLabel,
  money,
  today
} from '../../utils.js'

const EMPTY_CAR = {
  brand: '',
  model: '',
  year: 2024,
  licensePlate: '',
  category: 'COMFORT',
  transmission: 'AUTOMATIC',
  fuelType: 'PETROL',
  seats: 5,
  pricePerDay: 20000,
  city: 'Almaty',
  description: '',
  imageUrl: ''
}

export default function AdminPanel() {
  return (
    <div className="container section">
      <h1>Панель администратора</h1>
      <nav className="admin-tabs">
        <NavLink to="/admin" end>
          Автомобили
        </NavLink>
        <NavLink to="/admin/reservations">Брони</NavLink>
        <NavLink to="/admin/reviews">Отзывы</NavLink>
      </nav>
      <Routes>
        <Route index element={<AdminCars />} />
        <Route path="reservations" element={<AdminReservations />} />
        <Route path="reviews" element={<AdminReviews />} />
      </Routes>
    </div>
  )
}

/* ---------------- Cars ---------------- */

function AdminCars() {
  const [data, setData] = useState(null)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [editing, setEditing] = useState(null) // null | car object for edit | 'new'
  const [form, setForm] = useState(EMPTY_CAR)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await apiGet('/api/v1/cars', { page, size: 10, sortBy: 'id', direction: 'asc' }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setForm(EMPTY_CAR)
    setEditing('new')
    setMessage(null)
  }

  const openEdit = (car) => {
    setForm({ ...car, pricePerDay: Number(car.pricePerDay) })
    setEditing(car)
    setMessage(null)
  }

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    const payload = { ...form, year: Number(form.year), seats: Number(form.seats), pricePerDay: Number(form.pricePerDay) }
    try {
      if (editing === 'new') {
        await apiPost('/api/v1/cars', payload)
        setMessage({ kind: 'success', text: 'Автомобиль добавлен.' })
      } else {
        await apiPut(`/api/v1/cars/${editing.id}`, payload)
        setMessage({ kind: 'success', text: 'Автомобиль обновлён.' })
      }
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
      await apiPatch(`/api/v1/cars/${car.id}/status`, { status })
      setMessage({ kind: 'success', text: `Статус «${car.brand} ${car.model}» → ${CAR_STATUS_LABELS[status]}.` })
      load()
    } catch (err) {
      setMessage({ kind: 'error', text: err.message })
    }
  }

  const remove = async (car) => {
    if (!window.confirm(`Удалить ${car.brand} ${car.model} (${car.licensePlate})?`)) return
    try {
      await apiDelete(`/api/v1/cars/${car.id}`)
      setMessage({
        kind: 'success',
        text: 'Автомобиль удалён. Если по нему были брони — он переведён в архив.'
      })
      load()
    } catch (err) {
      setMessage({ kind: 'error', text: err.message })
    }
  }

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value })

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
                Категория
                <select value={form.category} onChange={update('category')}>
                  {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
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
              <label>
                Мест
                <input type="number" min="2" max="9" required value={form.seats} onChange={update('seats')} />
              </label>
              <label>
                Цена за день, ₸
                <input type="number" min="1" step="0.01" required value={form.pricePerDay} onChange={update('pricePerDay')} />
              </label>
            </div>
            <label>
              Описание
              <textarea rows={3} maxLength={2000} value={form.description || ''} onChange={update('description')} />
            </label>
            <label>
              Ссылка на фото
              <input maxLength={500} value={form.imageUrl || ''} onChange={update('imageUrl')} placeholder="https://..." />
            </label>
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

const NEXT_STATUS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  CANCELLED: [],
  COMPLETED: []
}

function AdminReservations() {
  const [data, setData] = useState(null)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await apiGet('/api/v1/reservations', { page, size: 10, sortBy: 'createdAt', direction: 'desc' }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [page])

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
