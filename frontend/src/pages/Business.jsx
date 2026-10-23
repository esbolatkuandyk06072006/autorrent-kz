import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiGet, apiPost, apiDownload } from '../api.js'
import { useAuth } from '../AuthContext.jsx'
import { Alert, Spinner } from '../components/ui.jsx'
import { useTranslation } from '../i18n.jsx'
import { money, dateLabel, today, addDays } from '../utils.js'

/**
 * Режим «Для бизнеса»: заявка на несколько единиц техники для юрлица.
 * Указываются название компании и БИН (12 цифр); каждая позиция — техника
 * на даты или часы. После создания доступен счёт в PDF.
 */
export default function Business() {
  const { user, isAuth } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [catalog, setCatalog] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  const [form, setForm] = useState({
    companyName: '',
    bin: '',
    items: [{ carId: '', startDate: addDays(today(), 1), endDate: addDays(today(), 4), hours: 4, mode: 'DAY' }]
  })

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true)
    try {
      const data = await apiGet('/api/v1/vehicles', { size: 100, sortBy: 'brand', direction: 'asc' })
      setCatalog(data?.content || [])
    } catch {
      setCatalog([])
    } finally {
      setCatalogLoading(false)
    }
  }, [])

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true)
    try {
      const data = await apiGet('/api/v1/business/orders/my')
      setOrders(Array.isArray(data) ? data : [])
    } catch {
      setOrders([])
    } finally {
      setOrdersLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAuth) {
      navigate('/login', { state: { from: '/business' } })
      return
    }
    loadCatalog()
    loadOrders()
  }, [isAuth, navigate, loadCatalog, loadOrders])

  const addItem = () => {
    if (form.items.length >= 10) return
    setForm({
      ...form,
      items: [...form.items, { carId: '', startDate: addDays(today(), 1), endDate: addDays(today(), 4), hours: 4, mode: 'DAY' }]
    })
  }

  const removeItem = (index) => {
    if (form.items.length === 1) return
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) })
  }

  // Скачивание счёта в PDF (с JWT-токеном).
  const downloadInvoice = async (orderId) => {
    try {
      await apiDownload(`/api/v1/business/orders/${orderId}/pdf`, `invoice-${orderId}.pdf`)
    } catch (err) {
      setMsg({ kind: 'error', text: err.message })
    }
  }

  const updateItem = (index, patch) => {
    const items = form.items.map((item, i) => (i === index ? { ...item, ...patch } : item))
    setForm({ ...form, items })
  }

  const submit = async (e) => {
    e.preventDefault()
    setMsg(null)

    if (!form.companyName.trim()) {
      setMsg({ kind: 'error', text: 'Укажите название компании.' })
      return
    }
    if (!/^\d{12}$/.test(form.bin.trim())) {
      setMsg({ kind: 'error', text: 'БИН должен содержать ровно 12 цифр.' })
      return
    }

    const items = form.items.map((item) => {
      const base = { carId: Number(item.carId), startDate: item.startDate }
      if (item.mode === 'HOUR') {
        return { ...base, hours: Number(item.hours) }
      }
      return { ...base, endDate: item.endDate }
    })

    if (items.some((item) => !item.carId || !item.startDate)) {
      setMsg({ kind: 'error', text: 'Выберите технику и даты для каждой позиции.' })
      return
    }

    setBusy(true)
    try {
      const created = await apiPost('/api/v1/business/orders', {
        companyName: form.companyName.trim(),
        bin: form.bin.trim(),
        items
      })
      setMsg({ kind: 'success', text: `Заявка #${created.id} создана! Сумма: ${money(created.totalPrice)}. Счёт можно скачать в PDF.` })
      setForm({
        companyName: form.companyName,
        bin: form.bin,
        items: [{ carId: '', startDate: addDays(today(), 1), endDate: addDays(today(), 4), hours: 4, mode: 'DAY' }]
      })
      loadOrders()
    } catch (err) {
      if (err.status === 401) {
        navigate('/login', { state: { from: '/business' } })
        return
      }
      setMsg({ kind: 'error', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  if (!isAuth) return null
  if (catalogLoading || ordersLoading) return <Spinner label={t('common.loading')} />

  return (
    <div className="container section">
      <h1>{t('business.title')}</h1>
      <p className="muted">{t('business.subtitle')}</p>

      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}

      <div className="business-grid">
        <section className="card">
          <h2>{t('business.newOrder')}</h2>
          <form onSubmit={submit} className="form">
            <label>
              {t('business.company')}
              <input
                type="text"
                required
                maxLength={200}
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                placeholder="ТОО «Пример»"
              />
            </label>
            <label>
              {t('business.bin')}
              <input
                type="text"
                required
                pattern="\d{12}"
                maxLength={12}
                value={form.bin}
                onChange={(e) => setForm({ ...form, bin: e.target.value.replace(/\D/g, '') })}
                placeholder="123456789012"
              />
            </label>

            <h3>{t('business.items')}</h3>
            {form.items.map((item, index) => (
              <div key={index} className="business-item">
                <div className="business-item-head">
                  <b>#{index + 1}</b>
                  {form.items.length > 1 && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeItem(index)}>
                      {t('business.removeItem')}
                    </button>
                  )}
                </div>
                <label>
                  {t('business.vehicle')}
                  <select
                    required
                    value={item.carId}
                    onChange={(e) => {
                      const carId = e.target.value
                      const car = catalog.find((c) => String(c.id) === carId)
                      updateItem(index, {
                        carId,
                        mode: car?.pricePerHour ? item.mode : 'DAY'
                      })
                    }}
                  >
                    <option value="">{t('business.pickVehicle')}</option>
                    {catalog.map((car) => (
                      <option key={car.id} value={car.id}>
                        {car.brand} {car.model} · {car.city} · {money(car.pricePerDay)}/сут
                        {car.pricePerHour ? ` · ${money(car.pricePerHour)}/час` : ''}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Переключатель режима — только если у выбранной техники есть почасовая цена. */}
                {catalog.find((c) => String(c.id) === String(item.carId))?.pricePerHour && (
                  <div className="rental-mode">
                    <button
                      type="button"
                      className={`btn btn-sm ${item.mode === 'DAY' ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => updateItem(index, { mode: 'DAY' })}
                    >
                      По суткам
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${item.mode === 'HOUR' ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => updateItem(index, { mode: 'HOUR' })}
                    >
                      По часам
                    </button>
                  </div>
                )}

                {item.mode === 'HOUR' ? (
                  <label>
                    Часы
                    <select value={item.hours} onChange={(e) => updateItem(index, { hours: Number(e.target.value) })}>
                      {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => (
                        <option key={h} value={h}>
                          {h} ч
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <div className="business-dates">
                    <label>
                      {t('home.startDate')}
                      <input
                        type="date"
                        required
                        min={today()}
                        value={item.startDate}
                        onChange={(e) => updateItem(index, { startDate: e.target.value })}
                      />
                    </label>
                    <label>
                      {t('home.endDate')}
                      <input
                        type="date"
                        required
                        min={item.startDate || today()}
                        value={item.endDate}
                        onChange={(e) => updateItem(index, { endDate: e.target.value })}
                      />
                    </label>
                  </div>
                )}
              </div>
            ))}

            <button type="button" className="btn btn-ghost" onClick={addItem} disabled={form.items.length >= 10}>
              + {t('business.addItem')}
            </button>

            <button className="btn btn-primary btn-block" disabled={busy}>
              {busy ? '…' : t('business.submit')}
            </button>
          </form>
        </section>

        <section className="card">
          <h2>{t('business.myOrders')}</h2>
          {orders.length === 0 ? (
            <p className="muted">{t('business.empty')}</p>
          ) : (
            <div className="orders-list">
              {orders.map((order) => (
                <article key={order.id} className="order-card">
                  <div className="order-head">
                    <b>Заявка #{order.id}</b>
                    <span className="badge badge-soft">{order.status === 'ACTIVE' ? t('status.ACTIVE') : t('status.COMPLETED')}</span>
                  </div>
                  <p>
                    {order.companyName} · БИН {order.bin}
                  </p>
                  <p className="muted">Создана: {dateLabel(order.createdAt)}</p>
                  <ul className="order-items">
                    {(order.items || []).map((item) => (
                      <li key={item.id}>
                        {item.carBrand} {item.carModel} · {dateLabel(item.startDate)} — {dateLabel(item.endDate)}
                        {item.hours ? ` · ${item.hours} ч` : ` · ${item.daysCount} дн.`} · {money(item.totalPrice)}
                      </li>
                    ))}
                  </ul>
                  <div className="order-total">
                    <span>Итого:</span>
                    <b>{money(order.totalPrice)}</b>
                  </div>
                  <div className="order-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => downloadInvoice(order.id)}>
                      📄 {t('business.invoice')}
                    </button>
                    <Link className="btn btn-ghost btn-sm" to="/my-reservations">
                      {t('nav.myReservations')}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
