import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { Alert } from '../components/ui.jsx'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(form.email.trim(), form.password)
      navigate(location.state?.from || '/', { replace: true })
    } catch (err) {
      setError(err.status === 401 ? 'Неверный email или пароль' : err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container section narrow">
      <div className="card auth-card">
        <h1>Вход в аккаунт</h1>
        <p className="muted">Введите email и пароль, чтобы бронировать автомобили.</p>

        <Alert>{error}</Alert>

        <form onSubmit={submit} className="form">
          <label>
            Email
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="user@autorrent.kz"
            />
          </label>
          <label>
            Пароль
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />
          </label>
          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Входим…' : 'Войти'}
          </button>
        </form>

        <div className="auth-hint">
          <p>
            Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
          </p>
          <div className="demo-creds">
            <b>Демо-доступ:</b>
            <code>user@autorrent.kz / User123!</code>
            <code>admin@autorrent.kz / Admin123!</code>
          </div>
        </div>
      </div>
    </div>
  )
}
