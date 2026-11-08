import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiUploadSingle } from '../api.js'
import { Alert, Spinner } from '../components/ui.jsx'
import { useTranslation } from '../i18n.jsx'
import { clearSignup, getSignup } from '../signup.js'
import { useAuth } from '../AuthContext.jsx'
import {
  BrandMark,
  IconArrowRight,
  IconCamera,
  IconCheck,
  IconLock,
  IconShield
} from '../components/icons.jsx'

/**
 * KYC-экран (шаг 3 каршеринг-флоу): «Загрузите документы» в безопасной зоне.
 *
 * Слоты: ID-карта/паспорт — Спереди, Сзади, Селфи с документом;
 * водительские права — Спереди, Сзади. Каждый слот: «Сделать фото или загрузить».
 * Файлы уходят на POST /api/v1/auth/signup/documents с signup-токеном,
 * финальная кнопка создаёт аккаунт (POST /auth/signup) и входит в приложение.
 */
const SLOTS = [
  { key: 'ID_FRONT', section: 'id', icon: 'front' },
  { key: 'ID_BACK', section: 'id', icon: 'back' },
  { key: 'ID_SELFIE', section: 'id', icon: 'selfie' },
  { key: 'LICENSE_FRONT', section: 'license', icon: 'front' },
  { key: 'LICENSE_BACK', section: 'license', icon: 'back' }
]

export default function Kyc() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { applyAuth } = useAuth()
  const signup = getSignup()

  const [files, setFiles] = useState({}) // slot → {fileName, previewUrl}
  const [busySlot, setBusySlot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef(null)
  const activeSlotRef = useRef(null)

  const requiredSlots = useMemo(() => SLOTS.map((s) => s.key), [])
  const uploadedCount = requiredSlots.filter((k) => files[k]).length
  const allUploaded = uploadedCount === requiredSlots.length

  // Нет signup-сессии — назад на вход.
  useEffect(() => {
    if (!signup?.signupToken) navigate('/login', { replace: true })
  }, [signup, navigate])

  // Восстановление уже загруженных документов после F5.
  useEffect(() => {
    if (!signup?.signupToken) return undefined
    let cancelled = false
    const restore = async () => {
      try {
        const list = await apiUploadSingle(
          '/api/v1/auth/signup/documents',
          null,
          { token: signup.signupToken, method: 'GET' }
        )
        if (!cancelled && Array.isArray(list)) {
          setFiles((prev) => {
            const next = { ...prev }
            list.forEach((doc) => {
              if (!next[doc.slot]) next[doc.slot] = { fileName: doc.fileName, previewUrl: null }
            })
            return next
          })
        }
      } catch {
        /* список не критичен — просто не восстанавливаем */
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    restore()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!signup?.signupToken) return null

  const openPicker = (slot) => {
    activeSlotRef.current = slot
    inputRef.current?.click()
  }

  const onFileChosen = async (e) => {
    const file = e.target.files?.[0]
    const slot = activeSlotRef.current
    e.target.value = ''
    if (!file || !slot) return

    setError(null)
    setBusySlot(slot)
    try {
      const formData = new FormData()
      formData.append('slot', slot)
      formData.append('file', file)
      const saved = await apiUploadSingle('/api/v1/auth/signup/documents', formData, {
        token: signup.signupToken
      })
      setFiles((prev) => ({
        ...prev,
        [slot]: {
          fileName: saved.fileName || file.name,
          previewUrl: URL.createObjectURL(file)
        }
      }))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusySlot(null)
    }
  }

  const finish = async () => {
    setError(null)
    setSubmitting(true)
    try {
      const data = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${signup.signupToken}`
        },
        body: JSON.stringify({
          firstName: signup.firstName,
          lastName: signup.lastName,
          agreedTerms: signup.agreedTerms === true,
          agreedData: signup.agreedData === true
        })
      }).then(async (res) => {
        const body = await res.json().catch(() => null)
        if (!res.ok) throw new Error(body?.message || `Ошибка HTTP ${res.status}`)
        return body
      })
      clearSignup()
      applyAuth(data)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  const renderSlot = (slot) => {
    const state = files[slot.key]
    const busy = busySlot === slot.key
    return (
      <div key={slot.key} className={`kyc-slot ${state ? 'kyc-slot-done' : ''}`}>
        <div className="kyc-slot-head">
          <span className="kyc-slot-name">{t(`kyc.slot.${slot.key}`)}</span>
          {state && (
            <span className="kyc-slot-ok">
              <IconCheck size={13} /> {t('kyc.uploaded')}
            </span>
          )}
        </div>
        <button
          type="button"
          className="kyc-slot-body"
          onClick={() => openPicker(slot.key)}
          disabled={busy}
        >
          {state?.previewUrl ? (
            <img src={state.previewUrl} alt={t(`kyc.slot.${slot.key}`)} className="kyc-preview" />
          ) : (
            <>
              <span className="kyc-slot-icon">
                <IconCamera size={26} />
              </span>
              <span className="kyc-slot-cta">
                {busy ? '…' : state ? t('kyc.replace') : t('kyc.takePhoto')}
              </span>
              {state && <span className="kyc-slot-file">{state.fileName}</span>}
            </>
          )}
          {busy && <span className="kyc-slot-busy" />}
        </button>
      </div>
    )
  }

  return (
    <div className="onboarding">
      <div className="onboarding-card card glass kyc-card">
        <div className="onboarding-brand">
          <BrandMark size={36} />
          <span className="brand-text">
            AutoRent <b>KZ</b>
          </span>
        </div>

        <div className="kyc-shield">
          <IconShield size={44} />
        </div>
        <h1>{t('kyc.title')}</h1>
        <p className="muted kyc-sub">{t('kyc.subtitle')}</p>

        {/* Безопасная зона хранения: документы шифруются и не публикуются. */}
        <div className="kyc-secure-note">
          <IconLock size={14} /> {t('kyc.secureZone')}
        </div>

        <Alert>{error}</Alert>

        {loading ? (
          <Spinner label={t('common.loading')} />
        ) : (
          <>
            <section className="kyc-section">
              <h2>{t('kyc.sectionId')}</h2>
              <p className="muted kyc-section-hint">{t('kyc.sectionIdHint')}</p>
              <div className="kyc-slots">
                {SLOTS.filter((s) => s.section === 'id').map(renderSlot)}
              </div>
            </section>

            <section className="kyc-section">
              <h2>{t('kyc.sectionLicense')}</h2>
              <p className="muted kyc-section-hint">{t('kyc.sectionLicenseHint')}</p>
              <div className="kyc-slots">
                {SLOTS.filter((s) => s.section === 'license').map(renderSlot)}
              </div>
            </section>

            {/* Прогресс и финальное создание аккаунта. */}
            <div className="kyc-progress">
              <div className="kyc-progress-bar">
                <span style={{ width: `${(uploadedCount / requiredSlots.length) * 100}%` }} />
              </div>
              <span className="muted">
                {t('kyc.progress', { done: uploadedCount, total: requiredSlots.length })}
              </span>
            </div>

            <button
              className="btn btn-primary btn-block"
              onClick={finish}
              disabled={!allUploaded || submitting}
            >
              {submitting ? '…' : <>{t('kyc.finish')} <IconArrowRight size={16} /></>}
            </button>
            {!allUploaded && (
              <p className="muted kyc-hint">{t('kyc.finishHint')}</p>
            )}
          </>
        )}

        {/* Скрытый input: «Сделать фото или загрузить» — камера на телефоне, файл на десктопе. */}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={onFileChosen}
          hidden
        />
      </div>
    </div>
  )
}
