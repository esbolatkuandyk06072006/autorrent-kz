import { Link } from 'react-router-dom'

/**
 * Curated road trips across Kazakhstan with a car class recommendation.
 * A feature most rental sites do not have: pick a route, get the right car.
 */
const ROUTES = [
  {
    id: 'almaty-charyn',
    emoji: '🏜',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    title: 'Алматы → Чарынское ущелье',
    distance: '290 км в одну сторону',
    duration: '~4 часа',
    season: 'Лето и осень',
    category: 'SUV',
    categoryLabel: 'Внедорожник',
    why: 'Подъёмы, грунт у каньона и смотровые площадки — нужен высокий клиренс.',
    highlights: ['Мёртвое шоссе', 'Долина замков', 'Река Чарын']
  },
  {
    id: 'astana-borovoe',
    emoji: '🏔',
    gradient: 'linear-gradient(135deg, #0ea5e9, #0369a9)',
    title: 'Астана → Боровое (Бурабай)',
    distance: '290 км',
    duration: '~3,5 часа',
    season: 'Весь год',
    category: 'COMFORT',
    categoryLabel: 'Комфорт',
    why: 'Асфальт по трассе, а в самом Бурабае хочется комфорта после дороги.',
    highlights: ['Озеро Боровое', 'Щучье', 'Смотровая Кокшетау']
  },
  {
    id: 'almaty-kolsai',
    emoji: '🏞',
    gradient: 'linear-gradient(135deg, #10b981, #047857)',
    title: 'Алматы → Кольсаи и Кайынды',
    distance: '400 км в обе стороны',
    duration: '2 дня',
    season: 'Май — октябрь',
    category: 'SUV',
    categoryLabel: 'Внедорожник',
    why: 'Дорога к озёрам местами грунтовая и узкая, горы требуют запаса тяги.',
    highlights: ['Кольсаи (2700 м)', 'Озеро Кайынды', 'Чёрный Кайынды']
  },
  {
    id: 'shymkent-turkistan',
    emoji: '🕌',
    gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    title: 'Шымкент → Туркестан',
    distance: '165 км',
    duration: '~2 часа',
    season: 'Весь год',
    category: 'ECONOMY',
    categoryLabel: 'Эконом',
    why: 'Короткая трасса, городская поездка — достаточно бюджетной машины.',
    highlights: ['Мавзолей Ясави', 'Древний город', 'Керамическая мастерская']
  },
  {
    id: 'almaty-aktau',
    emoji: '🌊',
    gradient: 'linear-gradient(135deg, #06b6d4, #0e7490)',
    title: 'Алматы → Актау (Мангистау)',
    distance: '2 600 км',
    duration: '3–4 дня',
    season: 'Весна и осень',
    category: 'BUSINESS',
    categoryLabel: 'Бизнес',
    why: 'Очень длинная трасса — важны комфорт, вместительный багажник и экономичность.',
    highlights: ['Тобе Караш', 'Мыс Ушаков', 'Карагайлы бас']
  },
  {
    id: 'astana-almaty',
    emoji: '🛣',
    gradient: 'linear-gradient(135deg, #ec4899, #be185d)',
    title: 'Астана → Алматы по трассе',
    distance: '1 210 км',
    duration: '~14 часов',
    season: 'Весь год',
    category: 'ELECTRIC',
    categoryLabel: 'Электро',
    why: 'Классическая трасса — можно показать, что электрокар тянет перегон без бензина.',
    highlights: ['Караганда', 'Балхаш', 'Кулагер']
  }
]

export default function Routes() {
  return (
    <div className="container section">
      <div className="page-head">
        <div>
          <h1>🗺 Маршруты Казахстана</h1>
          <p className="muted">
            Готовые поездки от нас: расстояние, сезон и какой класс машины лучше взять. Нажмите «Взять машину» — откроется каталог с нужным фильтром.
          </p>
        </div>
      </div>

      <div className="routes-grid">
        {ROUTES.map((route) => (
          <article key={route.id} className="route-card">
            <div className="route-cover" style={{ background: route.gradient }}>
              <span className="route-emoji">{route.emoji}</span>
              <span className="route-season">{route.season}</span>
            </div>
            <div className="route-body">
              <h3>{route.title}</h3>
              <div className="route-stats">
                <span>📏 {route.distance}</span>
                <span>⏱ {route.duration}</span>
              </div>
              <p className="route-why">
                <b>{route.categoryLabel}:</b> {route.why}
              </p>
              <ul className="route-highlights">
                {route.highlights.map((h) => (
                  <li key={h}>• {h}</li>
                ))}
              </ul>
              <Link className="btn btn-primary btn-block" to={`/?category=${route.category}`}>
                🚗 Взять {route.categoryLabel.toLowerCase()}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
