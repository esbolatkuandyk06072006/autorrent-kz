import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

/**
 * Тема интерфейса: светлая (по умолчанию) или тёмная.
 * Выбор хранится в localStorage; при первом заходе — системная тема
 * (prefers-color-scheme). Тема применяется атрибутом data-theme на <html>,
 * все цвета — через CSS-переменные.
 */

const ThemeContext = createContext(null)

function initialTheme() {
  const saved = localStorage.getItem('autorent_theme')
  if (saved === 'dark' || saved === 'light') return saved
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(initialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('autorent_theme', theme)
  }, [theme])

  // Следуем за системной темой, пока пользователь сам не выбрал.
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return undefined
    const onChange = (e) => {
      if (!localStorage.getItem('autorent_theme')) {
        setThemeState(e.matches ? 'dark' : 'light')
      }
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const setTheme = useCallback((next) => {
    if (next === 'dark' || next === 'light') setThemeState(next)
  }, [])

  const toggle = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  const value = useMemo(() => ({ theme, setTheme, toggle }), [theme, setTheme, toggle])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
