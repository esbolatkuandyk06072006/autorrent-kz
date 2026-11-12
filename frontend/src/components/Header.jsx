import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { useLibrary } from '../LibraryContext.jsx'
import { useTheme } from '../ThemeContext.jsx'
import { useTranslation } from '../i18n.jsx'
import {
  BrandMark,
  IconAdmin,
  IconArrowRight,
  IconAssistant,
  IconBusiness,
  IconCalendar,
  IconCatalog,
  IconClose,
  IconCompare,
  IconGlobe,
  IconHeart,
  IconLogout,
  IconMenu,
  IconMoon,
  IconRoutes,
  IconSun,
  IconUser
} from './icons.jsx'

// Авторские SVG-иконки вместо эмодзи: единый стиль обводки, наследуют цвет.
const NAV_ICONS = {
  catalog: IconCatalog,
  compare: IconCompare,
  favorites: IconHeart,
  assistant: IconAssistant,
  routes: IconRoutes,
  business: IconBusiness,
  myReservations: IconCalendar,
  admin: IconAdmin,
  myVehicles: IconAdmin,
  profile: IconUser
}

const LANGS = [
  { code: 'ru', label: 'RU' },
  { code: 'kz', label: 'ҚАЗ' },
  { code: 'en', label: 'EN' }
]

