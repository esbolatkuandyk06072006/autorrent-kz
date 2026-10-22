import { useEffect, useState } from 'react'
import CarArt from './CarArt.jsx'
import { mainImage } from '../utils.js'

/**
 * Фотография техники с ленивой загрузкой и аккуратной заглушкой.
 *
 * - Показывает images[0] (или imageUrl), если фото есть.
 * - Если фото нет или файл битый/не загрузился — вместо сломанной картинки
 *   рисуется детерминированная заглушка CarArt (силуэт + иконка категории).
 * - Пропорции 16:9 и object-fit: cover задаются в CSS (.car-image).
 */
export default function CarImage({ car, big = false, eager = false }) {
  const src = mainImage(car)
  const [failed, setFailed] = useState(false)

  // При смене машины сбрасываем флаг ошибки — у новой могут быть свои фото.
  useEffect(() => {
    setFailed(false)
  }, [car?.id, src])

  if (!src || failed) {
    return <CarArt car={car} big={big} />
  }

  return (
    <img
      className={`car-image ${big ? 'car-image-lg' : ''}`}
      src={src}
      alt={`${car.brand} ${car.model}`}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}