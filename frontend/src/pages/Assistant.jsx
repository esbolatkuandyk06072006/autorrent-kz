import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, apiGet } from '../api.js'
import CarImage from '../components/CarImage.jsx'
import { useAuth } from '../AuthContext.jsx'
import { useTranslation } from '../i18n.jsx'
import {
  IconAssistant,
  IconMic,
  IconRestore,
  IconSend,
  IconVolume,
  IconVolumeOff
} from '../components/icons.jsx'
import { money } from '../utils.js'

const SUGGESTIONS = {
  ru: [
    'Подбери машину до 25000 тенге в Алматы',
    'Внедорожник в Астане',
    'Как работает скидка?',
    'Какие документы нужны?'
  ],
  kz: [
    'Алматыда 25 000 теңгеге дейін көлік таңда',
    'Астанада көлік керек',
    'Жеңілдік қалай жұмыс істейді?',
    'Қандай құжаттар керек?'
  ],
  en: [
    'Find a car in Almaty under 25,000 tenge',
    'I need an SUV in Astana',
    'How does the discount work?',
    'What documents do I need?'
  ]
}

const VOICE_LANG = { ru: 'ru-RU', kz: 'kk-KZ', en: 'en-US' }
const TIME_LOCALE = { ru: 'ru-RU', kz: 'kk-KZ', en: 'en-US' }

