import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { Alert } from '../components/ui.jsx'
import { useTranslation } from '../i18n.jsx'
import { LICENSE_LABELS } from '../utils.js'

const LICENSE_OPTIONS = ['B', 'C', 'E', 'SPECIAL']

export default function Register() {
  const { register } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    // Роль: USER — клиент, OWNER — владелец техники (добавляет технику и
    // подтверждает брони). Роль ADMIN назначается только администратором.
    role: 'USER',
    drivingLicense: ''
  })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await register({
        ...form,
        phone: form.phone.trim() || null,
        drivingLicense: form.drivingLicense || null
      })
      navigate('/', { replace: true })
    } catch (err) {
      const fields = err.fieldErrors
        ? Object.entries(err.fieldErrors)
            .map(([field, message]) => `${field}: ${message}`)
            .join('; ')
        : ''
      setError(fields || err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container section narrow">
      <div className="card auth-card">
        <h1>{t('register.title')}</h1>
        <p className="muted">{t('register.subtitle')}</p>

        <Alert>{error}</Alert>

        <form onSubmit={submit} className="form">
          <div className="form-row">
            <label>
              {t('register.firstName')}
              <input required maxLength={50} value={form.firstName} onChange={update('firstName')} placeholder="Ерлан" />
            </label>
            <label>
              {t('register.lastName')}
              <input required maxLength={50} value={form.lastName} onChange={update('lastName')} placeholder="Сериков" />
            </label>
          </div>
          <label>
            Email
            <input type="email" required value={form.email} onChange={update('email')} placeholder="you@example.kz" />
          </label>
          <label>
            {t('login.password')}
            <input
              type="password"
              required
              minLength={6}
              maxLength={72}
              value={form.password}
              onChange={update('password')}
              placeholder="Минимум 6 символов"
            />
          </label>
          <label>
            {t('register.phone')} <span className="muted">(необязательно)</span>
            <input value={form.phone} onChange={update('phone')} placeholder="+7 700 000 0000" />
          </label>

          <label>
            {t('register.role')}
            <select value={form.role} onChange={update('role')}>
              <option value="USER">{t('register.roleUser')}</option>
              <option value="OWNER">{t('register.roleOwner')}</option>
            </select>
            <small className="muted">
              Владелец добавляет свою технику в каталог и подтверждает брони по ней.
            </small>
          </label>

          <label>
            {t('register.license')} <span className="muted">(необязательно)</span>
            <select value={form.drivingLicense} onChange={update('drivingLicense')}>
              <option value="">{t('register.licenseNone')}</option>
              {LICENSE_OPTIONS.map((code) => (
                <option key={code} value={code}>
                  {LICENSE_LABELS[code] || code}
                </option>
              ))}
            </select>
            <small className="muted">Нужна для аренды грузовой и спецтехники. Можно указать позже в профиле.</small>
          </label>

          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? '…' : t('register.submit')}
          </button>
        </form>

        <p className="auth-hint">
          {t('register.haveAccount')} <Link to="/login">{t('auth.login')}</Link>
        </p>
      </div>
    </div>
  )
}
