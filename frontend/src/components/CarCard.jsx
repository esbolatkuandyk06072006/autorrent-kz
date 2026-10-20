import { Link } from 'react-router-dom'
import { CATEGORY_ICONS, CATEGORY_LABELS, money } from '../utils.js'

export default function CarCard({ car }) {
  return (
    <article className="car-card">
      <div className={`car-visual cat-${String(car.category).toLowerCase()}`}>
        <span className="car-visual-icon">{CATEGORY_ICONS[car.category] || '🚗'}</span>
        <span className="car-visual-plate">{car.licensePlate}</span>
      </div>
      <div className="car-card-body">
        <div className="car-card-title">
          <h3>
            {car.brand} {car.model}
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
          <Link className="btn btn-primary" to={`/cars/${car.id}`}>
            Подробнее
          </Link>
        </div>
      </div>
    </article>
  )
}
