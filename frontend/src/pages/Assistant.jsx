import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import CarArt from '../components/CarArt.jsx'
import { money } from '../utils.js'

const GREETING = {
  reply:
    'Сәлем! Я AI-консультант AutoRent KZ 🤖 Могу подобрать машину под бюджет и город, объяснить скидки, документы и оплату.\nСпросите что-нибудь — или выберите вопрос ниже.',
  suggestions: ['Подбери машину до 25000 тенге в Алматы', 'Внедорожник в Астане', 'Как работает скидка?', 'Какие документы нужны?'],
  cars: []
}

function BotMessage({ text }) {
  return (
    <div className="msg msg-bot">
      <span className="msg-avatar">🤖</span>
      <div className="msg-bubble">
        {text.split('\n').map((line, i) => (
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
  const [messages, setMessages] = useState([{ role: 'bot', ...GREETING }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, busy])

  const send = async (text) => {
    const message = (text ?? input).trim()
    if (!message || busy) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text: message }])
    setBusy(true)
    try {
      const data = await api('/api/v1/ai/chat', { method: 'POST', body: { message } })
      setMessages((prev) => [...prev, { role: 'bot', text: data.reply, suggestions: data.suggestions, cars: data.cars || [] }])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: `Не получилось ответить: ${err.message}. Попробуйте ещё раз.`, suggestions: GREETING.suggestions, cars: [] }
      ])
    } finally {
      setBusy(false)
    }
  }

  const lastBot = [...messages].reverse().find((m) => m.role === 'bot')

  return (
    <div className="container section assistant">
      <div className="page-head">
        <div>
          <h1>🤖 AI-консультант</h1>
          <p className="muted">Подберёт машину под бюджет и город, подскажет правила аренды. Работает по-русски и по-казахски.</p>
        </div>
        <span className="badge badge-active">● онлайн</span>
      </div>

      <div className="chat">
        <div className="chat-messages">
          {messages.map((m, i) => (
            <div key={i}>
              {m.role === 'user' ? (
                <UserMessage text={m.text} />
              ) : (
                <BotMessage text={m.text} />
              )}
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

        {!busy && lastBot?.suggestions?.length > 0 && messages[messages.length - 1].role === 'bot' && (
          <div className="chat-suggestions">
            {lastBot.suggestions.map((s) => (
              <button key={s} className="chip" onClick={() => send(s)}>
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
          />
          <button className="btn btn-primary" disabled={busy || !input.trim()}>
            Отправить
          </button>
        </form>
      </div>
    </div>
  )
}
