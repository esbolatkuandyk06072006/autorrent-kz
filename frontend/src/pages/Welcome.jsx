import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert } from '../components/ui.jsx'
import { useTranslation } from '../i18n.jsx'
import { getSignup, setSignup } from '../signup.js'
import {
  BrandMark,
  IconArrowRight,
  IconCheck,
  IconRestore,
  IconTrafficLight
} from '../components/icons.jsx'

/**
 * Экран соглашений (шаг 2 каршеринг-флоу): фирменный минималистичный
 * светофор, приветствие, чекбоксы пользовательского соглашения и обработки
 * персональных данных, кнопка «Продолжить» и опция восстановления аккаунта.
 *
 * Данные (имя, согласия) сохраняются в signup-сессию; аккаунт создаётся
 * на финальном шаге KYC — здесь только ввод и проверка согласий.
 */
export default function Welcome() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const signup = getSignup()

  const [form, setForm] = useState({ firstName: '', lastName: '' })
  const [agreedTerms, setAgreedTerms] = useState(false)
  const [agreedData, setAgreedData] = useState(false)
  const [error, setError] = useState(null)

  // Нет signup-сессии (F5, прямая ссылка) — назад на вход по телефону.
  useEffect(() => {
    if (!signup?.signupToken) navigate('/login', { replace: true })
  }, [signup, navigate])

  if (!signup?.signupToken) return null

  const submit = (e) => {
    e.preventDefault()
    setError(null)
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError(t('welcome.errorName'))
      return
    }
    if (!agreedTerms || !agreedData) {
      setError(t('welcome.errorAgree'))
      return
    }
    setSignup({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      agreedTerms: true,
      agreedData: true
    })
    navigate('/kyc')
  }

  return (
    <div className="onboarding">
      <div className="onboarding-card card glass">
        <div className="onboarding-brand">
          <BrandMark size={36} />
          <span className="brand-text">
            AutoRent <b>KZ</b>
          </span>
        </div>

        {/* Фирменный минималистичный светофор. */}
        <div className="welcome-traffic">
          <IconTrafficLight size={62} />
        </div>

        <h1>{t('welcome.title')}</h1>
        <p className="muted welcome-sub">{t('welcome.subtitle', { phone: signup.phone })}</p>

        <Alert>{error}</Alert>

        <form onSubmit={submit} className="form">
          <div className="form-row">
            <label>
              {t('welcome.firstName')}
              <input
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                placeholder={t('welcome.firstNamePlaceholder')}
                maxLength={50}
                autoComplete="given-name"
              />
            </label>
            <label>
              {t('welcome.lastName')}
              <input
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                placeholder={t('welcome.lastNamePlaceholder')}
                maxLength={50}
                autoComplete="family-name"
              />
            </label>
          </div>

          {/* Чекбоксы согласий — оба обязательны для продолжения. */}
          <label className="agree-box">
            <input
              type="checkbox"
              checked={agreedTerms}
              onChange={(e) => setAgreedTerms(e.target.checked)}
            />
            <span>
              <IconCheck size={14} /> {t('welcome.agreeTerms')}
            </span>
          </label>
          <label className="agree-box">
            <input
              type="checkbox"
              checked={agreedData}
              onChange={(e) => setAgreedData(e.target.checked)}
            />
            <span>
              <IconCheck size={14} /> {t('welcome.agreeData')}
            </span>
          </label>

          <button
            className="btn btn-primary btn-block"
            disabled={!agreedTerms || !agreedData}
          >
            {t('welcome.continue')} <IconArrowRight size={16} />
          </button>
        </form>

        <div className="onboarding-foot">
          {/* Восстановление аккаунта: если номер уже зарегистрирован — вход по SMS. */}
          <button
            type="button"
            className="link-btn"
            onClick={() => navigate('/login', { state: { recovery: true } })}
          >
            <IconRestore size={15} /> {t('welcome.recovery')}
          </button>
          <p className="muted welcome-recovery-hint">{t('welcome.recoveryHint')}</p>
        </div>
      </div>
    </div>
  )
}
