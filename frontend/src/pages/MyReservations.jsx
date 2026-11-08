import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPatch, apiDownload, apiUploadForm } from '../api.js'
import { Alert, EmptyState, Pagination, Spinner, StatusBadge } from '../components/ui.jsx'
import { googleRoute } from '../components/VehicleMap.jsx'
import { useTranslation } from '../i18n.jsx'
import {
  IconCalendar,
  IconCheck,
  IconClose,
  IconDoc,
  IconLicense,
  IconLock,
  IconPin,
  IconRestore,
  IconRoutes
} from '../components/icons.jsx'
import { RESERVATION_STATUS_LABELS, dateLabel, money } from '../utils.js'

// Подписи уровней топлива в акте приёма-передачи (шаг 8).
const FUEL_LEVEL_LABELS = {
  FULL: 'Полный',
  THREE_QUARTERS: '3/4',
  HALF: '1/2',
  QUARTER: '1/4',
  EMPTY: 'Пустой'
}

const emptyHandoverForm = () => ({ fuelLevel: 'FULL', mileage: '', damagesNote: '', files: [] })

export default function MyReservations() {
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  // Шаг 8: акты приёма-передачи по броням со страницы: {reservationId: [reports]}.
  const [reports, setReports] = useState({})
  // Шаг 8: открытая форма акта — {reservation, type: PICKUP | RETURN}.
  const [handoverTarget, setHandoverTarget] = useState(null)
  const [handoverForm, setHandoverForm] = useState(emptyHandoverForm)
  const [handoverSaving, setHandoverSaving] = useState(false)

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

  // Акты приёма-передачи грузим отдельно: по одному запросу на бронь со страницы.
  const loadReports = useCallback(async (reservations) => {
    if (!reservations?.length) return
    const entries = await Promise.all(
      reservations.map((reservation) =>
        apiGet(`/api/v1/reservations/${reservation.id}/handover`)
          .then((list) => [reservation.id, list])
          .catch(() => [reservation.id, []])
      )
    )
    setReports(Object.fromEntries(entries))
  }, [])

  useEffect(() => {
    if (data?.content?.length) loadReports(data.content)
  }, [data, loadReports])

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

  // Отправка акта приёма-передачи: поля формы + несколько фото в одном multipart-запросе.
  const submitHandover = async () => {
    if (!handoverTarget) return
    const formData = new FormData()
    formData.append('type', handoverTarget.type)
    formData.append('fuelLevel', handoverForm.fuelLevel)
    if (handoverForm.mileage !== '') formData.append('mileage', handoverForm.mileage)
    if (handoverForm.damagesNote.trim()) formData.append('damagesNote', handoverForm.damagesNote.trim())
    handoverForm.files.forEach((file) => formData.append('files', file))

    setHandoverSaving(true)
    try {
      await apiUploadForm(`/api/v1/reservations/${handoverTarget.reservation.id}/handover`, formData)
      const label = handoverTarget.type === 'PICKUP' ? 'выдачи' : 'возврата'
      setMessage({ kind: 'success', text: `Акт ${label} сохранён.` })
      setHandoverTarget(null)
      setHandoverForm(emptyHandoverForm())
      loadReports(data.content)
    } catch (err) {
      setMessage({ kind: 'error', text: err.message })
    } finally {
      setHandoverSaving(false)
    }
  }

  const openHandover = (reservation, type) => {
    setHandoverTarget({ reservation, type })
    setHandoverForm(emptyHandoverForm())
  }

  const hasReport = (reservationId, type) =>
    (reports[reservationId] || []).some((report) => report.type === type)

  return (
    <div className="container section">
      <h1>{t('myReservations.title')}</h1>
      <p className="muted">Здесь видны только ваши бронирования.</p>

      <Alert kind={message?.kind}>{message?.text}</Alert>
      <Alert>{error}</Alert>
      {loading && <Spinner label={t('common.loading')} />}

      {!loading && data && data.content.length === 0 && (
        <EmptyState
          icon={<IconCalendar size={44} />}
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
              const reservationReports = reports[reservation.id] || []
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
                    <span>#{reservation.id}</span>
                    <span>
                      <IconPin size={14} /> {reservation.city}
                    </span>
                    <span>
                      <IconLicense size={14} /> {reservation.carLicensePlate}
                    </span>
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
                      <IconCheck size={15} /> Применена скидка {reservation.discountPercent}% за длительную аренду.
                    </p>
                  )}

                  {/* Шаг 8: код от ключа — после подтверждения; до подтверждения — заглушка. */}
                  {reservation.status === 'PENDING' && (
                    <p className="key-code-pending">
                      <IconLock size={14} /> Код появится после подтверждения
                    </p>
                  )}
                  {['CONFIRMED', 'ACTIVE'].includes(reservation.status) && reservation.keyCode && (
                    <div className="key-code-card">
                      <div className="key-code-value">
                        Ваш код от ключа: <b>{reservation.keyCode}</b>
                      </div>
                      {reservation.pickupAddress && (
                        <div className="key-code-address">
                          <IconPin size={14} /> {reservation.pickupAddress}
                        </div>
                      )}
                      {reservation.pickupInstructions && (
                        <p className="key-code-hint">
                          <IconDoc size={14} /> {reservation.pickupInstructions}
                        </p>
                      )}
                      {reservation.latitude != null && reservation.longitude != null && (
                        <a
                          className="btn btn-ghost btn-sm"
                          href={googleRoute(reservation.latitude, reservation.longitude)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <IconRoutes size={15} /> Открыть на карте
                        </a>
                      )}
                    </div>
                  )}

                  {/* Шаг 8: оба акта приёма-передачи рядом — состояние до и после аренды. */}
                  {['CONFIRMED', 'ACTIVE', 'COMPLETED'].includes(reservation.status) && (
                    <div className="handover">
                      <h4>Акт приёма-передачи</h4>
                      <div className="handover-reports">
                        {['PICKUP', 'RETURN'].map((type) => {
                          const report = reservationReports.find((item) => item.type === type)
                          return (
                            <div key={type} className="handover-report">
                              <div className="handover-report-title">
                                {type === 'PICKUP' ? (
                                  <>
                                    <IconDoc size={15} /> Акт выдачи
                                  </>
                                ) : (
                                  <>
                                    <IconRestore size={15} /> Акт возврата
                                  </>
                                )}
                              </div>
                              {report ? (
                                <>
                                  <ul className="handover-report-fields">
                                    <li>Топливо: {FUEL_LEVEL_LABELS[report.fuelLevel] || '—'}</li>
                                    <li>Пробег: {report.mileage != null ? `${report.mileage} км` : '—'}</li>
                                    <li>Повреждения: {report.damagesNote || 'нет'}</li>
                                  </ul>
                                  {report.photos?.length > 0 && (
                                    <div className="handover-photos">
                                      {report.photos.map((src) => (
                                        <img key={src} src={src} alt="" loading="lazy" />
                                      ))}
                                    </div>
                                  )}
                                  <div className="muted handover-report-date">
                                    {new Date(report.createdAt).toLocaleString('ru-RU')}
                                  </div>
                                </>
                              ) : (
                                <p className="muted">Составлен не был.</p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      <div className="reservation-actions">
                        {['CONFIRMED', 'ACTIVE'].includes(reservation.status) &&
                          !hasReport(reservation.id, 'PICKUP') && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => openHandover(reservation, 'PICKUP')}
                            >
                              <IconCheck size={15} /> Принять технику
                            </button>
                          )}
                        {['ACTIVE', 'COMPLETED'].includes(reservation.status) &&
                          !hasReport(reservation.id, 'RETURN') && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => openHandover(reservation, 'RETURN')}
                            >
                              <IconRestore size={15} /> Вернуть технику
                            </button>
                          )}
                      </div>
                    </div>
                  )}

                  {reservation.cancellationReason && (
                    <p className="reservation-reason">Причина отмены: {reservation.cancellationReason}</p>
                  )}
                  <div className="reservation-actions">
                    {active && (
                      <button className="btn btn-ghost btn-sm" onClick={() => downloadPdf(reservation.id)}>
                        <IconDoc size={15} /> {t('myReservations.pdf')}
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
                <IconClose size={18} />
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

      {/* Шаг 8: форма акта приёма-передачи (принять / вернуть технику). */}
      {handoverTarget && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => e.target === e.currentTarget && setHandoverTarget(null)}
        >
          <div className="modal">
            <div className="modal-head">
              <h3>
                {handoverTarget.type === 'PICKUP' ? 'Принять технику' : 'Вернуть технику'} #
                {handoverTarget.reservation.id}
              </h3>
              <button className="modal-close" onClick={() => setHandoverTarget(null)}>
                <IconClose size={18} />
              </button>
            </div>
            <div className="modal-body">
              <label>
                Уровень топлива
                <select
                  value={handoverForm.fuelLevel}
                  onChange={(e) => setHandoverForm((form) => ({ ...form, fuelLevel: e.target.value }))}
                >
                  {Object.entries(FUEL_LEVEL_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Пробег, км
                <input
                  type="number"
                  min="0"
                  value={handoverForm.mileage}
                  onChange={(e) => setHandoverForm((form) => ({ ...form, mileage: e.target.value }))}
                  placeholder="12500"
                />
              </label>
              <label>
                Заметки о повреждениях <span className="muted">(необязательно)</span>
                <textarea
                  rows="3"
                  maxLength={1000}
                  value={handoverForm.damagesNote}
                  onChange={(e) => setHandoverForm((form) => ({ ...form, damagesNote: e.target.value }))}
                  placeholder="Царапина на заднем бампере"
                />
              </label>
              <label>
                Фотографии <span className="muted">(до 10, необязательно)</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) =>
                    setHandoverForm((form) => ({ ...form, files: Array.from(e.target.files || []) }))
                  }
                />
              </label>
              <div className="modal-actions">
                <button className="btn btn-ghost" onClick={() => setHandoverTarget(null)}>
                  {t('common.close')}
                </button>
                <button className="btn btn-primary" disabled={handoverSaving} onClick={submitHandover}>
                  {handoverSaving ? 'Сохранение…' : 'Сохранить акт'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
