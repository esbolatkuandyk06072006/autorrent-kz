import { Link } from 'react-router-dom'
import CarImage from './CarImage.jsx'
import { CATEGORY_LABELS, LICENSE_LABELS, money } from '../utils.js'
import { useLibrary } from '../LibraryContext.jsx'
import {
  IconCalendar,
  IconCompare,
  IconHeart,
  IconLicense,
  IconOperator,
  IconPin,
  IconStar,
  IconTag,
  IconUsers,
  IconWeight
} from './icons.jsx'

/**
 * Карточка техники в каталоге: фото 16:9, быстрые действия в оверлее
 * (избранное, сравнение), метаданные авторскими SVG-иконками и футер
 * с ценой и действиями (бронь, детали). Ховер поднимает карточку.
 */
export default function CarCard({ car, showRemoveFavorite = false, onRemoveFavorite }) {
  const { isFavorite, toggleFavorite, inCompare, toggleCompare } = useLibrary()
  const fav = isFavorite(car.id)
  const cmp = inCompare(car.id)
  const isPassenger = car.type === 'PASSENGER'

  return (
    <article className="car-card">
      <div className="car-card-media">
        <Link to={`/cars/${car.id}`} tabIndex={-1} aria-hidden="true">
          <CarImage car={car} />
        </Link>
        {/* Быстрые действия поверх фото. */}
        <div className="car-card-overlay">
          <button
            type="button"
            className={`icon-btn ${fav ? 'icon-btn-on' : ''}`}
            title={fav ? 'Убрать из избранного' : 'В избранное'}
            onClick={() => toggleFavorite(car.id)}
          >
            <IconHeart size={17} filled={fav} />
          </button>
          <button
            type="button"
            className={`icon-btn ${cmp ? 'icon-btn-on' : ''}`}
            title={cmp ? 'Убрать из сравнения' : 'К сравнению (до 3 машин)'}
            onClick={() => toggleCompare(car.id)}
          >
            <IconCompare size={17} />
          </button>
        </div>
        {car.status !== 'ACTIVE' && <span className="car-card-status">недоступна</span>}
      </div>
      <div className="car-card-body">
        <div className="car-card-title">
          <h3>
            <Link to={`/cars/${car.id}`}>
              {car.brand} {car.model}
            </Link>
          </h3>
          <span className="car-card-year">{car.year}</span>
        </div>
        <div className="car-card-meta">
          <span>
            <IconPin size={14} /> {car.city}
          </span>
          <span>
            <IconTag size={14} /> {CATEGORY_LABELS[car.category] || car.category}
          </span>
          {isPassenger ? (
            <span>
              <IconUsers size={14} /> {car.seats}
            </span>
          ) : (
            <span>
              <IconWeight size={14} /> {car.capacity != null ? `${car.capacity} т` : '—'}
            </span>
          )}
        </div>
        {/* Адрес точки выдачи одной строкой (с обрезкой в CSS). */}
        {car.pickupAddress && (
          <div className="car-card-pickup" title={car.pickupAddress}>
            <IconPin size={13} /> {car.pickupAddress}
          </div>
        )}
        {(car.requiredLicense || car.withOperator) && (
          <div className="car-card-meta">
            {car.requiredLicense && (
              <span>
                <IconLicense size={14} />{' '}
                {LICENSE_LABELS[car.requiredLicense] || car.requiredLicense}
              </span>
            )}
            {car.withOperator && (
              <span>
                <IconOperator size={14} /> с оператором
              </span>
            )}
          </div>
        )}
        {car.averageRating != null && (
          <div className="car-card-rating">
            <IconStar size={14} /> {Number(car.averageRating).toFixed(1)} · отзывов:{' '}
            {car.reviewCount}
          </div>
        )}
        <div className="car-card-footer">
          <div className="car-price">
            <strong>{money(car.pricePerDay)}</strong>
            <span>/ день</span>
            {car.pricePerHour && (
              <span className="muted"> · {money(car.pricePerHour)}/час</span>
            )}
          </div>
          {/* Быстрые действия: сразу к бронированию или к деталям. */}
          <div className="car-card-actions">
            <Link className="btn btn-primary btn-sm" to={`/cars/${car.id}`}>
              <IconCalendar size={15} /> Забронировать
            </Link>
            <Link className="btn btn-ghost btn-sm" to={`/cars/${car.id}`}>
              Подробнее
            </Link>
          </div>
        </div>
        {showRemoveFavorite && (
          <button className="btn btn-ghost btn-sm btn-block" onClick={onRemoveFavorite}>
            <IconHeart size={15} /> Убрать из избранного
          </button>
        )}
      </div>
    </article>
  )
}
