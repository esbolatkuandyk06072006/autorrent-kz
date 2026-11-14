import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { apiPost, apiUpload } from '../api.js'
import { useAuth } from '../AuthContext.jsx'
import { useTranslation } from '../i18n.jsx'
import {
  CATEGORY_GROUPS,
  CATEGORY_LABELS,
  CITIES,
  FUEL_LABELS,
  TAG_LABELS,
  TRANSMISSION_LABELS,
  money
} from '../utils.js'
import {
  IconCamera,
  IconCatalog,
  IconCheck,
  IconClose,
  IconConstruction,
  IconMountains,
  IconPin,
  IconPlus,
  IconRoutes,
  IconTrash,
  IconUsers,
  IconWallet,
  IconWedding,
  IconWeight
} from './icons.jsx'

/* Иконки быстрых тегов умных подборок. */
const TAG_ICONS = {
  construction: IconConstruction,
  wedding: IconWedding,
  mountains: IconMountains,
  city: IconPin,
  longtrip: IconRoutes,
  family: IconUsers
}

/* Тип техники: карточка выбора + иконка. */
const TYPE_CARDS = [
  { value: 'PASSENGER', labelKey: 'wizard.typePassenger', Icon: IconCatalog },
  { value: 'CARGO', labelKey: 'wizard.typeCargo', Icon: IconWeight },
  { value: 'SPECIAL', labelKey: 'wizard.typeSpecial', Icon: IconConstruction }
]

/* Категория по умолчанию при смене типа техники. */
const DEFAULT_CATEGORY = {
  PASSENGER: 'COMFORT',
  CARGO: 'MEDIUM_TRUCK',
  SPECIAL: 'EXCAVATOR'
}

const STEPS = ['wizard.step1', 'wizard.step2', 'wizard.step3']

const EMPTY_FORM = {
  type: 'PASSENGER',
  category: 'COMFORT',
  brand: '',
  model: '',
  year: '2024',
  licensePlate: '',
  city: 'Almaty',
  transmission: 'AUTOMATIC',
  fuelType: 'PETROL',
  tags: [],
  pricePerDay: '',
  withOperator: false,
  operatorPricePerDay: '',
  noDeposit: false,
  deliveryAvailable: false,
  description: ''
}

const PHOTO_LIMIT = 12

/**
 * Мастер «Сдать технику в аренду»: 3 шага (основное → характеристики,
 * теги и фото → цена, калькулятор дохода и условия) в модальном окне
 * со стекломорфизмом. Для гостей и клиентов — приглашение войти или
 * зарегистрироваться владельцем вместо формы.
 */
