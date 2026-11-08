# AutoRent KZ

Монорепо платформы аренды автомобилей: **backend** на Java 21 + Spring Boot 3.4.5 и **frontend** — SPA на React 19 + Vite.

Backend включает JWT-аутентификацию, роли `USER`/`ADMIN`, **вход по телефону (SMS-код)** и **KYC-загрузку документов**, CRUD автомобилей, бронирований и отзывов, проверку доступности по датам, расчёт цены со скидкой, **ИИ-ассистента** и Swagger UI.  
Frontend — SPA в **премиальном тёмно-синем дизайне** с SVG-логотипом, авторскими SVG-иконками (без эмодзи), **гамбургер-меню**, **переключателем языков RU / ҚАЗ / EN** и стекломорфизмом: каталог с фильтрами, **избранное и сравнение до 3 машин**, чат с ИИ-помощником, маршруты по Казахстану, фирменные **векторные фото авто**, «Мои брони», отзывы, профиль и админ-панель. Сборка фронта встраивается в backend-jar: одно приложение на `:8080` отдаёт и сайт, и API.

**Флоу входа как в каршеринге Anytime:** экран входа с интерактивной картой и телефоном → SMS-код → «Добро пожаловать» (соглашения) → KYC «Загрузите документы» → аккаунт готов. Email + пароль тоже работают.

> Подробное техническое задание: [`docs/TZ.md`](docs/TZ.md)

---

## Содержание

