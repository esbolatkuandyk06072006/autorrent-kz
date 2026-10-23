import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { useLibrary } from '../LibraryContext.jsx'

const NAV_ITEMS = [
  { to: '/', label: 'Каталог', icon: '🚗', end: true },
  { to: '/compare', label: 'Сравнение', icon: '⇄', badge: 'compare' },
  { to: '/favorites', label: 'Избранное', icon: '❤', badge: 'favorites' },
  { to: '/assistant', label: 'AI-помощник', icon: '🤖' },
  { to: '/routes', label: 'Маршруты', icon: '🗺' }
]

// Пункт «Для бизнеса» — счёт на юрлицо, доступен только авторизованным.
const BUSINESS_ITEM = { to: '/business', label: 'Для бизнеса', icon: '🏢' }

export default function Header() {
  const { user, isAuth, isAdmin, canManageVehicles, logout } = useAuth()
  const { favorites, compare } = useLibrary()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const badgeCount = (key) => (key === 'favorites' ? favorites.length : compare.length)
  const items = isAuth ? [...NAV_ITEMS, BUSINESS_ITEM] : NAV_ITEMS

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
          {items.map((item) => {
            const count = item.badge ? badgeCount(item.badge) : 0
            return (
              <NavLink key={item.to} to={item.to} end={item.end} className="nav-item">
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                {count > 0 && <span className="nav-badge">{count}</span>}
              </NavLink>
            )
          })}
          {isAuth && (
            <NavLink to="/my-reservations" className="nav-item">
              <span className="nav-icon">🗓</span>
              <span className="nav-label">Мои брони</span>
            </NavLink>
          )}
          {canManageVehicles && (
            <NavLink to="/admin" className="nav-item">
              <span className="nav-icon">🛠</span>
              <span className="nav-label">{isAdmin ? 'Админ' : 'Моя техника'}</span>
            </NavLink>
          )}
        </nav>

        <div className="header-actions">
          {isAuth ? (
            <>
              <Link to="/profile" className="header-user">
                <span className="avatar">{user.firstName?.[0] || 'U'}</span>
                <span className="header-user-name">{user.firstName}</span>
                {isAdmin && <span className="badge badge-admin">ADMIN</span>}
                {!isAdmin && user.role === 'OWNER' && <span className="badge badge-admin">OWNER</span>}
              </Link>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link className="btn btn-ghost btn-sm" to="/login">
                Войти
              </Link>
              <Link className="btn btn-primary btn-sm" to="/register">
                Регистрация
              </Link>
            </>
          )}
        </div>
      </div>

      {/* compact tab bar for narrow screens */}
      <nav className="mobile-nav">
        {items.map((item) => {
          const count = item.badge ? badgeCount(item.badge) : 0
          return (
            <NavLink key={item.to} to={item.to} end={item.end} className="mobile-nav-item">
              <span className="nav-icon">{item.icon}</span>
              {count > 0 && <span className="nav-badge">{count}</span>}
              <span>{item.label}</span>
            </NavLink>
          )
        })}
        {canManageVehicles && (
          <NavLink to="/admin" className="mobile-nav-item">
            <span className="nav-icon">🛠</span>
            <span>{isAdmin ? 'Админ' : 'Техника'}</span>
          </NavLink>
        )}
      </nav>
    </header>
  )
}
