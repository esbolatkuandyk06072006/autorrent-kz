import { useEffect, useRef, useState } from 'react'
import { IconShield } from './icons.jsx'

// Карта точки выдачи (Шаг 7). Leaflet подключён в index.html с CDN как
// глобальный window.L — библиотеку не нужно добавлять в bundle.
//
// props:
//   points — [{ id, lat, lng, title, address, price }]: пины на карте;
//   onPick — клик по пину (в каталоге открывает карточку техники);
//   route  — показывать в всплывашке ссылку «Построить маршрут» (Google Maps);
//   height — высота карты в пикселях.
export default function VehicleMap({ points = [], onPick, route = false, height = 320 }) {
  const hostRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [missing, setMissing] = useState(false)

  const valid = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))

  // Один раз создаём карту и слой маркеров; ждём загрузки Leaflet с CDN.
  useEffect(() => {
    let cancelled = false
    let timer = null

    const init = () => {
      const L = window.L
      if (cancelled || !hostRef.current || mapRef.current || !L) return
      const center = valid.length > 0 ? [valid[0].lat, valid[0].lng] : [43.238, 76.945]
      const map = L.map(hostRef.current, { scrollWheelZoom: false })
        .setView(center, valid.length === 1 ? 15 : 10)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map)
      mapRef.current = map
      layerRef.current = L.layerGroup().addTo(map)
      // Контейнер мог сменииться по размеру (например, появился после загрузки).
      setTimeout(() => map.invalidateSize(), 100)
      setReady(true)
    }

    if (window.L) {
      init()
    } else {
      // CDN ещё грузится — опрашиваем не чаще раза в 200 мс, до 10 секунд.
      let tries = 0
      timer = setInterval(() => {
        tries += 1
        if (window.L) {
          clearInterval(timer)
          init()
        } else if (tries >= 50) {
          clearInterval(timer)
          if (!cancelled) setMissing(true)
        }
      }, 200)
    }

    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        layerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Перерисовываем пины при изменении точек или обработчика клика.
  useEffect(() => {
    const L = window.L
    const map = mapRef.current
    const layer = layerRef.current
    if (!ready || !L || !map || !layer) return

    layer.clearLayers()
    if (valid.length === 0) return

    const group = L.featureGroup()
    valid.forEach((p) => {
      const marker = L.marker([p.lat, p.lng]).addTo(layer)
      if (p.title) marker.bindTooltip(p.title, { direction: 'top', offset: [0, -12] })
      if (p.address || (route && p.title)) {
        const html = [
          p.title ? `<strong>${escapeHtml(p.title)}</strong>` : '',
          p.address ? escapeHtml(p.address) : '',
          p.price ? escapeHtml(p.price) : '',
          route
            ? `<a href="${googleRoute(p.lat, p.lng)}" target="_blank" rel="noreferrer">Построить маршрут</a>`
            : ''
        ]
          .filter(Boolean)
          .join('<br/>')
        marker.bindPopup(html)
      }
      // Клик по пину: в каталоге открываем карточку, на странице машины — просто всплывашка.
      if (onPick) marker.on('click', () => onPick(p))
      group.addLayer(marker)
    })

    if (valid.length === 1) {
      map.setView([valid[0].lat, valid[0].lng], 15)
    } else {
      map.fitBounds(group.getBounds().pad(0.2), { maxZoom: 14 })
    }
  }, [ready, points, onPick, route])

  if (missing) {
    return (
      <div className="vehicle-map-fallback" style={{ minHeight: height }}>
        <IconShield size={18} /> Карта временно недоступна (не загрузилась библиотека с CDN).
        Точка выдачи: {points[0]?.address || 'адрес не указан'}.
      </div>
    )
  }

  return (
    <div
      ref={hostRef}
      className="vehicle-map"
      style={{ height }}
      role="region"
      aria-label="Карта точки выдачи"
    />
  )
}

/** Ссылка на маршрут до точки в Google Maps по координатам. */
export function googleRoute(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
