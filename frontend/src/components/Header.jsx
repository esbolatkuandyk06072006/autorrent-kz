import { useEffect, useRef, useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { useLibrary } from '../LibraryContext.jsx'
import { useTheme } from '../ThemeContext.jsx'
import { useTranslation } from '../i18n.jsx'
import {
  BrandMark,
  IconAdmin,
  IconArrowRight,
  IconBusiness,
  IconCalendar,
  IconCatalog,
  IconClose,
  IconCompare,
  IconHeart,
  IconAssistant,
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
  myVehicles: IconAdmin
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

  // Гамбургер-меню: закрывается по клику вне, Escape и переходе на другую страницу.
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    setMenuOpen(false)
  }, [navigate])

  useEffect(() => {
    if (!menuOpen) return undefined
    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const handleLogout = () => {
    logout()
    setMenuOpen(false)
    navigate('/')
  }

  const badgeCount = (key) => (key === 'favorites' ? favorites.length : compare.length)

  const navItems = [
    { key: 'catalog', to: '/', end: true },
    { key: 'compare', to: '/compare', badge: 'compare' },
    { key: 'favorites', to: '/favorites', badge: 'favorites' },
    { key: 'assistant', to: '/assistant' },
    { key: 'routes', to: '/routes' }
  ]
  if (isAuth) navItems.push({ key: 'business', to: '/business' })
  if (isAuth) navItems.push({ key: 'myReservations', to: '/my-reservations' })
  if (canManageVehicles) navItems.push({ key: isAdmin ? 'admin' : 'myVehicles', to: '/admin' })

  const renderNavItem = (item, { showLabel = true, onNavigate } = {}) => {
    const Icon = NAV_ICONS[item.key] || IconCatalog
    const count = item.badge ? badgeCount(item.badge) : 0
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        onClick={onNavigate}
      >
        <span className="nav-icon">
          <Icon size={17} />
        </span>
        {showLabel && <span className="nav-label">{t(`nav.${item.key}`)}</span>}
        {count > 0 && <span className="nav-badge">{count}</span>}
      </NavLink>
    )
  }

  return (
    <header className="header">
      <div className="container header-inner">
        <Link to="/" className="brand" aria-label="AutoRent KZ">
          <BrandMark size={30} />
          <span className="brand-text">
            AutoRent <b>KZ</b>
          </span>
        </Link>

        {/* Основная навигация — на десктопе, в гамбургер-меню на узких экранах. */}
        <nav className="nav">{navItems.map((item) => renderNavItem(item))}</nav>

        <div className="header-actions">
          <div className="header-toggles">
            <button
              type="button"
              className="icon-toggle"
              onClick={toggleTheme}
              title={t('common.theme')}
              aria-label={t('common.theme')}
            >
              {theme === 'dark' ? <IconSun size={17} /> : <IconMoon size={17} />}
            </button>
            <div className="lang-toggle" role="group" aria-label={t('common.language')}>
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
            <div className="header-user-wrap">
              <Link to="/profile" className="header-user">
                <span className="avatar">
                  <IconUser size={18} />
                </span>
                <span className="header-user-name">{user.firstName}</span>
                {isAdmin && <span className="badge badge-admin">ADMIN</span>}
                {!isAdmin && user.role === 'OWNER' && <span className="badge badge-admin">OWNER</span>}
              </Link>
              <button
                className="btn btn-ghost btn-sm header-logout"
                onClick={handleLogout}
                title={t('auth.logout')}
              >
                <IconLogout size={16} />
              </button>
            </div>
          ) : (
            <div className="header-auth">
              <Link className="btn btn-ghost btn-sm" to="/login">
                {t('auth.login')}
              </Link>
              <Link className="btn btn-primary btn-sm" to="/register">
                {t('auth.register')}
              </Link>
            </div>
          )}

          {/* Кнопка гамбургера — App Shell для узких экранов. */}
          <button
            type="button"
            className="hamburger"
            aria-label={menuOpen ? t('common.close') : 'Menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <IconClose size={22} /> : <IconMenu size={22} />}
          </button>
        </div>
      </div>

      {/* Выпадающее гамбургер-меню: навигация, действия и переключатели. */}
      {menuOpen && (
        <div className="hamburger-panel" ref={menuRef} role="menu">
          <nav className="hamburger-nav">
            {navItems.map((item) => (
              <div key={item.to} className="hamburger-row">
                {renderNavItem(item, { showLabel: true, onNavigate: () => setMenuOpen(false) })}
              </div>
            ))}
          </nav>
          <div className="hamburger-foot">
            {isAuth ? (
              <>
                <Link to="/profile" className="hamburger-user" onClick={() => setMenuOpen(false)}>
                  <span className="avatar">
                    <IconUser size={18} />
                  </span>
                  <span>
                    {user.firstName} {user.lastName}
                    <small>{user.email}</small>
                  </span>
                </Link>
                <button className="btn btn-ghost btn-sm btn-block" onClick={handleLogout}>
                  <IconLogout size={16} /> {t('auth.logout')}
                </button>
              </>
            ) : (
              <div className="hamburger-auth">
                <Link className="btn btn-ghost btn-sm" to="/login" onClick={() => setMenuOpen(false)}>
                  {t('auth.login')}
                </Link>
                <Link className="btn btn-primary btn-sm" to="/register" onClick={() => setMenuOpen(false)}>
                  {t('auth.register')}
                  <IconArrowRight size={15} />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
