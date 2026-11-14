import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Header from './components/Header.jsx'
import BottomNav from './components/BottomNav.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { useAuth } from './AuthContext.jsx'
import { useTranslation } from './i18n.jsx'
import Login from './pages/Login.jsx'
import Welcome from './pages/Welcome.jsx'
import Kyc from './pages/Kyc.jsx'
import Register from './pages/Register.jsx'
import Cars from './pages/Cars.jsx'
import CarDetail from './pages/CarDetail.jsx'
import MyReservations from './pages/MyReservations.jsx'
import Profile from './pages/Profile.jsx'
import Favorites from './pages/Favorites.jsx'
import Compare from './pages/Compare.jsx'
import Assistant from './pages/Assistant.jsx'
import RoutesPage from './pages/Routes.jsx'
import Business from './pages/Business.jsx'
import AdminPanel from './pages/admin/AdminPanel.jsx'
import { IconRoutes } from './components/icons.jsx'

function RequireAuth({ children, adminOnly = false, staffOnly = false }) {
  const { isAuth, isAdmin, canManageVehicles } = useAuth()
  const location = useLocation()

  if (!isAuth) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />
  // staffOnly: панель управления техникой доступна админу и владельцу (OWNER).
  if (staffOnly && !isAdmin && !canManageVehicles) return <Navigate to="/" replace />
  return children
}

function NotFound() {
  const { t } = useTranslation()
  return (
    <div className="container section">
      <div className="empty-state">
        <div className="empty-icon">
          <IconRoutes size={44} />
        </div>
        <h3>{t('notFound.title')}</h3>
        <p>{t('notFound.text')}</p>
        <Link className="btn btn-primary" to="/">
          {t('notFound.back')}
        </Link>
      </div>
    </div>
  )
}

export default function App() {
  const { t } = useTranslation()
  const location = useLocation()
  return (
    <div className="app">
      <Header />
      <main>
        <ErrorBoundary>
          {/* App Shell: каждая страница появляется с мягкой анимацией. */}
          <div className="page-shell" key={location.pathname}>
            <Routes>
              <Route path="/" element={<Cars />} />
              <Route path="/cars/:id" element={<CarDetail />} />
              <Route path="/login" element={<Login />} />
              {/* Каршеринг-флоу: соглашения и KYC-верификация документов. */}
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/kyc" element={<Kyc />} />
              <Route path="/register" element={<Register />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/compare" element={<Compare />} />
              <Route path="/assistant" element={<Assistant />} />
              <Route path="/routes" element={<RoutesPage />} />
              <Route
                path="/business"
                element={
                  <RequireAuth>
                    <Business />
                  </RequireAuth>
                }
              />
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
                  <RequireAuth staffOnly>
                    <AdminPanel />
                  </RequireAuth>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </ErrorBoundary>
      </main>
      {/* Нижняя навигация мобильного стиля с центральной кнопкой «+». */}
      <BottomNav />
      <footer className="footer">
        <div className="container footer-inner">
          <span>© 2026 AutoRent KZ · {t('footer.project')}</span>
          <span>
            {t('footer.apiDocs')}: <a href="/swagger-ui.html">Swagger UI</a>
          </span>
        </div>
      </footer>
    </div>
  )
}
