import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, apiGet } from '../api.js'
import CarArt from '../components/CarArt.jsx'
import { money } from '../utils.js'

// Initial greeting. NOTE: the key must be `text` (not `reply`) because the
// renderer reads `message.text`. The old bug — greeting stored under `reply`
// while rendering called `text.split(...)` — crashed React into a white screen.
const GREETING = {
  role: 'bot',
  text: 'Сәлем! Я AI-консультант AutoRent KZ 🤖 Могу подобрать технику под бюджет, город и класс, объяснить скидки, документы и оплату.\nСпросите что-нибудь — или выберите вопрос ниже.',
  suggestions: [
    'Подбери машину до 25000 тенге в Алматы',
    'Внедорожник в Астане',
    'Как работает скидка?',
    'Какие документы нужны?'
  ],
  cars: []
}

const FALLBACK_SUGGESTIONS = [
  'Подбери машину до 25000 тенге в Алматы',
  'Внедорожник в Астане',
  'Электро в Шымкенте',
  'Бизнес в Караганде'
]

// ---- Client-side fallback engine ------------------------------------------
// Used when /api/v1/ai/chat is unreachable (no API key / backend down). It
// parses budget, city and category out of the message and filters the real
// catalog via GET /api/v1/vehicles, so the assistant keeps working offline.

const CITY_HINTS = {
  Almaty: ['алмат', 'almaty'],
  Astana: ['астан', 'astana', 'нур-султан'],
  Shymkent: ['шымкент', 'shymkent'],
  Karaganda: ['караган', 'karaganda'],
  Aktau: ['актау', 'aktau']
}

const CATEGORY_HINTS = {
  SUV: ['внедорож', 'джип', 'suv'],
  ELECTRIC: ['электро', 'electric'],
  BUSINESS: ['бизнес', 'business', 'премиум'],
  ECONOMY: ['эконом', 'дешев'],
  COMFORT: ['комфорт'],
  LIGHT_TRUCK: ['газель'],
  MEDIUM_TRUCK: ['грузовик', 'среднетоннаж'],
  HEAVY_TRUCK: ['фур'],
  DUMP_TRUCK: ['самосвал'],
  EXCAVATOR: ['экскаватор'],
  CRANE: ['кран'],
  BULLDOZER: ['бульдозер'],
  LOADER: ['погрузчик'],
  CONCRETE_MIXER: ['бетономешал']
}

function parseFallback(message) {
  const normalized = message.toLowerCase()
  let budget = null
  const budgetMatch = normalized.match(/(\d[\d\s]{2,})/)
  if (budgetMatch) {
    const value = Number(budgetMatch[1].replace(/\s/g, ''))
    if (value >= 100 && value <= 1_000_000_000) budget = value
  }
  let city = null
  for (const [name, hints] of Object.entries(CITY_HINTS)) {
    if (hints.some((h) => normalized.includes(h))) {
      city = name
      break
    }
  }
  let category = null
  for (const [name, hints] of Object.entries(CATEGORY_HINTS)) {
    if (hints.some((h) => normalized.includes(h))) {
      category = name
      break
    }
  }
  return { budget, city, category }
}

async function fallbackRecommend(message) {
  const { budget, city, category } = parseFallback(message)
  const params = {}
  if (city) params.city = city
  if (category) params.category = category
  if (budget) params.maxPrice = budget

  // Search active catalog with whatever criteria we could parse.
  const data = await apiGet('/api/v1/vehicles', { ...params, size: 3, sortBy: 'pricePerDay', direction: 'asc' })
  const cars = (data?.content || []).filter((c) => c.status === 'ACTIVE')

  if (cars.length === 0) {
    return {
      text: 'По вашим критериям ничего не нашлось в каталоге (автономный режим). Попробуйте увеличить бюджет или выбрать другой город.',
      suggestions: FALLBACK_SUGGESTIONS,
      cars: []
    }
  }

  const label = [category && category.toLowerCase(), city, budget && `до ${budget} ₸`]
    .filter(Boolean)
    .join(', ')
  return {
    text: `Подобрал ${cars.length} вариант(а)${label ? ` (${label})` : ''}. Работаю в автономном режиме — данные из каталога.`,
    suggestions: FALLBACK_SUGGESTIONS,
    cars
  }
}

