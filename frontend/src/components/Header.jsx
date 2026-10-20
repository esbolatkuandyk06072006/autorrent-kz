import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'

export default function Header() {
  const { user, isAuth, isAdmin, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

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
          <NavLink to="/" end>
            Автомобили
          </NavLink>
          {isAuth && (
            <NavLink to="/my-reservations">Мои брони</NavLink>
          )}
          {isAdmin && <NavLink to="/admin">Админ</NavLink>}
        </nav>

        <div className="header-actions">
          {isAuth ? (
            <>
              <Link to="/profile" className="header-user">
                <span className="avatar">{user.firstName?.[0] || 'U'}</span>
                <span className="header-user-name">
                  {user.firstName} {user.lastName}
                </span>
                {isAdmin && <span className="badge badge-admin">ADMIN</span>}
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
    </header>
  )
}
