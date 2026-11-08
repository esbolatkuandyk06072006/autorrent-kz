import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { apiPost } from '../api.js'
import { setSignup } from '../signup.js'
import { Alert } from '../components/ui.jsx'
import { useTranslation } from '../i18n.jsx'
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
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  const [step, setStep] = useState('phone') // 'phone' | 'code' | 'password'
  const [phone, setPhone] = useState('')
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

  // Фоновая карта: тёмные тайлы Carto (стиль 2GIS), панель поверх неё.
  useEffect(() => {
    let cancelled = false
    let timer = null

    const init = () => {
      const L = window.L
      if (cancelled || !mapHostRef.current || mapRef.current || !L) return
      const map = L.map(mapHostRef.current, {
        center: [43.238, 76.945],
        zoom: 11,
        zoomControl: false,
        attributionControl: true,
        scrollWheelZoom: false
      })
      // Тёмная подложка Esri (не требует API-ключа), стиль в духе 2GIS.
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 16,
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
  }, [step])

  /** Нормализация ввода к виду +7XXXXXXXXXX (цифры после +7 — максимум 10). */
  const formatPhone = (value) => {
    let digits = value.replace(/\D/g, '')
    if (digits.startsWith('8')) digits = '7' + digits.slice(1)
    if (!digits.startsWith('7')) digits = '7' + digits
    digits = digits.slice(0, 11)
    const body = digits.slice(1)
    let out = '+7'
    if (body.length > 0) out += ' ' + body.slice(0, 3)
    if (body.length > 3) out += ' ' + body.slice(3, 6)
    if (body.length > 6) out += ' ' + body.slice(6, 8)
    if (body.length > 8) out += ' ' + body.slice(8, 10)
    return out
  }

  // В поле номер хранится с пробелами (+7 700 123 45 67), поэтому проверяем
  // только цифры и отправляем на сервер чистый формат +7XXXXXXXXXX.
  const phoneDigits = phone.replace(/\D/g, '')
  const phoneValid = /^7\d{10}$/.test(phoneDigits)
  const normalizedPhone = '+' + phoneDigits

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
              {step === 'phone' ? t('authScreen.subtitle') : t('authScreen.codeSubtitle', { phone })}
            </p>
          </div>
        )}

        <Alert>{error}</Alert>

        {step === 'phone' && (
          <form onSubmit={sendCode} className="form">
            <label className="phone-field">
              <span>{t('authScreen.phoneLabel')}</span>
              <div className="phone-row">
                <select className="phone-country" defaultValue="+7" aria-label={t('authScreen.country')}>
                  <option value="+7">KZ +7</option>
                </select>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="+7 700 123 45 67"
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
