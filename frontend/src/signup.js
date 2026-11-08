/**
 * Сессия телефонной регистрации (модуль B: Auth → Welcome → KYC).
 *
 * Хранится в sessionStorage: phone + signupToken (JWT purpose=signup, 30 мин)
 * и введённые на Welcome-экране данные. После успешного POST /auth/signup
 * запись удаляется — в приложение пользователь входит уже как владелец JWT.
 */

const KEY = 'autorent_signup'

export function getSignup() {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setSignup(data) {
  const next = { ...getSignup(), ...data }
  sessionStorage.setItem(KEY, JSON.stringify(next))
  return next
}

export function clearSignup() {
  sessionStorage.removeItem(KEY)
}