// ---------------------------------------------------------------------------

function BotMessage({ text }) {
  const lines = String(text ?? '').split('\n')
  return (
    <div className="msg msg-bot">
      <span className="msg-avatar">🤖</span>
      <div className="msg-bubble">
        {lines.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
    </div>
  )
}

function UserMessage({ text }) {
  return (
    <div className="msg msg-user">
      <div className="msg-bubble">{text}</div>
    </div>
  )
}

function CarMini({ car }) {
  return (
    <Link to={`/cars/${car.id}`} className="chat-car">
      <CarArt car={car} />
      <div className="chat-car-body">
        <b>
          {car.brand} {car.model}
        </b>
        <span className="muted">
          {car.city} · {car.year}
        </span>
        <span className="chat-car-price">{money(car.pricePerDay)}/день</span>
      </div>
    </Link>
  )
}

export default function Assistant() {
  const [messages, setMessages] = useState([GREETING])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [offline, setOffline] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, busy])

  const pushBot = (payload) => setMessages((prev) => [...prev, { role: 'bot', cars: [], suggestions: FALLBACK_SUGGESTIONS, ...payload }])

  const send = async (text) => {
    const message = (text ?? input).trim()
    if (!message || busy) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text: message }])
    setBusy(true)
    try {
      const data = await api('/api/v1/ai/chat', { method: 'POST', body: { message } })
      setOffline(false)
      pushBot({
        text: data?.reply || 'Пустой ответ от ассистента.',
        suggestions: data?.suggestions?.length ? data.suggestions : FALLBACK_SUGGESTIONS,
        cars: data?.cars || []
      })
    } catch (err) {
      // AI service unreachable or errored — degrade gracefully to the
      // rule-based fallback over the real catalog instead of a dead end.
      try {
        const fb = await fallbackRecommend(message)
        setOffline(true)
        pushBot(fb)
      } catch (fbErr) {
        setOffline(true)
        pushBot({
          text: `Не получилось ответить: ${err.message}. Автономный подбор тоже недоступен — проверьте соединение и попробуйте ещё раз.`,
          suggestions: FALLBACK_SUGGESTIONS,
          cars: []
        })
      }
    } finally {
      setBusy(false)
    }
  }

  const lastBot = [...messages].reverse().find((m) => m.role === 'bot')
  const showSuggestions = !busy && lastBot?.suggestions?.length > 0 && messages[messages.length - 1].role === 'bot'

  return (
    <div className="container section assistant">
      <div className="page-head">
        <div>
          <h1>🤖 AI-консультант</h1>
          <p className="muted">Подберёт технику под бюджет, город и класс, подскажет правила аренды. Работает по-русски и по-казахски.</p>
        </div>
        {offline ? <span className="badge badge-maintenance">⚙ автономный режим</span> : <span className="badge badge-active">● онлайн</span>}
      </div>

      <div className="chat">
        <div className="chat-messages">
          {messages.map((m, i) => (
            <div key={i}>
              {m.role === 'user' ? <UserMessage text={m.text} /> : <BotMessage text={m.text} />}
              {m.cars?.length > 0 && (
                <div className="chat-cars">
                  {m.cars.map((car) => (
                    <CarMini key={car.id} car={car} />
                  ))}
                </div>
              )}
            </div>
          ))}
          {busy && (
            <div className="msg msg-bot">
              <span className="msg-avatar">🤖</span>
              <div className="msg-bubble msg-typing">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {showSuggestions && (
          <div className="chat-suggestions">
            {lastBot.suggestions.map((s) => (
              <button key={s} className="chip" onClick={() => send(s)} disabled={busy}>
                {s}
              </button>
            ))}
          </div>
        )}

        <form
          className="chat-input"
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Например: комфорт до 30000 тенге в Алматы"
            maxLength={500}
            disabled={busy}
          />
          <button className="btn btn-primary" disabled={busy || !input.trim()}>
            {busy ? 'Думаю…' : 'Отправить'}
          </button>
        </form>
      </div>
    </div>
  )
}
