import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { apiPost, apiGet, setToken, getToken } from './api.js'

const AuthContext = createContext(null)

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('autorent_user')
    try {
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  const applyAuth = useCallback((data) => {
    setToken(data.token)
    localStorage.setItem('autorent_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }, [])

  const login = useCallback(async (email, password) => {
    const data = await apiPost('/api/v1/auth/login', { email, password })
    return applyAuth(data)
  }, [applyAuth])

  const register = useCallback(async (payload) => {
    const data = await apiPost('/api/v1/auth/register', payload)
    return applyAuth(data)
  }, [applyAuth])

  const logout = useCallback(() => {
    setToken(null)
    localStorage.removeItem('autorent_user')
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    const me = await apiGet('/api/v1/users/me')
    localStorage.setItem('autorent_user', JSON.stringify(me))
    setUser(me)
    return me
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuth: !!user,
      isAdmin: user?.role === 'ADMIN',
      token: getToken(),
      login,
      register,
      logout,
      refreshUser
    }),
    [user, login, register, logout, refreshUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
