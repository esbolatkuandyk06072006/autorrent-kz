import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { useLibrary } from '../LibraryContext.jsx'
import { useTranslation } from '../i18n.jsx'
import { IconAssistant, IconCatalog, IconCompare, IconHeart, IconPlus } from './icons.jsx'
import VehicleWizard from './VehicleWizard.jsx'

// Экраны каршеринг-флоу и регистрации — нижняя панель там не нужна.
const HIDDEN_ROUTES = ['/login', '/register', '/welcome', '/kyc']

/**
 * Нижняя навигация в стиле мобильного приложения: каталог, избранное,
 * центральная акцентная кнопка «+» (мастер сдачи техники), сравнение
 * и AI-помощник. На экранах входа и при открытом drawer скрывается.
 */
export default function BottomNav() {
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const { canManageVehicles } = useAuth()
  const { favorites, compare } = useLibrary()
  const [wizardOpen, setWizardOpen] = useState(false)

  const hidden = HIDDEN_ROUTES.some((route) => pathname.startsWith(route))

  // Контенту нужен нижний отступ — класс на body, чтобы не ломать авторские экраны.
  useEffect(() => {
    document.body.classList.toggle('has-bottom-nav', !hidden)
    return () => document.body.classList.remove('has-bottom-nav')
  }, [hidden])

  if (hidden) return null

  const tabClass = ({ isActive }) => `bottom-tab${isActive ? ' is-active' : ''}`

  return (
    <>
      <nav className="bottom-nav" aria-label={t('bottom.aria')}>
        <NavLink to="/" end className={tabClass}>
          <IconCatalog />
          <span>{t('nav.catalog')}</span>
        </NavLink>
        <NavLink to="/favorites" className={tabClass}>
          <IconHeart />
          <span>{t('nav.favorites')}</span>
          {favorites.length > 0 && <i className="bottom-badge">{favorites.length > 9 ? '9+' : favorites.length}</i>}
        </NavLink>

        {/* Центральная акцентная кнопка «+» — мастер «Сдать технику в аренду». */}
        <button
          type="button"
          className="bottom-fab"
          aria-label={t('wizard.title')}
          title={t('wizard.title')}
          onClick={() => setWizardOpen(true)}
        >
          <IconPlus />
        </button>

        <NavLink to="/compare" className={tabClass}>
          <IconCompare />
          <span>{t('nav.compare')}</span>
          {compare.length > 0 && <i className="bottom-badge">{compare.length > 9 ? '9+' : compare.length}</i>}
        </NavLink>
        <NavLink to="/assistant" className={tabClass}>
          <IconAssistant />
          <span>{t('nav.assistant')}</span>
        </NavLink>
      </nav>

      <VehicleWizard
        open={wizardOpen}
        canCreate={canManageVehicles}
        onClose={() => setWizardOpen(false)}
      />
    </>
  )
}
