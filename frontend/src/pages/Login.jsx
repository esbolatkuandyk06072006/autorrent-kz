import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { apiPost } from '../api.js'
import { setSignup } from '../signup.js'
import { Alert } from '../components/ui.jsx'
import { useTranslation } from '../i18n.jsx'
import { COUNTRIES, countryName, findCountry } from '../countries.js'
import {
  BrandMark,
  IconArrowRight,
  IconLock,
  IconPhone,
  IconRestore,
  IconShield,
  IconSms
} from '../components/icons.jsx'

/**
 * Экран входа в стиле каршеринга (Anytime): фоновая интерактивная карта
 * (Leaflet, тёмные тайлы в духе 2GIS) и плавающая панель авторизации
 * по номеру телефона: выбор кода страны (+7) и отправка SMS-кода.
 *
 * Шаг 1 — ввод номера, шаг 2 — ввод кода из SMS. Существующие пользователи
 * получают JWT сразу; новые — signup-токен и уходят на экран соглашений (/welcome).
 * Классический вход по email/паролю доступен по ссылке (демо-доступы).
 */
export default function Login() {
  const { login, applyAuth, isAuth } = useAuth()
  const { t, lang } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  const [step, setStep] = useState('phone') // 'phone' | 'code' | 'password'
  const [countryCode, setCountryCode] = useState('KZ')
  const [national, setNational] = useState('')
  const [code, setCode] = useState('')
  const [devCode, setDevCode] = useState(null)
  const [resendIn, setResendIn] = useState(0)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })
  const [recoveryHint, setRecoveryHint] = useState(false)

  const mapHostRef = useRef(null)
  const mapRef = useRef(null)

  // Уже залогиненного — сразу в приложение.
  useEffect(() => {
    if (isAuth) navigate(location.state?.from || '/', { replace: true })
  }, [isAuth, navigate, location.state])

  // Обратный отсчёт до повторной отправки кода.
  useEffect(() => {
    if (resendIn <= 0) return undefined
    const timer = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(timer)
  }, [resendIn])

  // Фоновая карта: яркая улично-дорожная подложка Esri, панель поверх неё.
  useEffect(() => {
    let cancelled = false
    let timer = null

    const init = () => {
      const L = window.L
      if (cancelled || !mapHostRef.current || mapRef.current || !L) return
      const map = L.map(mapHostRef.current, {
        center: [43.238, 76.945],
        zoom: 12,
        zoomControl: false,
        attributionControl: true,
        scrollWheelZoom: false
      })
      // Яркие улицы и подписи Esri (без API-ключа): контрастная подложка,
      // чтобы дороги читались, а панель входа оставалась главным акцентом.
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          detectRetina: true,
          attribution: 'Tiles &copy; Esri'
        }
      ).addTo(map)
      // Точки выдачи: Алматы, Астана, Шымкент — живые пины на карте.
      const points = [
        [43.238, 76.945],
        [43.2389, 76.8897],
        [51.1284, 71.4306],
        [51.1694, 71.4491],
        [42.3, 69.59]
      ]
      points.forEach(([lat, lng]) => {
        L.circleMarker([lat, lng], {
          radius: 7,
          color: '#60a5fa',
          weight: 2,
          fillColor: '#2563eb',
          fillOpacity: 0.85
        }).addTo(map)
      })
      mapRef.current = map
      setTimeout(() => !cancelled && map.invalidateSize(), 100)
    }

    if (window.L) {
      init()
    } else {
      let tries = 0
      timer = setInterval(() => {
        tries += 1
        if (window.L) {
          clearInterval(timer)
          init()
        } else if (tries >= 50) {
          clearInterval(timer)
        }
      }, 200)
    }

    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Международный номер: код страны из списка + национальная часть.
  const country = findCountry(countryCode)
  const dialDigits = country.dial.replace(/\D/g, '')
  const maxNational = Math.max(6, 15 - dialDigits.length)
  const nationalDigits = national.replace(/\D/g, '')
  const normalizedPhone = country.dial + nationalDigits
  const displayPhone = national ? `${country.dial} ${national}` : country.dial
  const phoneValid =
    nationalDigits.length >= 6 && dialDigits.length + nationalDigits.length <= 15

  /** Форматирование национальной части: +7 — 3-3-2-2, остальные — по 3. */
  const formatNational = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, maxNational)
    if (country.dial === '+7') {
      return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 8), digits.slice(8, 10)]
        .filter(Boolean)
        .join(' ')
    }
    return digits.replace(/(\d{3})(?=\d)/g, '$1 ').trim()
  }

  const pickCountry = (nextCode) => {
    setCountryCode(nextCode)
    setError(null)
    const nextDialLength = findCountry(nextCode).dial.replace(/\D/g, '').length
    const nextMax = Math.max(6, 15 - nextDialLength)
    setNational((value) => value.replace(/\D/g, '').slice(0, nextMax))
  }

  const sendCode = async (e) => {
    e?.preventDefault()
    setError(null)
    if (!phoneValid) {
      setError(t('authScreen.errorPhone'))
      return
    }
    setLoading(true)
    try {
      const data = await apiPost('/api/v1/auth/sms/request', { phone: normalizedPhone })
      setDevCode(data.devCode || null)
      setResendIn(data.resendAfterSeconds || 60)
      setStep('code')
      setCode('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const verifyCode = async (e) => {
    e.preventDefault()
    setError(null)
    if (code.replace(/\D/g, '').length !== 6) {
      setError(t('authScreen.errorCode'))
      return
    }
    setLoading(true)
    try {
      const data = await apiPost('/api/v1/auth/sms/verify', {
        phone: normalizedPhone,
        code: code.replace(/\D/g, '')
      })
      if (data.registered && data.auth) {
        // Существующий аккаунт — вошли сразу.
        applyAuth(data.auth)
        navigate(location.state?.from || '/', { replace: true })
      } else if (data.signupToken) {
        // Новый номер — на экран соглашений с signup-токеном.
        setSignup({ phone: normalizedPhone, signupToken: data.signupToken })
        navigate('/welcome')
      } else {
        setError(t('common.error'))
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const submitPassword = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(form.email.trim(), form.password)
      navigate(location.state?.from || '/', { replace: true })
    } catch (err) {
      setError(err.status === 401 ? t('login.errorCredentials') : err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-screen">
      {/* Фоновая интерактивная карта (Leaflet) — панель авторизации поверх неё. */}
      <div ref={mapHostRef} className="auth-map" aria-hidden="true" />
      <div className="auth-map-shade" aria-hidden="true" />

      <div className="auth-panel card glass">
        <div className="auth-brand">
          <BrandMark size={40} />
          <span className="brand-text">
            AutoRent <b>KZ</b>
          </span>
        </div>

        {step !== 'password' && (
          <div className="auth-head">
            <h1>{t('authScreen.title')}</h1>
            <p className="muted">
              {step === 'phone' ? t('authScreen.subtitle') : t('authScreen.codeSubtitle', { phone: displayPhone })}
            </p>
          </div>
        )}

        <Alert>{error}</Alert>

        {step === 'phone' && (
          <form onSubmit={sendCode} className="form">
            <label className="country-field">
              <span>{t('authScreen.country')}</span>
              <select
                value={countryCode}
                onChange={(e) => pickCountry(e.target.value)}
                aria-label={t('authScreen.country')}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {countryName(c.code, lang)} · {c.dial}
                  </option>
                ))}
              </select>
            </label>
            <label className="phone-field">
              <span>{t('authScreen.phoneLabel')}</span>
              <div className="phone-row">
                <span className="phone-prefix">
                  {country.dial}
                </span>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  value={national}
                  onChange={(e) => setNational(formatNational(e.target.value))}
                  placeholder={country.dial === '+7' ? '700 123 45 67' : '123 456 789'}
                  aria-label={t('authScreen.phoneLabel')}
                />
              </div>
            </label>
            <button className="btn btn-primary btn-block" disabled={loading || !phoneValid}>
              {loading ? '…' : <><IconSms size={17} /> {t('authScreen.sendCode')}</>}
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={verifyCode} className="form">
            <label className="code-field">
              <span>{t('authScreen.codeLabel')}</span>
              <input
                className="code-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                autoFocus
              />
            </label>
            {devCode && (
              <div className="auth-devcode">
                <IconLock size={14} /> {t('authScreen.devCode', { code: devCode })}
              </div>
            )}
            <button className="btn btn-primary btn-block" disabled={loading || code.length !== 6}>
              {loading ? '…' : <>{t('authScreen.confirm')} <IconArrowRight size={16} /></>}
            </button>
            <div className="auth-code-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={sendCode}
                disabled={resendIn > 0 || loading}
              >
                {resendIn > 0
                  ? t('authScreen.resendIn', { sec: resendIn })
                  : t('authScreen.resend')}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep('phone')}>
                {t('authScreen.changePhone')}
              </button>
            </div>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={submitPassword} className="form">
            <h2>{t('login.title')}</h2>
            <label>
              {t('login.email')}
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="user@autorrent.kz"
              />
            </label>
            <label>
              {t('login.password')}
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
              />
            </label>
            <button className="btn btn-primary btn-block" disabled={loading}>
              {loading ? '…' : t('login.submit')}
            </button>
            <div className="demo-creds">
              <b>{t('login.demo')}</b>
              <code>user@autorrent.kz / User123!</code>
              <code>admin@autorrent.kz / Admin123!</code>
            </div>
          </form>
        )}

        <div className="auth-links">
          {step === 'password' ? (
            <button type="button" className="link-btn" onClick={() => setStep('phone')}>
              <IconPhone size={15} /> {t('authScreen.byPhone')}
            </button>
          ) : (
            <>
              <button type="button" className="link-btn" onClick={() => setStep('password')}>
                <IconLock size={15} /> {t('authScreen.byPassword')}
              </button>
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setStep('phone')
                  setRecoveryHint((v) => !v)
                }}
              >
                <IconRestore size={15} /> {t('authScreen.recovery')}
              </button>
            </>
          )}
        </div>

        {/* Восстановление доступа: ввод номера + SMS-код возвращает в аккаунт. */}
        {recoveryHint && step === 'phone' && (
          <p className="auth-recovery-hint">
            <IconRestore size={15} /> {t('authScreen.recoveryHint')}
          </p>
        )}

        <div className="auth-assurance">
          <span>
            <IconShield size={15} /> {t('authScreen.secure')}
          </span>
        </div>
      </div>
    </div>
  )
}