export default function Header() {
  const { user, isAuth, isAdmin, canManageVehicles, logout } = useAuth()
  const { favorites, compare } = useLibrary()
  const { theme, toggle: toggleTheme } = useTheme()
  const { lang, setLang, t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  // App Shell: гамбургер открывает боковой drawer на любом размере экрана.
  const [menuOpen, setMenuOpen] = useState(false)
  const drawerRef = useRef(null)
  const burgerRef = useRef(null)

  // Закрываем меню при переходе на другой маршрут.
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  // Блокировка прокрутки страницы под открытым drawer.
  useEffect(() => {
    document.body.classList.toggle('drawer-open', menuOpen)
    return () => document.body.classList.remove('drawer-open')
  }, [menuOpen])

  // Escape закрывает меню; фокус переносится в панель для клавиатуры.
  useEffect(() => {
    if (!menuOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const timer = setTimeout(() => drawerRef.current?.focus(), 120)
    return () => {
      document.removeEventListener('keydown', onKey)
      clearTimeout(timer)
    }
  }, [menuOpen])

  // При закрытии возвращаем фокус на гамбургер, если он остался в скрытом drawer.
  const menuOpenRef = useRef(false)
  const returnFocusRef = useRef(false)
  useEffect(() => {
    if (menuOpenRef.current && !menuOpen) {
      const active = document.activeElement
      const focusInDrawer = drawerRef.current && active && drawerRef.current.contains(active)
      if (returnFocusRef.current || focusInDrawer) {
        burgerRef.current?.focus()
        returnFocusRef.current = false
      }
    }
    menuOpenRef.current = menuOpen
  }, [menuOpen])

  const closeMenu = () => {
    // Если фокус был внутри drawer — после закрытия вернём его на гамбургер.
    const active = document.activeElement
    if (drawerRef.current && active && drawerRef.current.contains(active)) {
      returnFocusRef.current = true
    }
    setMenuOpen(false)
  }

  const handleLogout = () => {
    logout()
    setMenuOpen(false)
    navigate('/')
  }

  const badgeCount = (key) => (key === 'favorites' ? favorites.length : compare.length)

  const mainItems = [
    { key: 'catalog', to: '/', end: true },
    { key: 'routes', to: '/routes' },
    { key: 'assistant', to: '/assistant' }
  ]

  const collectionItems = [
    { key: 'compare', to: '/compare', badge: 'compare' },
    { key: 'favorites', to: '/favorites', badge: 'favorites' }
  ]
  if (isAuth) collectionItems.push({ key: 'business', to: '/business' })

  const accountItems = []
  if (isAuth) accountItems.push({ key: 'myReservations', to: '/my-reservations' })
  if (canManageVehicles) accountItems.push({ key: isAdmin ? 'admin' : 'myVehicles', to: '/admin' })
  if (isAuth) accountItems.push({ key: 'profile', to: '/profile' })

  const initials =
    [user?.firstName, user?.lastName]
      .filter(Boolean)
      .map((part) => part.trim().charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase() || ''

  const renderLink = (item, index) => {
    const Icon = NAV_ICONS[item.key] || IconCatalog
    const count = item.badge ? badgeCount(item.badge) : 0
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        onClick={closeMenu}
        className={({ isActive }) => `drawer-link${isActive ? ' active' : ''}`}
        style={{ '--i': index }}
      >
        <span className="drawer-link-icon">
          <Icon size={19} />
        </span>
        <span className="drawer-link-label">{t(`nav.${item.key}`)}</span>
        {count > 0 && <span className="drawer-badge">{count}</span>}
        <IconArrowRight size={15} className="drawer-link-chevron" />
      </NavLink>
    )
  }

  return (
    <>
      <header className="header">
        <div className="container header-inner">
          <button
            type="button"
            ref={burgerRef}
            className={`hamburger${menuOpen ? ' is-open' : ''}`}
            aria-label={t('nav.menu')}
            aria-expanded={menuOpen}
            aria-controls="app-drawer"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <IconMenu size={22} />
          </button>

          <Link to="/" className="brand" aria-label="AutoRent KZ">
            <BrandMark size={30} />
            <span className="brand-text">
              AutoRent <b>KZ</b>
            </span>
          </Link>

          <div className="header-actions">
            <button
              type="button"
              className="icon-toggle"
              onClick={toggleTheme}
              title={t('common.theme')}
              aria-label={t('common.theme')}
            >
              {theme === 'dark' ? <IconSun size={17} /> : <IconMoon size={17} />}
            </button>

            {isAuth ? (
              <Link to="/profile" className="header-user" title={user.firstName}>
                <span className="avatar">{initials || <IconUser size={18} />}</span>
                <span className="header-user-name">{user.firstName}</span>
              </Link>
            ) : (
              <Link className="btn btn-primary btn-sm header-login" to="/login">
                {t('auth.login')}
              </Link>
            )}
          </div>
        </div>
      </header>

      {createPortal(
        <>
          <div
            className={`drawer-backdrop${menuOpen ? ' is-open' : ''}`}
            onClick={closeMenu}
            aria-hidden="true"
          />
          <aside
            id="app-drawer"
            ref={drawerRef}
            tabIndex={-1}
            className={`app-drawer${menuOpen ? ' is-open' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label={t('nav.menu')}
            aria-hidden={!menuOpen}
            inert={!menuOpen || undefined}
          >
            <div className="drawer-head">
              <Link to="/" className="brand" onClick={closeMenu} aria-label="AutoRent KZ">
                <BrandMark size={30} />
                <span className="brand-text">
                  AutoRent <b>KZ</b>
                </span>
              </Link>
              <button
                type="button"
                className="drawer-close"
                onClick={closeMenu}
                aria-label={t('common.close')}
              >
                <IconClose size={20} />
              </button>
            </div>

            {isAuth ? (
              <Link to="/profile" className="drawer-user" onClick={closeMenu}>
                <span className="drawer-avatar">{initials || <IconUser size={20} />}</span>
                <span className="drawer-user-info">
                  <b>
                    {user.firstName} {user.lastName}
                  </b>
                  <small>{user.email || user.phone}</small>
                </span>
                {(isAdmin || user.role === 'OWNER') && (
                  <span className={`drawer-role${isAdmin ? ' is-admin' : ''}`}>
                    {isAdmin ? 'ADMIN' : 'OWNER'}
                  </span>
                )}
              </Link>
            ) : (
              <div className="drawer-guest">
                <span className="drawer-avatar">
                  <IconUser size={20} />
                </span>
                <p>{t('menu.guest')}</p>
              </div>
            )}

            <nav className="drawer-nav" aria-label={t('nav.menu')}>
              <p className="drawer-section-title">{t('menu.main')}</p>
              {mainItems.map((item, i) => renderLink(item, i))}

              <p className="drawer-section-title">{t('menu.collections')}</p>
              {collectionItems.map((item, i) => renderLink(item, i + mainItems.length))}

              {accountItems.length > 0 && (
                <>
                  <p className="drawer-section-title">{t('menu.account')}</p>
                  {accountItems.map((item, i) =>
                    renderLink(item, i + mainItems.length + collectionItems.length)
                  )}
                </>
              )}
            </nav>

            <div className="drawer-foot">
              <div className="drawer-setting">
                <span className="drawer-setting-label">
                  {theme === 'dark' ? <IconMoon size={17} /> : <IconSun size={17} />}
                  {t('common.theme')}
                </span>
                <button
                  type="button"
                  className={`drawer-switch${theme === 'dark' ? ' is-on' : ''}`}
                  onClick={toggleTheme}
                  aria-pressed={theme === 'dark'}
                  aria-label={t('common.theme')}
                >
                  <span className="drawer-switch-knob" />
                </button>
              </div>

              <div className="drawer-setting">
                <span className="drawer-setting-label">
                  <IconGlobe size={17} />
                  {t('common.language')}
                </span>
                <div className="lang-toggle drawer-langs" role="group" aria-label={t('common.language')}>
                  {LANGS.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      className={`lang-btn ${lang === l.code ? 'lang-btn-on' : ''}`}
                      onClick={() => setLang(l.code)}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {isAuth ? (
                <button className="btn btn-ghost btn-block drawer-logout" onClick={handleLogout}>
                  <IconLogout size={17} /> {t('auth.logout')}
                </button>
              ) : (
                <div className="drawer-auth">
                  <Link className="btn btn-primary btn-block" to="/login" onClick={closeMenu}>
                    {t('auth.login')}
                  </Link>
                  <Link className="btn btn-ghost btn-block" to="/register" onClick={closeMenu}>
                    {t('auth.register')}
                    <IconArrowRight size={16} />
                  </Link>
                </div>
              )}
            </div>
          </aside>
        </>,
        document.body
      )}
    </>
  )
}
