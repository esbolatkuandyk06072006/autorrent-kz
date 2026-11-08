import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiGet, apiPost, apiPut, apiDelete } from '../api.js'
import { useAuth } from '../AuthContext.jsx'
import CarImage from '../components/CarImage.jsx'
import VehicleMap, { googleRoute } from '../components/VehicleMap.jsx'
import { Alert, Spinner, StatusBadge } from '../components/ui.jsx'
import {
  IconCamera,
  IconCheck,
  IconConstruction,
  IconHome,
  IconKey,
  IconLicense,
  IconMountains,
  IconOperator,
  IconPin,
  IconRoutes,
  IconShield,
  IconStar,
  IconUsers,
  IconWedding,
  IconWeight
} from '../components/icons.jsx'
import {
  CAR_STATUS_LABELS,
  CATEGORY_LABELS,
  FUEL_LABELS,
  LICENSE_LABELS,
  REVIEW_STATUS_LABELS,
  TAG_LABELS,
  TRANSMISSION_LABELS,
  VEHICLE_TYPE_LABELS,
  addDays,
  carImages,
  dateLabel,
  money,
  previewPrice,
  today
} from '../utils.js'

// Иконки тегов умных подборок — SVG вместо эмодзи.
const TAG_ICONS = {
  construction: IconConstruction,
  wedding: IconWedding,
  mountains: IconMountains,
  city: IconHome,
  longtrip: IconRoutes,
  family: IconUsers
}

// Ряд звёзд для рейтинга отзыва: n заполненных IconStar.
function Stars({ value = 0, size = 14 }) {
  return (
    <>
      {Array.from({ length: Math.max(0, Math.min(5, value)) }, (_, i) => (
        <IconStar key={i} size={size} />
      ))}
    </>
  )
}

