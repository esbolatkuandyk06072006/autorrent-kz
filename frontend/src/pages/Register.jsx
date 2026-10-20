import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { Alert } from '../components/ui.jsx'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: ''
  })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await register({ ...form, phone: form.phone.trim() || null })
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
        <h1>Регистрация</h1>
        <p className="muted">Создайте аккаунт — и сможете бронировать автомобили.</p>

        <Alert>{error}</Alert>

        <form onSubmit={submit} className="form">
          <div className="form-row">
            <label>
              Имя
              <input required maxLength={50} value={form.firstName} onChange={update('firstName')} placeholder="Ерлан" />
            </label>
            <label>
              Фамилия
              <input required maxLength={50} value={form.lastName} onChange={update('lastName')} placeholder="Сериков" />
            </label>
          </div>
          <label>
            Email
            <input type="email" required value={form.email} onChange={update('email')} placeholder="you@example.kz" />
          </label>
          <label>
            Пароль
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
            Телефон <span className="muted">(необязательно)</span>
            <input value={form.phone} onChange={update('phone')} placeholder="+7 700 000 0000" />
          </label>
          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Создаём аккаунт…' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="auth-hint">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </div>
    </div>
  )
}
