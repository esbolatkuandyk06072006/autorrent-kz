import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet } from '../api.js'
import CarCard from '../components/CarCard.jsx'
import { EmptyState, Spinner } from '../components/ui.jsx'
import { useLibrary } from '../LibraryContext.jsx'
import { useTranslation } from '../i18n.jsx'

export default function Favorites() {
  const { favorites, toggleFavorite } = useLibrary()
  const { t } = useTranslation()
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let alive = true
    if (favorites.length === 0) {
      setCars([])
      return
    }
    setLoading(true)
    Promise.allSettled(favorites.map((id) => apiGet(`/api/v1/vehicles/${id}`)))
      .then((results) => {
        if (!alive) return
        setCars(results.filter((r) => r.status === 'fulfilled').map((r) => r.value))
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [favorites])

  return (
    <div className="container section">
      <h1>❤️ {t('favorites.title')}</h1>
      <p className="muted">Машины, которые вы сохранили. Список хранится в браузере — работает даже без входа.</p>

      {loading && <Spinner label={t('common.loading')} />}

      {!loading && cars.length === 0 && (
        <EmptyState
          icon="💛"
          title={t('favorites.empty')}
          hint={t('favorites.emptyText')}
          action={
            <Link className="btn btn-primary" to="/">
              {t('notFound.back')}
            </Link>
          }
        />
      )}

      {!loading && cars.length > 0 && (
        <div className="cars-grid">
          {cars.map((car) => (
            <CarCard key={car.id} car={car} showRemoveFavorite onRemoveFavorite={() => toggleFavorite(car.id)} />
          ))}
        </div>
      )}
    </div>
  )
}
