import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPatch, apiDownload } from '../api.js'
import { Alert, EmptyState, Pagination, Spinner, StatusBadge } from '../components/ui.jsx'
import { useTranslation } from '../i18n.jsx'
import { RESERVATION_STATUS_LABELS, dateLabel, money } from '../utils.js'

export default function MyReservations() {
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelReason, setCancelReason] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await apiGet('/api/v1/reservations/my', { page, size: 10, sortBy: 'createdAt', direction: 'desc' }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    load()
  }, [load])

  const cancel = async () => {
    if (!cancelTarget) return
    try {
      await apiPatch(`/api/v1/reservations/${cancelTarget.id}/cancel`, null, {
        reason: cancelReason.trim() || undefined
      })
      setMessage({ kind: 'success', text: `Бронь #${cancelTarget.id} отменена.` })
      setCancelTarget(null)
      setCancelReason('')
      load()
    } catch (err) {
      setMessage({ kind: 'error', text: err.message })
      setCancelTarget(null)
    }
  }

  // Скачивание подтверждения брони в PDF (с JWT-токеном).
  const downloadPdf = async (reservationId) => {
    try {
      await apiDownload(`/api/v1/reservations/${reservationId}/pdf`, `reservation-${reservationId}.pdf`)
    } catch (err) {
      setMessage({ kind: 'error', text: err.message })
    }
  }

  return (
    <div className="container section">
      <h1>{t('myReservations.title')}</h1>
      <p className="muted">Здесь видны только ваши бронирования.</p>

      <Alert kind={message?.kind}>{message?.text}</Alert>
      <Alert>{error}</Alert>
      {loading && <Spinner label={t('common.loading')} />}

      {!loading && data && data.content.length === 0 && (
        <EmptyState
          icon="🗓"
          title={t('myReservations.empty')}
          hint={t('myReservations.emptyText')}
          action={
            <Link className="btn btn-primary" to="/">
              {t('notFound.back')}
            </Link>
          }
        />
      )}

      {!loading && data && data.content.length > 0 && (
        <>
          <div className="reservations">
            {data.content.map((reservation) => {
              // Активными считаются ожидающие, подтверждённые и активные брони.
              const active = ['PENDING', 'CONFIRMED', 'ACTIVE'].includes(reservation.status)
              // Отменить можно только до старта аренды (или если она ещё не началась).
              const canCancel = ['PENDING', 'CONFIRMED'].includes(reservation.status)
              return (
                <article key={reservation.id} className="card reservation">
                  <div className="reservation-head">
                    <h3>
                      <Link to={`/cars/${reservation.carId}`}>
                        {reservation.carBrand} {reservation.carModel}
                      </Link>
                    </h3>
                    <StatusBadge value={reservation.status} labels={RESERVATION_STATUS_LABELS} />
                  </div>
                  <div className="reservation-meta">
                    <span>🆔 №{reservation.id}</span>
                    <span>📍 {reservation.city}</span>
                    <span>🪪 {reservation.carLicensePlate}</span>
                  </div>
                  <div className="reservation-dates">
                    <span>
                      {dateLabel(reservation.startDate)} → {dateLabel(reservation.endDate)} ·{' '}
                      {reservation.hours ? `${reservation.hours} ч` : `${reservation.daysCount} дн.`}
                      {reservation.withOperator ? ' · с оператором' : ''}
                    </span>
                    <b>{money(reservation.totalPrice)}</b>
                  </div>
                  {reservation.discountPercent > 0 && (
                    <p className="reservation-discount">
                      🎉 Применена скидка {reservation.discountPercent}% за длительную аренду.
                    </p>
                  )}
                  {reservation.cancellationReason && (
                    <p className="reservation-reason">Причина отмены: {reservation.cancellationReason}</p>
                  )}
                  <div className="reservation-actions">
                    {active && (
                      <button className="btn btn-ghost btn-sm" onClick={() => downloadPdf(reservation.id)}>
                        📄 {t('myReservations.pdf')}
                      </button>
                    )}
                    {canCancel && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => {
                          setCancelTarget(reservation)
                          setCancelReason('')
                        }}
                      >
                        {t('myReservations.cancel')}
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} totalElements={data.totalElements} onChange={setPage} />
        </>
      )}

      {cancelTarget && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setCancelTarget(null)}>
          <div className="modal">
            <div className="modal-head">
              <h3>
                {t('myReservations.cancel')} #{cancelTarget.id}?
              </h3>
              <button className="modal-close" onClick={() => setCancelTarget(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <label>
                Причина отмены <span className="muted">(необязательно)</span>
                <input
                  maxLength={255}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Планы изменились"
                />
              </label>
              <div className="modal-actions">
                <button className="btn btn-ghost" onClick={() => setCancelTarget(null)}>
                  {t('common.close')}
                </button>
                <button className="btn btn-danger" onClick={cancel}>
                  {t('myReservations.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
