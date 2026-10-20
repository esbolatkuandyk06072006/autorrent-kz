import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Header from './components/Header.jsx'
import { useAuth } from './AuthContext.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Cars from './pages/Cars.jsx'
import CarDetail from './pages/CarDetail.jsx'
import MyReservations from './pages/MyReservations.jsx'
import Profile from './pages/Profile.jsx'
import AdminPanel from './pages/admin/AdminPanel.jsx'

function RequireAuth({ children, adminOnly = false }) {
  const { isAuth, isAdmin } = useAuth()
  const location = useLocation()

  if (!isAuth) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />
  return children
}

function NotFound() {
  return (
    <div className="container section">
      <div className="empty-state">
        <div className="empty-icon">🧭</div>
        <h3>Страница не найдена</h3>
        <p>Проверьте адрес или вернитесь к каталогу автомобилей.</p>
        <Link className="btn btn-primary" to="/">
          К каталогу
        </Link>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <div className="app">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Cars />} />
          <Route path="/cars/:id" element={<CarDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/my-reservations"
            element={
              <RequireAuth>
                <MyReservations />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/*"
            element={
              <RequireAuth adminOnly>
                <AdminPanel />
              </RequireAuth>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="footer">
        <div className="container footer-inner">
          <span>© 2026 AutoRent KZ · учебный проект</span>
          <span>
            API-документация: <a href="/swagger-ui.html">Swagger UI</a>
          </span>
        </div>
      </footer>
    </div>
  )
}