export default function VehicleWizard({ open, canCreate, onClose }) {
  const { t } = useTranslation()
  const { isAuth } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [files, setFiles] = useState([]) // [{ file, url }] — превью до публикации
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const dialogRef = useRef(null)

  /* Открытие: чистое состояние мастера (превью-фото освобождаем). */
  useEffect(() => {
    if (!open) return undefined
    setFiles((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url))
      return []
    })
    setForm(EMPTY_FORM)
    setStep(0)
    setErrors({})
    setError(null)
    setBusy(false)
    const timer = setTimeout(() => dialogRef.current?.focus(), 120)
    return () => clearTimeout(timer)
  }, [open])

  /* Escape закрывает мастер; блокируем скролл страницы, пока он открыт. */
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.classList.add('wizard-open')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('wizard-open')
    }
  }, [open, busy, onClose])

  if (!open) return null

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => (prev[field] ? { ...prev, [field]: null } : prev))
  }

  const setType = (type) => {
    setForm((prev) => ({ ...prev, type, category: DEFAULT_CATEGORY[type] }))
  }

  const toggleTag = (tag) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((x) => x !== tag) : [...prev.tags, tag]
    }))
  }

  const validateStep = (index) => {
    const e = {}
    if (index === 0) {
      if (!form.brand.trim()) e.brand = t('wizard.errRequired')
      if (!form.model.trim()) e.model = t('wizard.errRequired')
      const year = Number(form.year)
      if (!form.year || !Number.isInteger(year) || year < 1990 || year > 2100) {
        e.year = t('wizard.errYear')
      }
      if (form.licensePlate.trim().length < 4) e.licensePlate = t('wizard.errPlate')
      if (!form.city) e.city = t('wizard.errRequired')
    }
    if (index === 2) {
      const price = Number(form.pricePerDay)
      if (!form.pricePerDay || Number.isNaN(price) || price <= 0) e.pricePerDay = t('wizard.errPrice')
      if (form.withOperator && form.operatorPricePerDay) {
        const op = Number(form.operatorPricePerDay)
        if (Number.isNaN(op) || op <= 0) e.operatorPricePerDay = t('wizard.errPrice')
      }
    }
    return e
  }

  const next = () => {
    const e = validateStep(step)
    if (Object.values(e).some(Boolean)) {
      setErrors(e)
      return
    }
    setErrors({})
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const back = () => {
    setErrors({})
    setStep((s) => Math.max(s - 1, 0))
  }

  /* --- Фотографии: превью через object-URL, лимит 12 --- */
  const onPickPhotos = (e) => {
    const picked = Array.from(e.target.files || [])
    e.target.value = ''
    if (!picked.length) return
    setFiles((prev) => {
      const room = PHOTO_LIMIT - prev.length
      const added = picked.slice(0, room).map((file) => ({ file, url: URL.createObjectURL(file) }))
      return [...prev, ...added]
    })
  }

  const removePhoto = (index) => {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].url)
      return prev.filter((_, i) => i !== index)
    })
  }

  const dropPreviews = () => {
    setFiles((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url))
      return []
    })
  }

  /* --- Публикация --- */
  const submit = async () => {
    const step0 = validateStep(0)
    const step2 = validateStep(2)
    const all = { ...step0, ...step2 }
    if (Object.values(all).some(Boolean)) {
      setErrors(all)
      setStep(Object.values(step0).some(Boolean) ? 0 : 2)
      return
    }

    setBusy(true)
    setError(null)
    const payload = {
      brand: form.brand.trim(),
      model: form.model.trim(),
      year: Number(form.year),
      licensePlate: form.licensePlate.trim().toUpperCase(),
      type: form.type,
      category: form.category,
      transmission: form.transmission,
      fuelType: form.fuelType,
      pricePerDay: Number(form.pricePerDay),
      city: form.city,
      withOperator: !!form.withOperator,
      operatorPricePerDay:
        form.withOperator && form.operatorPricePerDay ? Number(form.operatorPricePerDay) : null,
      noDeposit: !!form.noDeposit,
      deliveryAvailable: !!form.deliveryAvailable,
      description: form.description.trim() || null,
      images: [],
      imageUrl: null,
      tags: form.tags
    }

    try {
      const created = await apiPost('/api/v1/vehicles', payload)
      // Фото грузим следом: для реальных файлов нужен id техники.
      if (created?.id && files.length > 0) {
        await apiUpload(`/api/v1/vehicles/${created.id}/images`, files.map((f) => f.file))
      }
      dropPreviews()
      onClose()
      navigate(`/cars/${created.id}`)
    } catch (err) {
      if (err.fieldErrors) {
        const fieldErrors = {}
        for (const [field, message] of Object.entries(err.fieldErrors)) {
          fieldErrors[field] = message
        }
        setErrors(fieldErrors)
        setStep(0)
      }
      setError(err.fieldErrors ? t('wizard.fixErrors') : err.message)
    } finally {
      setBusy(false)
    }
  }

  /* --- Калькулятор дохода владельца (скидки: −10% от 7 дней, −20% от 30) --- */
  const price = Number(form.pricePerDay)
  const calc = price > 0
    ? {
        week: price * 7 * 0.9,
        weekSave: price * 7 * 0.1,
        long: price * 20 * 0.9,
        longSave: price * 20 * 0.1,
        month: price * 30 * 0.8,
        monthSave: price * 30 * 0.2
      }
    : null

  const stepErrorKeys = Object.values(errors).some(Boolean)

  return createPortal(
    <div
      className="wizard-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <div
        className="wizard"
        role="dialog"
        aria-modal="true"
        aria-label={t('wizard.title')}
        tabIndex={-1}
        ref={dialogRef}
      >
        <header className="wizard-head">
          <div className="wizard-title">
            <span className="wizard-title-icon" aria-hidden="true">
              <IconPlus />
            </span>
            <div>
              <h2>{t('wizard.title')}</h2>
              <p>{t('wizard.subtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            className="wizard-close"
            aria-label={t('wizard.close')}
            onClick={() => !busy && onClose()}
          >
            <IconClose />
          </button>
        </header>

        {!canCreate ? (
          /* --- Приглашение для гостей и клиентов --- */
          <div className="wizard-gate">
            <span className="wizard-gate-ring" aria-hidden="true">
              <IconPlus />
            </span>
            <h3>{isAuth ? t('wizard.userTitle') : t('wizard.guestTitle')}</h3>
            <p>{isAuth ? t('wizard.userText') : t('wizard.guestText')}</p>
            <div className="wizard-gate-actions">
              {!isAuth && (
                <Link className="btn btn-primary" to="/login" onClick={onClose}>
                  {t('wizard.login')}
                </Link>
              )}
              <Link className={isAuth ? 'btn btn-primary' : 'btn btn-ghost'} to="/register" onClick={onClose}>
                {t('wizard.registerOwner')}
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Шаги 1-2-3 */}
            <nav className="wizard-steps" aria-label={t('wizard.steps')}>
              {STEPS.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  className={`wizard-step${i === step ? ' is-current' : ''}${i < step ? ' is-done' : ''}`}
                  onClick={() => i < step && setStep(i)}
                  aria-current={i === step ? 'step' : undefined}
                >
                  <span className="wizard-step-dot">
                    {i < step ? <IconCheck /> : i + 1}
                  </span>
                  <span className="wizard-step-label">{t(label)}</span>
                </button>
              ))}
            </nav>

            {error && <div className="wizard-alert">{error}</div>}

            <div className="wizard-body">
              {step === 0 && (
                <div className="wizard-pane">
                  <div className="wizard-type-cards">
                    {TYPE_CARDS.map(({ value, labelKey, Icon }) => (
                      <button
                        key={value}
                        type="button"
                        className={`wizard-type-card${form.type === value ? ' is-active' : ''}`}
                        onClick={() => setType(value)}
                        aria-pressed={form.type === value}
                      >
                        <Icon />
                        <span>{t(labelKey)}</span>
                      </button>
                    ))}
                  </div>

                  <div className="wizard-grid">
                    <Field label={t('wizard.brand')} error={errors.brand}>
                      <input
                        value={form.brand}
                        onChange={(e) => set('brand', e.target.value)}
                        placeholder="Toyota"
                        maxLength={50}
                      />
                    </Field>
                    <Field label={t('wizard.model')} error={errors.model}>
                      <input
                        value={form.model}
                        onChange={(e) => set('model', e.target.value)}
                        placeholder="Camry"
                        maxLength={50}
                      />
                    </Field>
                    <Field label={t('wizard.year')} error={errors.year}>
                      <input
                        type="number"
                        min={1990}
                        max={2100}
                        value={form.year}
                        onChange={(e) => set('year', e.target.value)}
                      />
                    </Field>
                    <Field label={t('wizard.plate')} error={errors.licensePlate} hint={t('wizard.plateHint')}>
                      <input
                        value={form.licensePlate}
                        onChange={(e) => set('licensePlate', e.target.value.toUpperCase())}
                        placeholder="123ABC02"
                        maxLength={20}
                        className="wizard-plate"
                      />
                    </Field>
                    <Field label={t('wizard.city')} error={errors.city}>
                      <select value={form.city} onChange={(e) => set('city', e.target.value)}>
                        {CITIES.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="wizard-pane">
                  <div className="wizard-row-label">{t('wizard.transmission')}</div>
                  <Segmented
                    ariaLabel={t('wizard.transmission')}
                    value={form.transmission}
                    onChange={(v) => set('transmission', v)}
                    options={Object.entries(TRANSMISSION_LABELS).map(([value, label]) => ({ value, label }))}
                  />

                  <div className="wizard-row-label">{t('wizard.fuel')}</div>
                  <Segmented
                    ariaLabel={t('wizard.fuel')}
                    value={form.fuelType}
                    onChange={(v) => set('fuelType', v)}
                    options={Object.entries(FUEL_LABELS).map(([value, label]) => ({ value, label }))}
                  />

                  <Field label={t('wizard.class')}>
                    <select value={form.category} onChange={(e) => set('category', e.target.value)}>
                      {(CATEGORY_GROUPS[form.type] || []).map((value) => (
                        <option key={value} value={value}>
                          {CATEGORY_LABELS[value]}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <div className="wizard-row-label">{t('wizard.tags')}</div>
                  <div className="wizard-tags">
                    {Object.entries(TAG_LABELS).map(([key, label]) => {
                      const Icon = TAG_ICONS[key]
                      const active = form.tags.includes(key)
                      return (
                        <button
                          key={key}
                          type="button"
                          className={`chip-tag${active ? ' is-active' : ''}`}
                          aria-pressed={active}
                          onClick={() => toggleTag(key)}
                        >
                          {Icon && <Icon />}
                          {label}
                        </button>
                      )
                    })}
                  </div>

                  <div className="wizard-row-label">{t('wizard.photos')}</div>
                  <div className="wizard-photo-grid">
                    {files.map((p, i) => (
                      <figure className="wizard-photo" key={p.url}>
                        <img src={p.url} alt={`${t('wizard.photoAlt')} ${i + 1}`} />
                        {i === 0 && <figcaption>{t('wizard.mainPhoto')}</figcaption>}
                        <button
                          type="button"
                          className="wizard-photo-remove"
                          aria-label={t('wizard.removePhoto')}
                          onClick={() => removePhoto(i)}
                        >
                          <IconTrash />
                        </button>
                      </figure>
                    ))}
                    {files.length < PHOTO_LIMIT && (
                      <label className="wizard-photo-add">
                        <IconCamera />
                        <span>{t('wizard.addPhoto')}</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={onPickPhotos}
                          hidden
                        />
                      </label>
                    )}
                  </div>
                  <p className="wizard-hint">{t('wizard.photosHint')}</p>
                </div>
              )}

              {step === 2 && (
                <div className="wizard-pane">
                  <Field label={t('wizard.pricePerDay')} error={errors.pricePerDay}>
                    <div className="wizard-price-input">
                      <input
                        type="number"
                        min={100}
                        step={500}
                        value={form.pricePerDay}
                        onChange={(e) => set('pricePerDay', e.target.value)}
                        placeholder="25000"
                      />
                      <span aria-hidden="true">₸/сутки</span>
                    </div>
                  </Field>

                  {/* Калькулятор дохода владельца */}
                  <div className={`wizard-calc${calc ? ' is-live' : ''}`}>
                    <div className="wizard-calc-head">
                      <IconWallet />
                      <div>
                        <b>{t('wizard.calcTitle')}</b>
                        <small>{t('wizard.calcHint')}</small>
                      </div>
                    </div>
                    {calc ? (
                      <div className="wizard-calc-rows">
                        <div className="wizard-calc-row">
                          <span>{t('wizard.calcWeek')}</span>
                          <b>{money(calc.week)}</b>
                        </div>
                        <div className="wizard-calc-row">
                          <span>{t('wizard.calcLong')}</span>
                          <b>{money(calc.long)}</b>
                        </div>
                        <div className="wizard-calc-row wizard-calc-row-bonus">
                          <span>
                            {t('wizard.calcMonth')} <i>{t('wizard.calcBonus')}</i>
                          </span>
                          <b>{money(calc.month)}</b>
                        </div>
                        <p className="wizard-calc-note">
                          {t('wizard.calcSave', { save: money(calc.weekSave + calc.longSave) })}
                        </p>
                      </div>
                    ) : (
                      <div className="wizard-calc-empty">
                        <p>{t('wizard.calcEmpty')}</p>
                      </div>
                    )}
                  </div>

                  <div className="wizard-toggles">
                    <Toggle
                      checked={form.withOperator}
                      onChange={(v) => set('withOperator', v)}
                      label={t('wizard.withDriver')}
                      hint={t('wizard.withDriverHint')}
                    />
                    {form.withOperator && (
                      <Field label={t('wizard.operatorPrice')} error={errors.operatorPricePerDay}>
                        <div className="wizard-price-input">
                          <input
                            type="number"
                            min={0}
                            step={500}
                            value={form.operatorPricePerDay}
                            onChange={(e) => set('operatorPricePerDay', e.target.value)}
                            placeholder="5000"
                          />
                          <span aria-hidden="true">₸/сутки</span>
                        </div>
                      </Field>
                    )}
                    <Toggle
                      checked={form.noDeposit}
                      onChange={(v) => set('noDeposit', v)}
                      label={t('wizard.noDeposit')}
                      hint={t('wizard.noDepositHint')}
                    />
                    <Toggle
                      checked={form.deliveryAvailable}
                      onChange={(v) => set('deliveryAvailable', v)}
                      label={t('wizard.delivery')}
                      hint={t('wizard.deliveryHint')}
                    />
                  </div>

                  <Field label={t('wizard.description')}>
                    <textarea
                      rows={3}
                      maxLength={2000}
                      value={form.description}
                      onChange={(e) => set('description', e.target.value)}
                      placeholder={t('wizard.descriptionPlaceholder')}
                    />
                  </Field>
                </div>
              )}
            </div>

            <footer className="wizard-foot">
              {step > 0 ? (
                <button type="button" className="btn btn-ghost" onClick={back} disabled={busy}>
                  {t('wizard.back')}
                </button>
              ) : (
                <span />
              )}
              {step < STEPS.length - 1 ? (
                <button type="button" className="btn btn-primary" onClick={next}>
                  {t('wizard.next')}
                </button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={submit} disabled={busy}>
                  {busy ? t('wizard.publishing') : t('wizard.publish')}
                </button>
              )}
            </footer>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

/* Поле формы с подписью и ошибкой валидации. */
function Field({ label, error, hint, children }) {
  return (
    <label className={`wizard-field${error ? ' has-error' : ''}`}>
      <span className="wizard-field-label">
        {label}
        {hint && <small>{hint}</small>}
      </span>
      {children}
      {error && <small className="wizard-field-error">{error}</small>}
    </label>
  )
}

/* Переключатель-тумблер условий сдачи. */
function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="wizard-toggle">
      <span className="wizard-toggle-text">
        <b>{label}</b>
        {hint && <small>{hint}</small>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="wizard-switch" aria-hidden="true" />
    </label>
  )
}

/* Сегментированный переключатель (КПП, топливо). */
function Segmented({ ariaLabel, value, onChange, options }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={value === option.value ? 'is-active' : ''}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
