import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const LibraryContext = createContext(null)

export const useLibrary = () => useContext(LibraryContext)

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

/**
 * Favorites (❤) and compare list (⇄) shared across the app.
 * Stored in localStorage — works for guests, no backend needed.
 */
export function LibraryProvider({ children }) {
  const [favorites, setFavorites] = useState(() => read('autorent_favorites', []))
  const [compare, setCompare] = useState(() => read('autorent_compare', []))

  useEffect(() => {
    localStorage.setItem('autorent_favorites', JSON.stringify(favorites))
  }, [favorites])

  useEffect(() => {
    localStorage.setItem('autorent_compare', JSON.stringify(compare))
  }, [compare])

  const toggleFavorite = useCallback((carId) => {
    setFavorites((prev) => (prev.includes(carId) ? prev.filter((id) => id !== carId) : [...prev, carId]))
  }, [])

  // Compare supports up to 3 cars — the oldest one is dropped.
  const toggleCompare = useCallback((carId) => {
    setCompare((prev) => {
      if (prev.includes(carId)) return prev.filter((id) => id !== carId)
      const next = [...prev, carId]
      return next.length > 3 ? next.slice(next.length - 3) : next
    })
  }, [])

  const isFavorite = useCallback((carId) => favorites.includes(carId), [favorites])
  const inCompare = useCallback((carId) => compare.includes(carId), [compare])

  const value = useMemo(
    () => ({
      favorites,
      compare,
      toggleFavorite,
      toggleCompare,
      isFavorite,
      inCompare,
      clearCompare: () => setCompare([])
    }),
    [favorites, compare, toggleFavorite, toggleCompare, isFavorite, inCompare]
  )

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
}
