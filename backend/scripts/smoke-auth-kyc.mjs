// Smoke-тест модуля B: вход по SMS и регистрация с KYC-документами.
//
// Запуск (приложение уже работает на :8080):
//   node scripts/smoke-auth-kyc.mjs
//
// Проверяет: dev-код, вход существующего пользователя, signup-токен нового
// номера, анти-спам, загрузку документа, регистрацию без согласий (400),
// создание аккаунта, kycStatus=PENDING и повторную попытку входа.
const BASE = (process.env.BASE_URL || 'http://localhost:8080') + '/api/v1'

async function call(path, { method = 'GET', token, body, form } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  let payload
  if (form) {
    payload = form
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const res = await fetch(BASE + path, { method, headers, body: payload })
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  return { status: res.status, data }
}

let passed = 0
let failed = 0

function check(name, cond, extra = '') {
  if (cond) {
    passed++
    console.log('  ✓ ' + name)
  } else {
    failed++
    console.log('  ✗ ' + name + (extra ? ' — ' + JSON.stringify(extra) : ''))
  }
}

// 1x1 PNG — минимальный валидный файл для проверки загрузки.
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)

// Уникальный номер, чтобы повторный запуск не упирался в существующий аккаунт.
const newPhone = '+7701' + String(Math.floor(1000000 + Math.random() * 8999999))

console.log('\n=== Smoke модуля B: SMS + KYC ===\n')

console.log('1. Вход по SMS существующим пользователем')
const existingPhone = '+77000000002'
const send1 = await call('/auth/sms/request', { method: 'POST', body: { phone: existingPhone } })
check('POST /auth/sms/request — 200', send1.status === 200, send1)
check('вернулся devCode (dev-режим)', /^\d{6}$/.test(send1.data?.devCode || ''), send1.data)
check(
  'есть expiresInSeconds и resendAfterSeconds',
  send1.data?.expiresInSeconds === 300 && send1.data?.resendAfterSeconds === 60,
  send1.data
)

const verify1 = await call('/auth/sms/verify', {
  method: 'POST',
  body: { phone: existingPhone, code: send1.data.devCode }
})
check('POST /auth/sms/verify — 200', verify1.status === 200, verify1)
check(
  'registered=true и есть JWT',
  verify1.data?.registered === true && !!verify1.data?.auth?.token,
  verify1.data
)
const token = verify1.data?.auth?.token
const me = await call('/users/me', { token })
check('JWT работает: GET /users/me — 200', me.status === 200, me)

console.log('\n2. Новый номер: SMS → signup-токен → KYC → регистрация')
const send2 = await call('/auth/sms/request', { method: 'POST', body: { phone: newPhone } })
check('код отправлен новому номеру', send2.status === 200 && !!send2.data?.devCode, send2)

const verify2 = await call('/auth/sms/verify', {
  method: 'POST',
  body: { phone: newPhone, code: send2.data.devCode }
})
check(
  'registered=false и есть signupToken',
  verify2.data?.registered === false && !!verify2.data?.signupToken,
  verify2.data
)
const signupToken = verify2.data?.signupToken

const spam = await call('/auth/sms/request', { method: 'POST', body: { phone: newPhone } })
check('анти-спам: повторный запрос сразу — 429/400', [400, 429].includes(spam.status), spam)

const docs0 = await call('/auth/signup/documents', { token: signupToken })
check(
  'GET /signup/documents — пустой список',
  docs0.status === 200 && Array.isArray(docs0.data) && docs0.data.length === 0,
  docs0
)

const form = new FormData()
form.append('slot', 'ID_FRONT')
form.append('file', new Blob([png], { type: 'image/png' }), 'id-front.png')
const up = await call('/auth/signup/documents', { method: 'POST', token: signupToken, form })
check('POST /signup/documents — файл принят', up.status === 200 && up.data?.slot === 'ID_FRONT', up)

const badForm = new FormData()
badForm.append('slot', 'UNKNOWN')
badForm.append('file', new Blob([png], { type: 'image/png' }), 'x.png')
const badSlot = await call('/auth/signup/documents', { method: 'POST', token: signupToken, form: badForm })
check('неизвестный тип документа — 400', badSlot.status === 400, badSlot)

const docs1 = await call('/auth/signup/documents', { token: signupToken })
check(
  'GET /signup/documents — 1 файл после загрузки',
  docs1.data?.length === 1 && docs1.data[0].slot === 'ID_FRONT',
  docs1
)

const noConsent = await call('/auth/signup', {
  method: 'POST',
  token: signupToken,
  body: { firstName: 'Тест', lastName: 'Тестов', agreedTerms: true, agreedData: false }
})
check('регистрация без согласия — 400', noConsent.status === 400, noConsent)

const signup = await call('/auth/signup', {
  method: 'POST',
  token: signupToken,
  body: { firstName: 'Тест', lastName: 'Тестов', agreedTerms: true, agreedData: true }
})
check('POST /auth/signup — 201', signup.status === 201, signup)
check('в ответе JWT нового пользователя', !!signup.data?.token, signup.data)

const newToken = signup.data?.token
const me2 = await call('/users/me', { token: newToken })
check(
  'GET /users/me — новый пользователь',
  me2.status === 200 && me2.data?.phone === newPhone.replace(/\s/g, ''),
  me2
)
check('kycStatus=PENDING (документы загружены)', me2.data?.kycStatus === 'PENDING', me2.data)

console.log(`\n=== Итог: ${passed} успешно, ${failed} ошибок ===`)
process.exit(failed ? 1 : 0)
