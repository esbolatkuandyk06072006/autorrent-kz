import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { useLibrary } from '../LibraryContext.jsx'
import { useTheme } from '../ThemeContext.jsx'
import { useTranslation } from '../i18n.jsx'

const NAV_ICONS = { catalog: '🚗', compare: '⇄', favorites: '❤', assistant: '🤖', routes: '🗺' }

export default function Header() {
  const { user, isAuth, isAdmin, canManageVehicles, logout } = useAuth()
  const { favorites, compare } = useLibrary()
  const { theme, toggle: toggleTheme } = useTheme()
  const { lang, setLang, t } = useTranslation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
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
  if (isAuth) navItems.push({ key: 'business', to: '/business', icon: '🏢' })

  return (
    <header className="header">
      <div className="container header-inner">
        <Link to="/" className="brand">
          <span className="brand-icon">🚗</span>
          <span>
            AutoRent <b>KZ</b>
          </span>
        </Link>

        <nav className="nav">
          {navItems.map((item) => {
            const count = item.badge ? badgeCount(item.badge) : 0
            return (
              <NavLink key={item.to} to={item.to} end={item.end} className="nav-item">
                <span className="nav-icon">{item.icon || NAV_ICONS[item.key]}</span>
                <span className="nav-label">{t(`nav.${item.key}`)}</span>
                {count > 0 && <span className="nav-badge">{count}</span>}
              </NavLink>
            )
          })}
          {isAuth && (
            <NavLink to="/my-reservations" className="nav-item">
              <span className="nav-icon">🗓</span>
              <span className="nav-label">{t('nav.myReservations')}</span>
            </NavLink>
          )}
          {canManageVehicles && (
            <NavLink to="/admin" className="nav-item">
              <span className="nav-icon">🛠</span>
              <span className="nav-label">{isAdmin ? t('nav.admin') : t('nav.myVehicles')}</span>
            </NavLink>
          )}
        </nav>

        <div className="header-actions">
          {/* Переключатели темы и языка — доступны всем, хранятся в localStorage. */}
          <div className="header-toggles">
            <button
              type="button"
              className="icon-toggle"
              onClick={toggleTheme}
              title={t('common.theme')}
              aria-label={t('common.theme')}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <div className="lang-toggle" role="group" aria-label={t('common.language')}>
              <button
                type="button"
                className={`lang-btn ${lang === 'ru' ? 'lang-btn-on' : ''}`}
                onClick={() => setLang('ru')}
              >
                RU
              </button>
              <button
                type="button"
                className={`lang-btn ${lang === 'kz' ? 'lang-btn-on' : ''}`}
                onClick={() => setLang('kz')}
              >
                ҚАЗ
              </button>
            </div>
          </div>
          {isAuth ? (
            <>
              <Link to="/profile" className="header-user">
                <span className="avatar">{user.firstName?.[0] || 'U'}</span>
                <span className="header-user-name">{user.firstName}</span>
                {isAdmin && <span className="badge badge-admin">ADMIN</span>}
                {!isAdmin && user.role === 'OWNER' && <span className="badge badge-admin">OWNER</span>}
              </Link>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                {t('auth.logout')}
              </button>
            </>
          ) : (
            <>
              <Link className="btn btn-ghost btn-sm" to="/login">
                {t('auth.login')}
              </Link>
              <Link className="btn btn-primary btn-sm" to="/register">
                {t('auth.register')}
              </Link>
            </>
          )}
        </div>
      </div>

      {/* compact tab bar for narrow screens */}
      <nav className="mobile-nav">
        {navItems.map((item) => {
          const count = item.badge ? badgeCount(item.badge) : 0
          return (
            <NavLink key={item.to} to={item.to} end={item.end} className="mobile-nav-item">
              <span className="nav-icon">{item.icon || NAV_ICONS[item.key]}</span>
              {count > 0 && <span className="nav-badge">{count}</span>}
              <span>{t(`nav.${item.key}`)}</span>
            </NavLink>
          )
        })}
        {canManageVehicles && (
          <NavLink to="/admin" className="mobile-nav-item">
            <span className="nav-icon">🛠</span>
            <span>{isAdmin ? t('nav.admin') : t('nav.vehiclesShort')}</span>
          </NavLink>
        )}
      </nav>
    </header>
  )
}
