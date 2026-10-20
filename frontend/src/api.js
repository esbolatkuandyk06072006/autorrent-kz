const TOKEN_KEY = 'autorent_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (token) => {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

// Universal API client: sends JSON, attaches the JWT, unwraps page responses
// and converts backend errors into Error objects with fieldErrors.
export async function api(path, { method = 'GET', body, params } = {}) {
  const url = new URL(path, window.location.origin)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== '' && value !== null && value !== undefined) {
        url.searchParams.set(key, value)
      }
    }
  }

  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  })

  if (response.status === 204) return null

  const text = await response.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { message: text }
  }

  if (!response.ok) {
    if (response.status === 401) setToken(null)
    const error = new Error(data?.message || `Ошибка HTTP ${response.status}`)
    error.status = response.status
    error.fieldErrors = data?.fieldErrors || null
    throw error
  }
  return data
}

export const apiGet = (path, params) => api(path, { params })
export const apiPost = (path, body) => api(path, { method: 'POST', body })
export const apiPut = (path, body) => api(path, { method: 'PUT', body })
export const apiPatch = (path, body, params) => api(path, { method: 'PATCH', body, params })
export const apiDelete = (path) => api(path, { method: 'DELETE' })