export default function CarDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuth, isAdmin, user } = useAuth()

  const [car, setCar] = useState(null)
  const [reviews, setReviews] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activePhoto, setActivePhoto] = useState(0)

  const [booking, setBooking] = useState({ startDate: addDays(today(), 1), endDate: addDays(today(), 4) })
  const [bookingBusy, setBookingBusy] = useState(false)
  const [bookingMsg, setBookingMsg] = useState(null)

  // Шаг 4: календарь занятости, почасовая аренда, оператор и серверный расчёт.
  const [busyDates, setBusyDates] = useState([])
  const [rentalMode, setRentalMode] = useState('DAY') // 'DAY' | 'HOUR'
  const [hours, setHours] = useState(4)
  const [withOperator, setWithOperator] = useState(false)
  const [serverQuote, setServerQuote] = useState(null)
  const [quoteLoading, setQuoteLoading] = useState(false)

  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' })
  const [reviewBusy, setReviewBusy] = useState(false)
  const [reviewMsg, setReviewMsg] = useState(null)
  const [editingReview, setEditingReview] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [carData, reviewsData] = await Promise.all([
        apiGet(`/api/v1/vehicles/${id}`),
        apiGet(`/api/v1/vehicles/${id}/reviews`, { page: 0, size: 10 })
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

  // Занятые даты для календаря: их нельзя выбрать при бронировании.
  useEffect(() => {
    let alive = true
    apiGet(`/api/v1/vehicles/${id}/busy-dates`)
      .then((data) => alive && setBusyDates(Array.isArray(data) ? data : []))
      .catch(() => alive && setBusyDates([]))
    return () => {
      alive = false
    }
  }, [id])

  // При загрузке другой машины возвращаемся к первому фото.
  useEffect(() => {
    setActivePhoto(0)
  }, [id])

  // Если у машины есть почасовая цена — предлагаем и почасовой режим.
  useEffect(() => {
    if (car && !car.pricePerHour) setRentalMode('DAY')
  }, [car])

  // Серверный расчёт стоимости (скидки, оператор, часы).
  useEffect(() => {
    if (!car || car.status !== 'ACTIVE') {
      setServerQuote(null)
      return
    }
    let alive = true
    setQuoteLoading(true)
    const params = rentalMode === 'HOUR'
      ? { startDate: booking.startDate, hours: Number(hours) }
      : { startDate: booking.startDate, endDate: booking.endDate, withOperator }
    apiGet(`/api/v1/vehicles/${id}/price-quote`, params)
      .then((data) => alive && setServerQuote(data))
      .catch(() => alive && setServerQuote(null))
      .finally(() => alive && setQuoteLoading(false))
    return () => {
      alive = false
    }
  }, [id, car, rentalMode, hours, booking.startDate, booking.endDate, withOperator])

  const preview = previewPrice(car?.pricePerDay, booking.startDate, booking.endDate, {
    withOperator,
    operatorPricePerDay: car?.operatorPricePerDay
  })

  // Занятая дата? Такую дату нельзя выбрать в календаре.
  const isBusy = (iso) => busyDates.includes(iso)

  // Если выбранные даты стали заняты — подсвечиваем, но не блокируем страницу.
  const startBusy = isBusy(booking.startDate)
  const endBusy = rentalMode === 'DAY' && isBusy(booking.endDate)

  const book = async (e) => {
    e.preventDefault()
    setBookingMsg(null)
    setBookingBusy(true)
    try {
      const payload = rentalMode === 'HOUR'
        ? { carId: Number(id), startDate: booking.startDate, hours: Number(hours) }
        : { carId: Number(id), startDate: booking.startDate, endDate: booking.endDate, withOperator }
      await apiPost('/api/v1/reservations', payload)
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

  // Точка выдачи: координаты корректные числа — показываем карту и маршрут.
  const pickupPoint = useMemo(() => {
    if (!car || car.latitude == null || car.longitude == null) return null
    const lat = Number(car.latitude)
    const lng = Number(car.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return { id: car.id, lat, lng, title: `${car.brand} ${car.model}`, address: car.pickupAddress }
  }, [car])

  return (
    <div className="container section">
      <div className="detail-grid">
        <div className="card detail-main">
          <PhotoGallery car={car} active={activePhoto} onChange={setActivePhoto} />
          <h1 className="detail-title">
            {car.brand} {car.model} <span className="muted">{car.year}</span>
          </h1>
          <div className="detail-badges">
            <span className="badge badge-soft">{VEHICLE_TYPE_LABELS[car.type] || car.type}</span>
            <span className="badge badge-soft">{CATEGORY_LABELS[car.category]}</span>
            <span className="badge badge-soft">{TRANSMISSION_LABELS[car.transmission]}</span>
            <span className="badge badge-soft">{FUEL_LABELS[car.fuelType]}</span>
            {car.type === 'PASSENGER' ? (
              <span className="badge badge-soft">
                <IconUsers size={14} /> {car.seats} мест
              </span>
            ) : (
              car.capacity != null && (
                <span className="badge badge-soft">
                  <IconWeight size={14} /> {car.capacity} т
                </span>
              )
            )}
            {car.requiredLicense && (
              <span className="badge badge-soft">
                <IconLicense size={14} /> {LICENSE_LABELS[car.requiredLicense] || car.requiredLicense}
              </span>
            )}
            {car.withOperator && (
              <span className="badge badge-soft">
                <IconOperator size={14} /> с оператором
              </span>
            )}
            <span className="badge badge-soft">
              <IconPin size={14} /> {car.city}
            </span>
            <StatusBadge value={car.status} labels={CAR_STATUS_LABELS} />
          </div>

          {/* Теги умных подборок: «для стройки», «для свадьбы», «для гор». */}
          {Array.isArray(car.tags) && car.tags.length > 0 && (
            <div className="detail-tags">
              {car.tags.map((tag) => {
                const TagIcon = TAG_ICONS[tag] || IconPin
                return (
                  <span key={tag} className="badge badge-tag">
                    <TagIcon size={14} /> {TAG_LABELS[tag] || tag}
                  </span>
                )
              })}
            </div>
          )}

          {/* Подсказка про права: если у машины категория, а у клиента её нет. */}
          {isAuth && !isAdmin && car.requiredLicense && user?.drivingLicense !== car.requiredLicense && (
            <p className="field-warn">
              <IconShield size={15} /> Для аренды нужны права категории {LICENSE_LABELS[car.requiredLicense] || car.requiredLicense}.
              Укажите категорию в <a href="/profile">профиле</a>.
            </p>
          )}
          {car.description && <p className="detail-desc">{car.description}</p>}
          {car.averageRating != null && (
            <p className="detail-rating">
              <IconStar size={16} /> {Number(car.averageRating).toFixed(1)} · отзывов: {car.reviewCount}
            </p>
          )}

          {/* Шаг 7: точка выдачи — адрес, подсказка и карта с маршрутом. */}
          {(car.pickupAddress || pickupPoint) && (
            <section className="pickup-block">
              <h3>Точка выдачи</h3>
              {car.pickupAddress && (
                <p className="pickup-address">
                  <IconPin size={15} /> {car.pickupAddress}
                </p>
              )}
              {car.pickupInstructions && (
                <p className="pickup-hint">
                  <IconKey size={15} /> {car.pickupInstructions}
                </p>
              )}
              {pickupPoint && (
                <>
                  <VehicleMap points={[pickupPoint]} route height={280} />
                  <a
                    className="btn btn-primary btn-sm"
                    href={googleRoute(car.latitude, car.longitude)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <IconRoutes size={15} /> Построить маршрут
                  </a>
                </>
              )}
            </section>
          )}
        </div>

        <aside className="card detail-side">
          <div className="detail-price">
            <strong>{money(car.pricePerDay)}</strong>
            <span>в сутки</span>
            {car.pricePerHour && (
              <span className="muted" style={{ display: 'block', fontSize: '0.85rem' }}>
                {money(car.pricePerHour)} в час
              </span>
            )}
            {car.withOperator && car.operatorPricePerDay && (
              <span className="muted" style={{ display: 'block', fontSize: '0.85rem' }}>
                с оператором: {money(car.operatorPricePerDay)}/сутки
              </span>
            )}
          </div>

          {car.status === 'ACTIVE' ? (
            <form onSubmit={book} className="form">
              {/* Режим аренды: суточно или почасово (если есть почасовая цена). */}
              {car.pricePerHour && (
                <div className="rental-mode">
                  <button
                    type="button"
                    className={`btn btn-sm ${rentalMode === 'DAY' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setRentalMode('DAY')}
                  >
                    По суткам
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${rentalMode === 'HOUR' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setRentalMode('HOUR')}
                  >
                    По часам
                  </button>
                </div>
              )}

              {rentalMode === 'HOUR' ? (
                <>
                  <label>
                    Дата (выдача)
                    <input
                      type="date"
                      required
                      min={today()}
                      value={booking.startDate}
                      onChange={(e) => setBooking({ ...booking, startDate: e.target.value })}
                    />
                    {startBusy && (
                      <small className="field-warn">
                        <IconShield size={13} /> Этот день уже занят — выберите другую дату.
                      </small>
                    )}
                  </label>
                  <label>
                    Количество часов
                    <select value={hours} onChange={(e) => setHours(Number(e.target.value))}>
                      {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => (
                        <option key={h} value={h}>
                          {h} ч
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : (
                <>
                  <label>
                    Дата начала
                    <input
                      type="date"
                      required
                      min={today()}
                      value={booking.startDate}
                      onChange={(e) => setBooking({ ...booking, startDate: e.target.value })}
                    />
                    {startBusy && (
                      <small className="field-warn">
                        <IconShield size={13} /> Этот день уже занят — выберите другую дату.
                      </small>
                    )}
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
                    {endBusy && (
                      <small className="field-warn">
                        <IconShield size={13} /> Этот день уже занят — выберите другую дату.
                      </small>
                    )}
                  </label>
                </>
              )}

              {/* Опция «с оператором» — только если техника поддерживает. */}
              {rentalMode === 'DAY' && car.withOperator && car.operatorPricePerDay && (
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={withOperator}
                    onChange={(e) => setWithOperator(e.target.checked)}
                  />
                  <span>
                    С оператором (+{money(car.operatorPricePerDay)}/сутки)
                  </span>
                </label>
              )}

              <div className="price-preview">
                <div>
                  <span>Срок</span>
                  <b>
                    {rentalMode === 'HOUR'
                      ? `${hours} ч`
                      : preview.days
                        ? `${preview.days} дн.`
                        : '—'}
                  </b>
                </div>
                <div>
                  <span>Итого</span>
                  <b>
                    {serverQuote
                      ? money(serverQuote.totalPrice)
                      : preview.total
                        ? money(preview.total)
                        : '—'}
                  </b>
                </div>
                {serverQuote && serverQuote.discountPercent > 0 && (
                  <div className="discount-tag">
                    <IconCheck size={15} /> Скидка {serverQuote.discountPercent}% применена
                  </div>
                )}
                {quoteLoading && <div className="muted">Считаем стоимость…</div>}
              </div>

              <button
                className="btn btn-primary btn-block"
                disabled={bookingBusy || startBusy || endBusy}
              >
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
                <span className="review-rating">
                  <Stars value={review.rating} />
                </span>
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
                    {value} из 5
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

/**
 * Галерея фотографий техники: большое фото + миниатюры.
 * Нет фото или файл не загрузился — вместо битой картинки CarImage
 * рисует аккуратную заглушку с силуэтом и иконкой категории.
 */
function PhotoGallery({ car, active, onChange }) {
  const images = carImages(car)
  const index = Math.min(active, Math.max(images.length - 1, 0))

  if (images.length === 0) {
    return (
      <div className="gallery">
        <div className="gallery-main">
          <CarImage car={car} big eager />
        </div>
      </div>
    )
  }

  if (images.length === 1) {
    return (
      <div className="gallery">
        <div className="gallery-main">
          <CarImage car={{ ...car, images }} big eager />
        </div>
      </div>
    )
  }

  return (
    <div className="gallery">
      <div className="gallery-main">
        {/* Ключ по src: при смене фото браузер заново обрабатывает onError. */}
        <CarImage key={images[index]} car={{ ...car, images: [images[index]] }} big eager />
        <span className="gallery-counter">
          {index + 1} / {images.length}
        </span>
      </div>
      <div className="gallery-thumbs">
        {images.map((img, i) => (
          <GalleryThumb
            key={img}
            src={img}
            active={i === index}
            onSelect={() => onChange(i)}
          />
        ))}
      </div>
    </div>
  )
}

/** Миниатюра: при битой ссылке вместо сломанной картинки — иконка категории. */
function GalleryThumb({ src, active, onSelect }) {
  const [broken, setBroken] = useState(false)
  return (
    <button
      type="button"
      className={`gallery-thumb ${active ? 'gallery-thumb-active' : ''}`}
      onClick={onSelect}
      aria-label="Фото"
    >
      {broken ? (
        <span className="gallery-thumb-fallback">
          <IconCamera size={20} />
        </span>
      ) : (
        <img src={src} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} />
      )}
    </button>
  )
}
