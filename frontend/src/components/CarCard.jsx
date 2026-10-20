import { Link } from 'react-router-dom'
import CarArt from './CarArt.jsx'
import { CATEGORY_LABELS, money } from '../utils.js'
import { useLibrary } from '../LibraryContext.jsx'

export default function CarCard({ car, showRemoveFavorite = false, onRemoveFavorite }) {
  const { isFavorite, toggleFavorite, inCompare, toggleCompare } = useLibrary()
  const fav = isFavorite(car.id)
  const cmp = inCompare(car.id)

  return (
    <article className="car-card">
      <div className="car-card-media">
        <Link to={`/cars/${car.id}`} tabIndex={-1} aria-hidden="true">
          <CarArt car={car} />
        </Link>
        <div className="car-card-overlay">
          <button
            type="button"
            className={`icon-btn ${fav ? 'icon-btn-on' : ''}`}
            title={fav ? 'Убрать из избранного' : 'В избранное'}
            onClick={() => toggleFavorite(car.id)}
          >
            {fav ? '❤️' : '🤍'}
          </button>
          <button
            type="button"
            className={`icon-btn ${cmp ? 'icon-btn-on' : ''}`}
            title={cmp ? 'Убрать из сравнения' : 'К сравнению (до 3 машин)'}
            onClick={() => toggleCompare(car.id)}
          >
            ⇄
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
          <span>📍 {car.city}</span>
          <span>🏷 {CATEGORY_LABELS[car.category] || car.category}</span>
          <span>👥 {car.seats}</span>
        </div>
        {car.averageRating != null && (
          <div className="car-card-rating">
            ⭐ {Number(car.averageRating).toFixed(1)} · отзывов: {car.reviewCount}
          </div>
        )}
        <div className="car-card-footer">
          <div className="car-price">
            <strong>{money(car.pricePerDay)}</strong>
            <span>/ день</span>
          </div>
          <Link className="btn btn-primary btn-sm" to={`/cars/${car.id}`}>
            Подробнее
          </Link>
        </div>
        {showRemoveFavorite && (
          <button className="btn btn-ghost btn-sm btn-block" onClick={onRemoveFavorite}>
            🤍 Убрать из избранного
          </button>
        )}
      </div>
    </article>
  )
}