- [Быстрый старт](#быстрый-старт)
- [Frontend](#frontend)
- [Демо-доступ](#демо-доступ)
- [Запуск с PostgreSQL](#запуск-с-postgresql)
- [Docker Compose](#docker-compose)
- [Swagger и H2](#swagger-и-h2)
- [API](#api)
- [Бизнес-правила](#бизнес-правила)
- [Архитектура и паттерны](#архитектура-и-паттерны)
- [Тесты](#тесты)
- [Структура проекта](#структура-проекта)
- [Git и GitHub](#git-и-github)
- [Переменные окружения](#переменные-окружения)
- [Ограничения MVP](#ограничения-mvp)

---

## Быстрый старт

### Требования

- JDK 21
- Node.js 22+ (для сборки frontend)
- Maven 3.9+ **или** входящий в проект Maven Wrapper
- Docker — только для PostgreSQL-профиля

### Запуск на H2 (backend + frontend одной командой)

Соберите frontend (пишет статику в `backend/src/main/resources/static`):

```bash
cd frontend
npm install
npm run build
```

Затем запустите backend.

Windows PowerShell:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Linux/macOS:

```bash
cd backend
./mvnw spring-boot:run
```

Приложение автоматически:

- создаёт схему в H2;
- добавляет демо-данные;
- открывает сайт на `http://localhost:8080`;
- открывает Swagger UI на `http://localhost:8080/swagger-ui.html`;
- отдаёт API на `http://localhost:8080/api/v1`.

Проверка:

```bash
curl http://localhost:8080/api/v1/cars
```

### Сборка backend-джар

Windows:

```powershell
cd backend
.\mvnw.cmd clean package
java -jar target\autorrent-kz-0.0.1-SNAPSHOT.jar
```

Linux/macOS:

```bash
cd backend
./mvnw clean package
java -jar target/autorrent-kz-0.0.1-SNAPSHOT.jar
```

---

## Frontend

Стек: React 19, react-router-dom 7, Vite 7 (JSX, самописный CSS).

### Режим разработки

Терминал 1 — backend (`cd backend; .\mvnw.cmd spring-boot:run`), терминал 2:

```bash
cd frontend
npm run dev
```

Vite поднимает dev-сервер на `http://localhost:5173` и проксирует `/api`, `/v3/api-docs`, `/swagger-ui` на `:8080`.

### Возможности

- **премиальный дизайн** — тёмно-синий/графитовый градиент фона, стекломорфизм панелей фильтров и карточек, авторский SVG-логотип и авторские SVG-иконки вместо эмодзи, светлая/тёмная темы;
- **гамбургер-меню (App Shell)** вместо перегруженной шапки: разделы, счётчики, профиль, вход/выход;
- **3 языка интерфейса** — RU, ҚАЗ (казахский), EN, переключатель в шапке;
- **вход по телефону** — карта Алматы/Астаны/Шымкента + панель телефона, SMS-код (в dev-режиме код показывается в интерфейсе), вход по паролю и восстановление аккаунта;
- **Welcome-экран** — имя/фамилия и принятие пользовательского соглашения и обработки персональных данных;
- **KYC-загрузка документов** — ID-карта (спереди/сзади/селфи) и водительское право (спереди/сзади), фото с камеры или файл, проверка типа/размера на сервере;
- каталог с фильтрами (марка, город, категория, цена, даты доступности) в стеклянной панели и умные подборки «для стройки», «для свадьбы», «в горы»;
- **избранное и сравнение до 3 машин** — хранятся в браузере, работают без входа в аккаунт;
- **ИИ-помощник** — чат с подсказками: подбирает машины по бюджету/городу/классу и объясняет правила аренды (скидка, документы, оплата, отмена);
- **маршруты Казахстана** — 6 готовых поездок с рекомендацией класса авто и ссылкой в нужный фильтр каталога;
- **векторные «фото» автомобилей** — уникальная иллюстрация для каждой машины (цвет по марке/модели, сцена по категории, номерной знак), работает офлайн;
- страница автомобиля: характеристики, расчёт стоимости со скидкой 10% от 7 дней, бронирование;
- «Мои брони» с отменой, кодом от ключа и актами приёма-передачи (PDF);
- отзывы после завершённой аренды (создание, редактирование, удаление);
- профиль пользователя;
- админ-панель: CRUD автомобилей, управление статусами броней, модерация отзывов.

---

## Демо-доступ

| Роль | Email | Пароль |
|---|---|---|
| ADMIN | `admin@autorrent.kz` | `Admin123!` |
| USER | `user@autorrent.kz` | `User123!` |
| OWNER (владелец техники) | `owner@autorrent.kz` | `Owner123!` |

Телефоны для входа по SMS (dev-режим показывает код прямо в интерфейсе):

| Роль | Телефон |
|---|---|
| ADMIN | `+7 700 000 00 01` |
| USER | `+7 700 000 00 02` |
| OWNER | `+7 700 000 00 03` |

Любой другой номер проходит регистрацию: SMS-код → «Добро пожаловать» → KYC-документы. Демо-данные создаются только на пустой БД. Отключить:

```bash
set APP_SEED_ENABLED=false
```

или в `application.yml`:

```yaml
app:
  seed:
    enabled: false
```

> Пароли только для локальной демонстрации. В production seed отключается, администратор создаётся отдельно.

---

## Запуск с PostgreSQL

### 1. Поднять только базу

```bash
docker compose up -d db
```

### 2. Запустить приложение с профилем `postgres`

Windows PowerShell:

```powershell
$env:SPRING_PROFILES_ACTIVE="postgres"
cd backend
.\mvnw.cmd spring-boot:run
```

Linux/macOS:

```bash
cd backend
SPRING_PROFILES_ACTIVE=postgres ./mvnw spring-boot:run
```

Параметры по умолчанию:

```text
DB_URL=jdbc:postgresql://localhost:5432/autorrent
DB_USER=autorrent
DB_PASSWORD=autorrent
```

Их можно переопределить переменными окружения. Схема создаётся Flyway-миграцией `backend/src/main/resources/db/migration/V1__init.sql`.

---

## Docker Compose

Поднять приложение (backend + frontend в одном образе) и PostgreSQL одной командой:

```bash
docker compose up --build
```

- Сайт: `http://localhost:8080`
- API: `http://localhost:8080/api/v1`
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- PostgreSQL: `localhost:5432`
- Данные БД хранятся в volume `pgdata`.

Остановить:

```bash
docker compose down
```

Удалить данные БД:

```bash
docker compose down -v
```

---

## Swagger и H2

| Сервис | URL |
|---|---|
| Swagger UI | `http://localhost:8080/swagger-ui.html` |
| OpenAPI JSON | `http://localhost:8080/v3/api-docs` |
| H2 Console (dev) | `http://localhost:8080/h2-console` |

Параметры H2:

```text
JDBC URL: jdbc:h2:mem:autorrent
User:     sa
Password: (пусто)
```

### Как авторизоваться в Swagger

1. Выполнить `POST /api/v1/auth/login` с демо-учётными данными.
2. Скопировать `token` из ответа.
3. Нажать **Authorize**.
4. Вставить токен в поле `bearerAuth` (без слова `Bearer`).
5. Выполнять защищённые запросы.

---

## API

Базовый путь: `/api/v1`.

### Аутентификация и профиль

| Метод | Путь | Доступ |
|---|---|---|
| POST | `/auth/register` | публично |
| POST | `/auth/login` | публично |
| POST | `/auth/sms/request` | публично |
| POST | `/auth/sms/verify` | публично |
| POST | `/auth/signup` | signup-токен |
| GET | `/auth/signup/documents` | signup-токен |
| POST | `/auth/signup/documents` | signup-токен |
| GET | `/users/me` | USER, ADMIN |
| PUT | `/users/me` | USER, ADMIN |

Вход по телефону: `POST /auth/sms/request` с `{ "phone": "+77001234567" }` возвращает `expiresInSeconds`, `resendAfterSeconds` и в dev-режиме `devCode`; `POST /auth/sms/verify` с `{ "phone", "code" }` возвращает JWT для существующего пользователя или `signupToken` для нового. Документы KYC загружаются multipart-полем `file` и `slot` (`ID_FRONT`, `ID_BACK`, `ID_SELFIE`, `LICENSE_FRONT`, `LICENSE_BACK`), допустимы jpg/jpeg/png/webp до 8 МБ.

### Автомобили

| Метод | Путь | Доступ |
|---|---|---|
| GET | `/cars` | публично |
| GET | `/cars/available?startDate=...&endDate=...` | публично |
| GET | `/cars/{id}` | публично |
| POST | `/cars` | ADMIN |
| PUT | `/cars/{id}` | ADMIN |
| PATCH | `/cars/{id}/status` | ADMIN |
| DELETE | `/cars/{id}` | ADMIN |

Фильтры каталога: `brand`, `city`, `category`, `maxPrice`, `page`, `size`, `sortBy`, `direction`.

### Бронирования

| Метод | Путь | Доступ |
|---|---|---|
| POST | `/reservations` | USER, ADMIN |
| GET | `/reservations/my` | USER, ADMIN |
| GET | `/reservations/{id}` | владелец, ADMIN |
| PATCH | `/reservations/{id}/cancel` | владелец, ADMIN |
| GET | `/reservations` | ADMIN |
| PUT | `/reservations/{id}` | ADMIN |
| PATCH | `/reservations/{id}/status` | ADMIN |
| DELETE | `/reservations/{id}` | ADMIN |

Пример создания:

```json
{
  "carId": 1,
  "startDate": "2026-11-10",
  "endDate": "2026-11-14"
}
```

### Отзывы

| Метод | Путь | Доступ |
|---|---|---|
| GET | `/cars/{carId}/reviews` | публично |
| GET | `/reviews/{id}` | публично / владелец / ADMIN |
| POST | `/reviews` | USER, ADMIN |
| PUT | `/reviews/{id}` | владелец, ADMIN |
| DELETE | `/reviews/{id}` | владелец, ADMIN |
| GET | `/reviews` | ADMIN |
| PATCH | `/reviews/{id}/visibility` | ADMIN |

Пример:

```json
{
  "reservationId": 12,
  "rating": 5,
  "comment": "Көлік таза, қызмет жақсы."
}
```

Полные примеры и коды ошибок — в [`docs/TZ.md`](docs/TZ.md).

### ИИ-ассистент

| Метод | Путь | Доступ |
|---|---|---|
| POST | `/ai/chat` | публично |

Запрос:

```json
{ "message": "комфорт до 30000 тенге в Алматы" }
```

Ответ: `reply` (текст ответа), `suggestions` (чипы-подсказки для чата), `cars` (до 3 рекомендованных машин из каталога с рейтингом). Ассистент также отвечает на вопросы о скидке, документах, оплате, отмене, страховке и правилах бронирования.

---

## Бизнес-правила

- `startDate >= сегодня`, `endDate > startDate`, срок от 1 до 30 дней.
- `PENDING` и `CONFIRMED` блокируют даты; `CANCELLED` и `COMPLETED` — нет.
- Пересечение: `existing.startDate < new.endDate && existing.endDate > new.startDate`.
- Для защиты от двойного бронирования используется pessimistic lock на автомобиле.
- Цена: `pricePerDay * days`; при сроке ≥ 7 дней — скидка 10%.
- Статусы брони: `PENDING → CONFIRMED → ACTIVE → COMPLETED`, отмена — в `CANCELLED`.
- `COMPLETED` разрешён только после даты окончания аренды.
- Код от ключа выдаётся после подтверждения брони; акты приёма-передачи (выдача/возврат) фиксируют топливо, пробег, повреждения и фото.
- Отзыв — только по своему завершённому бронированию, один отзыв на бронь.
- Автомобиль нельзя перевести в `MAINTENANCE`/`ARCHIVED`, если у него есть активные брони.
- DELETE автомобиля с историей броней выполняет мягкое удаление (`ARCHIVED`).
- SMS-код: 6 цифр, живёт 5 минут, не более 5 попыток, повторная отправка — через 60 секунд.
- Телефон нормализуется к формату `+7XXXXXXXXXX`; регистрация возможна только после подтверждения телефона и принятия соглашений.

---

## Архитектура и паттерны

```text
Controller → Service/Facade → Repository → Entity → PostgreSQL/H2
```

| Паттерн | Реализация |
|---|---|
| Strategy | `PricingStrategy`, `StandardPricingStrategy`, `LongTermDiscountPricingStrategy` |
| Factory | `ReservationFactory` |
| Facade | `BookingFacade` |
| State | `ReservationStatus` + проверка допустимых переходов |
| Repository | Spring Data JPA |
| DTO / Mapper | records + `DtoMapper` |

- Контроллеры отвечают только за HTTP и DTO.
- Бизнес-логика — в сервисах.
- Транзакции — на сервисном слое.
- `open-in-view: false`.
- Пароли — BCrypt, JWT — HS256.
- Владелец ресурса проверяется в сервисе, а не только на уровне URL.

---

## Тесты

Windows:

```powershell
cd backend
.\mvnw.cmd test
```

Linux/macOS:

```bash
cd backend
./mvnw test
```

Покрыто:

- `PricingStrategyTest` / `PricingServiceTest` — стандартная цена и скидка 10%.
- `BookingFacadeTest` / `BookingRulesTest` — успешная бронь, конфликт дат, автомобиль на обслуживании, правила переходов статусов.
- `ReviewServiceTest` — отзыв только после завершённой аренды, запрет дубля и чужой брони.
- `AiAssistantServiceTest` — подбор авто по бюджету/городу/классу, ответы о правилах аренды, подсказки.
- `SmsCodeServiceTest` — генерация и проверка SMS-кода, TTL, лимит попыток, анти-спам, подтверждение телефона.
- `VehicleLicenseTest`, `DateRangeValidatorTest` — проверки прав и дат.
- `AutoRentKzApplicationTests` — загрузка контекста.
- `AuthAndCarIntegrationTest` — MockMvc: логин, создание автомобиля ADMIN, публичный каталог, 403 для USER.

Всего: **58 тестов** (`mvnw test`).

Отчёт JaCoCo:

```text
backend/target/site/jacoco/index.html
```

Тесты используют H2 и профиль `test`; демо-seed отключён.

### Smoke-тест запущенного приложения

После сборки frontend и запуска backend на `http://localhost:8080`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File backend\scripts\smoke-test.ps1
```

Скрипт проверяет 45 сценариев: публичный каталог, 401/403, логин ADMIN/USER, создание автомобиля, бронирование, конфликт `409`, валидацию `400`, отмену, смену статусов, отзывы и модерацию, мягкое удаление и Swagger/OpenAPI.

Дополнительные smoke-тесты (Node.js 20+):

```powershell
node backend\scripts\smoke-step4.mjs      # роли, теги, календарь, брони (44 проверки)
node backend\scripts\smoke-step8.mjs      # код от ключа и акты приёма-передачи (25 проверок)
node backend\scripts\smoke-auth-kyc.mjs   # SMS-вход и KYC-регистрация (18 проверок)
```

---

## Структура проекта

```text
backend/
├── src/main/java/kz/autorrent
│   ├── config          # SecurityConfig, OpenApiConfig, DataInitializer
│   ├── controller      # REST controllers, PageRequestFactory
│   ├── dto             # request/response records
│   ├── entity          # JPA entities, enums (KycDocument, HandoverReport…)
│   ├── exception       # exceptions + GlobalExceptionHandler
│   ├── mapper          # DtoMapper
│   ├── repository      # Spring Data repositories
│   ├── security        # JWT, signup-токен, UserDetails
│   ├── service         # business logic (SmsCodeService, KycService…)
│   │   └── pricing     # Strategy implementations
│   ├── util            # PhoneUtil (нормализация телефона)
│   └── validation      # @ValidDateRange
├── src/main/resources
│   ├── application.yml
│   ├── application-postgres.yml
│   ├── db/migration/V1__init.sql … V7__phone_auth_kyc.sql
│   └── static/         # сборка frontend (не в git)
├── src/test/java/kz/autorrent
├── postman/AutoRentKZ.postman_collection.json
├── scripts/smoke-test.ps1, smoke-step4.mjs, smoke-step8.mjs, smoke-auth-kyc.mjs
├── pom.xml
└── mvnw / mvnw.cmd

frontend/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx          # точка входа + провайдеры
    ├── App.jsx           # роутер (+ /welcome, /kyc)
    ├── api.js            # JWT-клиент API (включая загрузку файлов)
    ├── AuthContext.jsx   # контекст авторизации
    ├── LibraryContext.jsx # избранное и сравнение (localStorage)
    ├── signup.js         # сессия регистрации по телефону (sessionStorage)
    ├── i18n.jsx          # словари RU / ҚАЗ / EN
    ├── utils.js          # label'ы, деньги, даты
    ├── styles.css
    ├── components/       # Header (гамбургер), icons (SVG), CarCard, CarArt, ui
    └── pages/            # Cars, CarDetail, Favorites, Compare, Assistant, Routes,
                          # MyReservations, Profile, Login, Welcome, Kyc, Register, admin/

docs/TZ.md
docs/DEMO.md
.github/workflows/ci.yml
Dockerfile             # multi-stage: node → maven → jre
docker-compose.yml
```

---

## Git и GitHub

Репозиторий опубликован: [`github.com/esbolatkuandyk06072006/autorrent-kz`](https://github.com/esbolatkuandyk06072006/autorrent-kz) (ветка `main`).

```bash
git remote add origin https://github.com/esbolatkuandyk06072006/autorrent-kz.git
git push -u origin main
```

---

## Переменные окружения

| Переменная | Назначение | По умолчанию |
|---|---|---|
| `JWT_SECRET` | Секрет HS256, минимум 32 байта | dev-значение |
| `JWT_EXPIRATION_SECONDS` | Время жизни JWT | `86400` |
| `DB_URL` | JDBC URL PostgreSQL | `jdbc:postgresql://localhost:5432/autorrent` |
| `DB_USER` | Пользователь БД | `autorrent` |
| `DB_PASSWORD` | Пароль БД | `autorrent` |
| `APP_SEED_ENABLED` | Демо-данные | `true` |
| `APP_SMS_DEV_MODE` | SMS dev-режим: код возвращается в ответе и показывается в UI | `true` |

Пример есть в `.env.example`.

---

## Ограничения MVP

- Нет реального SMS-провайдера: в dev-режиме код возвращается в ответе API и показывается в интерфейсе; для production нужен шлюз (например, Mobizon/Twilio) и `APP_SMS_DEV_MODE=false`.
- KYC-документы хранятся локально в `uploads/kyc/` и не отдаются публично; ручная проверка документов администратором — следующий шаг (поле `kycStatus` уже есть).
- Онлайн-оплаты нет; email-уведомления не отправляются.
- Нет refresh-token и logout/blacklist.
- Переведены основные пользовательские экраны (RU/ҚАЗ/EN); часть служебных страниц (админ-панель, акты, бизнес-заявки) пока только на русском — это осознанное ограничение MVP.
- CI workflow (backend `mvn test` + JaCoCo, frontend `npm run build`) добавлен; deploy/CD не настроены.
- CORS в dev открыт широко; в production нужно ограничить origins.
- Демо-пароли и dev-код SMS нельзя использовать в production.
- H2-профиль — только для локальной разработки; production-профиль — PostgreSQL + Flyway.

---

## Документация

- [`docs/TZ.md`](docs/TZ.md) — техническое задание, модель данных, API, стек, тестирование.
- [`docs/DEMO.md`](docs/DEMO.md) — сценарий демонстрации на защите.
- [`backend/postman/AutoRentKZ.postman_collection.json`](backend/postman/AutoRentKZ.postman_collection.json) — коллекция запросов.
- Swagger UI — после запуска: `http://localhost:8080/swagger-ui.html`.

---

## Лицензия

Учебный проект. Свободно используется для демонстрации и доработки.
