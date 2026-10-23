import { useState } from 'react'
import { apiPut } from '../api.js'
import { useAuth } from '../AuthContext.jsx'
import { Alert } from '../components/ui.jsx'
import { LICENSE_LABELS } from '../utils.js'

// Категории водительского удостоверения: B — легковые, C/E — грузовые,
// SPECIAL — спецудостоверение. Проверяются при бронировании.
const LICENSE_OPTIONS = ['B', 'C', 'E', 'SPECIAL']

const ROLE_LABELS = {
  USER: 'клиент',
  OWNER: 'владелец техники',
  ADMIN: 'администратор'
}

export default function Profile() {
  const { user, refreshUser } = useAuth()
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    drivingLicense: user?.drivingLicense || ''
  })
  const [message, setMessage] = useState(null)
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setMessage(null)
    setSaving(true)
    try {
      await apiPut('/api/v1/users/me', {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone.trim() || null,
        drivingLicense: form.drivingLicense || null
      })
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
          {user?.email} · роль: {ROLE_LABELS[user?.role] || user?.role}
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
          <label>
            Категория водительского удостоверения
            <select
              value={form.drivingLicense}
              onChange={(e) => setForm({ ...form, drivingLicense: e.target.value })}
            >
              <option value="">— не указана —</option>
              {LICENSE_OPTIONS.map((code) => (
                <option key={code} value={code}>
                  {LICENSE_LABELS[code] || code}
                </option>
              ))}
            </select>
            <small className="muted">
              Нужна для аренды грузовой и спецтехники: права категории C допускают грузовые, E — тяжёлые, SPECIAL — спецтехнику.
            </small>
          </label>
          <button className="btn btn-primary" disabled={saving}>
            {saving ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </form>
      </div>
    </div>
  )
}
