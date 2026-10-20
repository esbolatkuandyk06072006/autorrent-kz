import { useState } from 'react'
import { apiPut } from '../api.js'
import { useAuth } from '../AuthContext.jsx'
import { Alert } from '../components/ui.jsx'

export default function Profile() {
  const { user, refreshUser } = useAuth()
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || ''
  })
  const [message, setMessage] = useState(null)
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setMessage(null)
    setSaving(true)
    try {
      await apiPut('/api/v1/users/me', { ...form, phone: form.phone.trim() || null })
      await refreshUser()
      setMessage({ kind: 'success', text: 'Профиль сохранён.' })
    } catch (err) {
      setMessage({ kind: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container section narrow">
      <div className="card">
        <h1>Профиль</h1>
        <p className="muted">
          {user?.email} · роль: {user?.role === 'ADMIN' ? 'администратор' : 'пользователь'}
        </p>

        <Alert kind={message?.kind}>{message?.text}</Alert>

        <form onSubmit={submit} className="form">
          <div className="form-row">
            <label>
              Имя
              <input required maxLength={50} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </label>
            <label>
              Фамилия
              <input required maxLength={50} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </label>
          </div>
          <label>
            Телефон
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+7 700 000 0000" />
          </label>
          <button className="btn btn-primary" disabled={saving}>
            {saving ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </form>
      </div>
    </div>
  )
}
