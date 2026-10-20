import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiGet, apiPost, apiPut, apiDelete } from '../api.js'
import { useAuth } from '../AuthContext.jsx'
import { Alert, Spinner, StatusBadge } from '../components/ui.jsx'
import {
  CAR_STATUS_LABELS,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  FUEL_LABELS,
  REVIEW_STATUS_LABELS,
  TRANSMISSION_LABELS,
  addDays,
  dateLabel,
  money,
  previewPrice,
  today
} from '../utils.js'

export default function CarDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuth, isAdmin, user } = useAuth()

  const [car, setCar] = useState(null)
  const [reviews, setReviews] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const [booking, setBooking] = useState({ startDate: addDays(today(), 1), endDate: addDays(today(), 4) })
  const [bookingBusy, setBookingBusy] = useState(false)
  const [bookingMsg, setBookingMsg] = useState(null)

  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' })
  const [reviewBusy, setReviewBusy] = useState(false)
  const [reviewMsg, setReviewMsg] = useState(null)
  const [editingReview, setEditingReview] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [carData, reviewsData] = await Promise.all([
        apiGet(`/api/v1/cars/${id}`),
        apiGet(`/api/v1/cars/${id}/reviews`, { page: 0, size: 10 })
      ])
      setCar(carData)
      setReviews(reviewsData?.content || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const preview = previewPrice(car?.pricePerDay, booking.startDate, booking.endDate)

  const book = async (e) => {
    e.preventDefault()
    setBookingMsg(null)
    setBookingBusy(true)
    try {
      await apiPost('/api/v1/reservations', {
        carId: Number(id),
        startDate: booking.startDate,
        endDate: booking.endDate
      })
      setBookingMsg({ kind: 'success', text: 'Бронь создана! Статус — «Ожидает». Посмотреть её можно в разделе «Мои брони».' })
    } catch (err) {
      if (err.status === 401) {
        navigate('/login', { state: { from: `/cars/${id}` } })
        return
      }
      setBookingMsg({ kind: 'error', text: err.message })
    } finally {
      setBookingBusy(false)
    }
  }

  const submitReview = async (e) => {
    e.preventDefault()
    setReviewMsg(null)
    setReviewBusy(true)
    try {
      if (editingReview) {
        await apiPut(`/api/v1/reviews/${editingReview.id}`, {
          rating: Number(reviewForm.rating),
          comment: reviewForm.comment.trim()
        })
        setReviewMsg({ kind: 'success', text: 'Отзыв обновлён.' })
      } else {
        await apiPost('/api/v1/reviews', {
          reservationId: Number(editingReview?.reservationId || reviewForm.reservationId),
          rating: Number(reviewForm.rating),
          comment: reviewForm.comment.trim()
        })
        setReviewMsg({ kind: 'success', text: 'Спасибо за отзыв!' })
      }
      setEditingReview(null)
      setReviewForm({ rating: 5, comment: '', reservationId: '' })
      load()
    } catch (err) {
      if (err.status === 401) {
        navigate('/login', { state: { from: `/cars/${id}` } })
        return
      }
      setReviewMsg({ kind: 'error', text: err.message })
    } finally {
      setReviewBusy(false)
    }
  }

  const removeReview = async (reviewId) => {
    if (!window.confirm('Удалить отзыв?')) return
    try {
      await apiDelete(`/api/v1/reviews/${reviewId}`)
      load()
    } catch (err) {
      setReviewMsg({ kind: 'error', text: err.message })
    }
  }

  if (loading) return <Spinner label="Загружаем автомобиль…" />
  if (!car) {
    return (
      <div className="container section">
        <Alert>{error || 'Автомобиль не найден'}</Alert>
      </div>
    )
  }

  const canReview = isAuth && !isAdmin
  const canEditReview = (review) =>
    isAuth && (isAdmin || (user && review.userId === user.id))

  return (
    <div className="container section">
      <div className="detail-grid">
        <div className="card detail-main">
          <div className={`car-visual car-visual-lg cat-${String(car.category).toLowerCase()}`}>
            <span className="car-visual-icon">{CATEGORY_ICONS[car.category] || '🚗'}</span>
            <span className="car-visual-plate">{car.licensePlate}</span>
          </div>
          <h1 className="detail-title">
            {car.brand} {car.model} <span className="muted">{car.year}</span>
          </h1>
          <div className="detail-badges">
            <span className="badge badge-soft">{CATEGORY_LABELS[car.category]}</span>
            <span className="badge badge-soft">{TRANSMISSION_LABELS[car.transmission]}</span>
            <span className="badge badge-soft">{FUEL_LABELS[car.fuelType]}</span>
            <span className="badge badge-soft">👥 {car.seats} мест</span>
            <span className="badge badge-soft">📍 {car.city}</span>
            <StatusBadge value={car.status} labels={CAR_STATUS_LABELS} />
          </div>
          {car.description && <p className="detail-desc">{car.description}</p>}
          {car.averageRating != null && (
            <p className="detail-rating">
              ⭐ {Number(car.averageRating).toFixed(1)} · отзывов: {car.reviewCount}
            </p>
          )}
        </div>

        <aside className="card detail-side">
          <div className="detail-price">
            <strong>{money(car.pricePerDay)}</strong>
            <span>в сутки</span>
          </div>

          {car.status === 'ACTIVE' ? (
            <form onSubmit={book} className="form">
              <label>
                Дата начала
                <input
                  type="date"
                  required
                  min={today()}
                  value={booking.startDate}
                  onChange={(e) => setBooking({ ...booking, startDate: e.target.value })}
                />
              </label>
              <label>
                Дата окончания
                <input
                  type="date"
                  required
                  min={booking.startDate || today()}
                  value={booking.endDate}
                  onChange={(e) => setBooking({ ...booking, endDate: e.target.value })}
                />
              </label>

              <div className="price-preview">
                <div>
                  <span>Срок</span>
                  <b>{preview.days ? `${preview.days} дн.` : '—'}</b>
                </div>
                <div>
                  <span>Итого</span>
                  <b>{preview.total ? money(preview.total) : '—'}</b>
                </div>
                {preview.discounted && <div className="discount-tag">Скидка 10% применена 🎉</div>}
              </div>

              <button className="btn btn-primary btn-block" disabled={bookingBusy}>
                {bookingBusy ? 'Бронируем…' : 'Забронировать'}
              </button>
            </form>
          ) : (
            <p className="muted">Сейчас автомобиль недоступен для бронирования.</p>
          )}

          {bookingMsg && <Alert kind={bookingMsg.kind}>{bookingMsg.text}</Alert>}
        </aside>
      </div>

      <section className="card reviews-section">
        <h2>Отзывы</h2>

        {reviews.length === 0 && <p className="muted">Отзывов пока нет — будьте первым!</p>}

        <div className="reviews-list">
          {reviews.map((review) => (
            <article key={review.id} className={`review ${review.status === 'HIDDEN' ? 'review-hidden' : ''}`}>
              <div className="review-head">
                <b>
                  {review.userFirstName} {review.userLastName}
                </b>
                <span className="review-rating">{'⭐'.repeat(review.rating)}</span>
                <span className="muted">{dateLabel(review.createdAt)}</span>
                {review.status === 'HIDDEN' && <StatusBadge value="HIDDEN" labels={REVIEW_STATUS_LABELS} />}
              </div>
              <p>{review.comment}</p>
              {canEditReview(review) && (
                <div className="review-actions">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setEditingReview(review)
                      setReviewForm({ rating: review.rating, comment: review.comment })
                      setReviewMsg(null)
                    }}
                  >
                    Изменить
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => removeReview(review.id)}>
                    Удалить
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>

        {canReview && (
          <form onSubmit={submitReview} className="form review-form">
            <h3>{editingReview ? 'Изменить отзыв' : 'Оставить отзыв'}</h3>
            {reviewMsg && <Alert kind={reviewMsg.kind}>{reviewMsg.text}</Alert>}
            {!editingReview && (
              <label>
                Номер завершённой брони
                <input
                  type="number"
                  min="1"
                  required
                  value={reviewForm.reservationId || ''}
                  onChange={(e) => setReviewForm({ ...reviewForm, reservationId: e.target.value })}
                  placeholder="Например: 1"
                />
                <small className="muted">Отзыв можно оставить только после завершённой аренды.</small>
              </label>
            )}
            <label>
              Оценка
              <select
                value={reviewForm.rating}
                onChange={(e) => setReviewForm({ ...reviewForm, rating: e.target.value })}
              >
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {'⭐'.repeat(value)} — {value}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Комментарий
              <textarea
                required
                minLength={3}
                maxLength={1000}
                rows={3}
                value={reviewForm.comment}
                onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                placeholder="Как прошла аренда?"
              />
            </label>
            <div className="review-form-actions">
              <button className="btn btn-primary" disabled={reviewBusy}>
                {reviewBusy ? 'Отправляем…' : editingReview ? 'Сохранить' : 'Отправить отзыв'}
              </button>
              {editingReview && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setEditingReview(null)
                    setReviewForm({ rating: 5, comment: '', reservationId: '' })
                  }}
                >
                  Отмена
                </button>
              )}
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