const nowTime = (lang) =>
  new Date().toLocaleTimeString(TIME_LOCALE[lang] || 'ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  })

const suggestionsFor = (lang) => SUGGESTIONS[lang] || SUGGESTIONS.ru

const cleanForSpeech = (text) =>
  String(text ?? '')
    .replace(/[*_#`>]/g, '')
    .replace(/\s*\n+\s*/g, '. ')
    .trim()

function buildGreeting(t, lang, user) {
  return {
    id: 0,
    role: 'bot',
    text: t('assistant.greeting', { name: user?.firstName ? `, ${user.firstName}` : '' }),
    suggestions: suggestionsFor(lang),
    cars: [],
    time: nowTime(lang)
  }
}

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
  const data = await apiGet('/api/v1/vehicles', {
    ...params,
    size: 3,
    sortBy: 'pricePerDay',
    direction: 'asc'
  })
  const cars = (data?.content || []).filter((c) => c.status === 'ACTIVE')

  if (cars.length === 0) {
    return {
      text: 'По вашим критериям ничего не нашлось в каталоге (автономный режим). Попробуйте увеличить бюджет или выбрать другой город.',
      suggestions: SUGGESTIONS.ru,
      cars: []
    }
  }

  const label = [category && category.toLowerCase(), city, budget && `до ${budget} ₸`]
    .filter(Boolean)
    .join(', ')
  return {
    text: `Подобрал ${cars.length} вариант(а)${label ? ` (${label})` : ''}. Работаю в автономном режиме — данные из каталога.`,
    suggestions: SUGGESTIONS.ru,
    cars
  }
}

// ---------------------------------------------------------------------------

function BotMessage({
  message,
  onSpeak,
  speaking,
  speechSupported,
  speakLabel,
  stopLabel,
  unsupportedLabel
}) {
  const lines = String(message.text ?? '').split('\n')
  return (
    <div className="msg msg-bot">
      <span className="msg-avatar">
        <IconAssistant size={18} />
      </span>
      <div className="msg-body">
        <div className="msg-bubble">
          {lines.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
        <div className="msg-actions">
          <button
            type="button"
            className={`msg-speak${speaking ? ' is-speaking' : ''}`}
            onClick={() => onSpeak(message)}
            disabled={!speechSupported}
            title={speechSupported ? (speaking ? stopLabel : speakLabel) : unsupportedLabel}
            aria-label={speechSupported ? (speaking ? stopLabel : speakLabel) : unsupportedLabel}
            aria-pressed={speaking}
          >
            {speaking ? <IconVolumeOff size={15} /> : <IconVolume size={15} />}
            <span>{speaking ? stopLabel : speakLabel}</span>
          </button>
          {message.time && <span className="msg-time">{message.time}</span>}
        </div>
      </div>
    </div>
  )
}

function UserMessage({ message }) {
  return (
    <div className="msg msg-user">
      <div className="msg-body msg-body-user">
        <div className="msg-bubble">{message.text}</div>
        {message.time && <span className="msg-time">{message.time}</span>}
      </div>
    </div>
  )
}

function CarMini({ car }) {
  const { t } = useTranslation()
  return (
    <Link to={`/cars/${car.id}`} className="chat-car">
      <CarImage car={car} />
      <div className="chat-car-body">
        <b>
          {car.brand} {car.model}
        </b>
        <span className="muted">
          {car.city} · {car.year}
        </span>
        <span className="chat-car-price">
          {money(car.pricePerDay)} / {t('cars.perDay')}
        </span>
      </div>
    </Link>
  )
}

export default function Assistant() {
  const { user } = useAuth()
  const { t, lang } = useTranslation()

  const [messages, setMessages] = useState(() => [buildGreeting(t, lang, user)])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [offline, setOffline] = useState(false)
  const [speakingId, setSpeakingId] = useState(null)
  const [voiceError, setVoiceError] = useState(false)
  const [listening, setListening] = useState(false)

  const bottomRef = useRef(null)
  const nextIdRef = useRef(1)
  const requestRef = useRef(0)
  const voiceErrorTimer = useRef(null)
  const recognitionRef = useRef(null)

  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null
  const speechSupported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window
  const RecognitionCtor =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null
  const voiceLang = VOICE_LANG[lang] || VOICE_LANG.ru

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, busy])

  const stopSpeaking = useCallback(() => {
    if (synth) synth.cancel()
    setSpeakingId(null)
  }, [synth])

  // Останавливаем озвучку при уходе со страницы и смене языка.
  useEffect(() => {
    return () => {
      if (synth) synth.cancel()
      if (voiceErrorTimer.current) clearTimeout(voiceErrorTimer.current)
    }
  }, [synth])

  useEffect(() => {
    stopSpeaking()
  }, [lang, stopSpeaking])

  const showVoiceError = () => {
    setVoiceError(true)
    if (voiceErrorTimer.current) clearTimeout(voiceErrorTimer.current)
    voiceErrorTimer.current = setTimeout(() => setVoiceError(false), 2800)
  }

  const speak = (message) => {
    if (!speechSupported) return
    if (speakingId === message.id) {
      stopSpeaking()
      return
    }
    synth.cancel()
    const utterance = new window.SpeechSynthesisUtterance(cleanForSpeech(message.text))
    utterance.lang = voiceLang

    // Подбираем голос выбранного языка; если его нет — браузер использует
    // голос по умолчанию, но произношение всё равно помечается нужной локалью.
    const voices = synth.getVoices()
    const normalize = (value) => String(value || '').replace('_', '-').toLowerCase()
    const target = voiceLang.toLowerCase()
    const exact = voices.find((v) => normalize(v.lang) === target)
    const base = voices.find((v) => normalize(v.lang).startsWith(target.slice(0, 2)))
    if (exact || base) utterance.voice = exact || base

    utterance.rate = 1.02
    utterance.pitch = 1.04
    utterance.onend = () => setSpeakingId((id) => (id === message.id ? null : id))
    utterance.onerror = (event) => {
      if (event?.error === 'interrupted' || event?.error === 'canceled') return
      setSpeakingId(null)
      showVoiceError()
    }

    setVoiceError(false)
    setSpeakingId(message.id)
    synth.speak(utterance)
  }

  const resetChat = () => {
    stopSpeaking()
    requestRef.current += 1
    setBusy(false)
    setOffline(false)
    setMessages([buildGreeting(t, lang, user)])
  }

  const pushBot = (payload) =>
    setMessages((prev) => [
      ...prev,
      {
        id: nextIdRef.current++,
        role: 'bot',
        time: nowTime(lang),
        cars: [],
        suggestions: suggestionsFor(lang),
        ...payload
      }
    ])

  const send = async (text) => {
    const message = (text ?? input).trim()
    if (!message || busy) return
    stopSpeaking()
    setInput('')
    setMessages((prev) => [
      ...prev,
      { id: nextIdRef.current++, role: 'user', text: message, time: nowTime(lang) }
    ])
    setBusy(true)
    const requestId = ++requestRef.current
    try {
      const data = await api('/api/v1/ai/chat', { method: 'POST', body: { message } })
      if (requestId !== requestRef.current) return
      setOffline(false)
      pushBot({
        text: data?.reply || t('common.error'),
        suggestions: data?.suggestions?.length ? data.suggestions : suggestionsFor(lang),
        cars: data?.cars || []
      })
    } catch (err) {
      if (requestId !== requestRef.current) return
      // AI service unreachable or errored — degrade gracefully to the
      // rule-based fallback over the real catalog instead of a dead end.
      try {
        const fb = await fallbackRecommend(message)
        if (requestId !== requestRef.current) return
        setOffline(true)
        pushBot(fb)
      } catch (fbErr) {
        if (requestId !== requestRef.current) return
        setOffline(true)
        pushBot({
          text: `${t('common.error')}: ${err.message}`,
          suggestions: suggestionsFor(lang),
          cars: []
        })
      }
    } finally {
      if (requestId === requestRef.current) setBusy(false)
    }
  }

  const toggleMic = () => {
    if (!RecognitionCtor) return
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    try {
      const recognition = new RecognitionCtor()
      recognition.lang = voiceLang
      recognition.interimResults = false
      recognition.maxAlternatives = 1
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim()
        if (transcript) send(transcript)
      }
      recognition.onend = () => setListening(false)
      recognition.onerror = () => setListening(false)
      recognitionRef.current = recognition
      recognition.start()
      setListening(true)
    } catch {
      setListening(false)
    }
  }

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort?.()
    }
  }, [])

  const lastBot = [...messages].reverse().find((m) => m.role === 'bot')
  const showSuggestions =
    !busy && lastBot?.suggestions?.length > 0 && messages[messages.length - 1]?.role === 'bot'

  return (
    <div className="container section assistant">
      <div className="page-head assistant-head">
        <div>
          <h1 className="assistant-title">
            <span className="assistant-title-icon">
              <IconAssistant size={24} />
            </span>
            {t('assistant.title')}
          </h1>
          <p className="muted">{t('assistant.subtitle')}</p>
        </div>
        <span className={`badge assistant-status${offline ? ' badge-maintenance' : ' badge-active'}`}>
          <span className="assistant-status-dot" />
          {offline ? t('assistant.offline') : t('assistant.online')}
        </span>
      </div>

      <div className="chat chat-app">
        <div className="chat-head">
          <span className="chat-orb">
            <IconAssistant size={22} />
          </span>
          <div className="chat-head-text">
            <b>{t('assistant.name')}</b>
            <span className={`chat-presence${offline ? ' is-offline' : ''}`}>
              <i />
              {offline ? t('assistant.offline') : t('assistant.online')}
            </span>
          </div>
          <div className="chat-head-actions">
            <span className="chat-voice-lang" title={voiceLang}>
              {lang.toUpperCase()}
            </span>
            <button
              type="button"
              className="chat-reset"
              onClick={resetChat}
              title={t('assistant.reset')}
              aria-label={t('assistant.reset')}
            >
              <IconRestore size={17} />
            </button>
          </div>
        </div>

        <div className="chat-messages" aria-live="polite">
          {messages.map((m) => (
            <div key={m.id} className="msg-wrap">
              {m.role === 'user' ? (
                <UserMessage message={m} />
              ) : (
                <BotMessage
                  message={m}
                  onSpeak={speak}
                  speaking={speakingId === m.id}
                  speechSupported={speechSupported}
                  speakLabel={t('assistant.speak')}
                  stopLabel={t('assistant.stopSpeaking')}
                  unsupportedLabel={t('assistant.voiceUnsupported')}
                />
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
            <div className="msg msg-bot msg-typing-wrap">
              <span className="msg-avatar">
                <IconAssistant size={18} />
              </span>
              <div className="msg-body">
                <div className="msg-bubble msg-typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="msg-time">{t('assistant.thinking')}</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {voiceError && <div className="chat-voice-error">{t('assistant.voiceError')}</div>}

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
          {RecognitionCtor && (
            <button
              type="button"
              className={`chat-mic${listening ? ' is-listening' : ''}`}
              onClick={toggleMic}
              title={listening ? t('assistant.listening') : t('assistant.mic')}
              aria-label={listening ? t('assistant.listening') : t('assistant.mic')}
              aria-pressed={listening}
            >
              <IconMic size={19} />
            </button>
          )}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={listening ? t('assistant.listening') : t('assistant.placeholder')}
            maxLength={500}
            disabled={busy}
            aria-label={t('assistant.placeholder')}
          />
          <button className="btn btn-primary chat-send" disabled={busy || !input.trim()}>
            {busy ? <span className="chat-send-dots">…</span> : <IconSend size={18} />}
            <span className="chat-send-label">{t('assistant.send')}</span>
          </button>
        </form>
      </div>
    </div>
  )
}
