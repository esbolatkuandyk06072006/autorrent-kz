# AutoRent KZ

Монорепо платформы аренды автомобилей: **backend** на Java 21 + Spring Boot 3.4.5 и **frontend** — SPA на React 19 + Vite.

Backend включает JWT-аутентификацию, роли `USER`/`ADMIN`, CRUD автомобилей, бронирований и отзывов, проверку доступности по датам, расчёт цены со скидкой и Swagger UI.  
Frontend — каталог с фильтрами, бронирование, «Мои брони», отзывы, профиль и админ-панель. Сборка фронта встраивается в backend-jar: одно приложение на `:8080` отдаёт и сайт, и API.

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

- каталог автомобилей с фильтрами (марка, город, категория, цена, даты доступности);
- страница автомобиля: характеристики, расчёт стоимости со скидкой 10% от 7 дней, бронирование;
- «Мои брони» с отменой и причиной;
- отзывы после завершённой аренды (создание, редактирование, удаление);
- профиль пользователя;
- админ-панель: CRUD автомобилей, управление статусами броней, модерация отзывов.

---

## Демо-доступ

| Роль | Email | Пароль |
|---|---|---|
| ADMIN | `admin@autorrent.kz` | `Admin123!` |
| USER | `user@autorrent.kz` | `User123!` |

Демо-данные создаются только на пустой БД. Отключить:

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
| GET | `/users/me` | USER, ADMIN |
| PUT | `/users/me` | USER, ADMIN |

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

---

## Бизнес-правила

- `startDate >= сегодня`, `endDate > startDate`, срок от 1 до 30 дней.
- `PENDING` и `CONFIRMED` блокируют даты; `CANCELLED` и `COMPLETED` — нет.
- Пересечение: `existing.startDate < new.endDate && existing.endDate > new.startDate`.
- Для защиты от двойного бронирования используется pessimistic lock на автомобиле.
- Цена: `pricePerDay * days`; при сроке ≥ 7 дней — скидка 10%.
- Статусы брони: `PENDING → CONFIRMED → COMPLETED`, отмена — в `CANCELLED`.
- `COMPLETED` разрешён только после даты окончания аренды.
- Отзыв — только по своему завершённому бронированию, один отзыв на бронь.
- Автомобиль нельзя перевести в `MAINTENANCE`/`ARCHIVED`, если у него есть активные брони.
- DELETE автомобиля с историей броней выполняет мягкое удаление (`ARCHIVED`).

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

- `PricingStrategyTest` — стандартная цена и скидка 10%.
- `BookingFacadeTest` — успешная бронь, конфликт дат, автомобиль на обслуживании.
- `ReviewServiceTest` — отзыв только после завершённой аренды, запрет дубля и чужой брони.
- `AutoRentKzApplicationTests` — загрузка контекста.
- `AuthAndCarIntegrationTest` — MockMvc: логин, создание автомобиля ADMIN, публичный каталог, 403 для USER.

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

---

## Структура проекта

```text
backend/
├── src/main/java/kz/autorrent
│   ├── config          # SecurityConfig, OpenApiConfig, DataInitializer
│   ├── controller      # REST controllers, PageRequestFactory
│   ├── dto             # request/response records
│   ├── entity          # JPA entities, enums
│   ├── exception       # exceptions + GlobalExceptionHandler
│   ├── mapper          # DtoMapper
│   ├── repository      # Spring Data repositories
│   ├── security        # JWT, UserDetails
│   ├── service         # business logic
│   │   └── pricing     # Strategy implementations
│   └── validation      # @ValidDateRange
├── src/main/resources
│   ├── application.yml
│   ├── application-postgres.yml
│   ├── db/migration/V1__init.sql
│   └── static/         # сборка frontend (не в git)
├── src/test/java/kz/autorrent
├── postman/AutoRentKZ.postman_collection.json
├── scripts/smoke-test.ps1
├── pom.xml
└── mvnw / mvnw.cmd

frontend/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx        # точка входа
    ├── App.jsx         # роутер
    ├── api.js          # JWT-клиент API
    ├── AuthContext.jsx # контекст авторизации
    ├── utils.js        # label'ы, деньги, даты
    ├── styles.css
    ├── components/     # Header, CarCard, ui-примитивы
    └── pages/          # Cars, CarDetail, MyReservations, Profile, Login, Register, admin/

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

Пример есть в `.env.example`.

---

## Ограничения MVP

- Нет онлайн-оплаты, SMS/email-уведомлений, загрузки фото.
- Нет refresh-token и logout/blacklist.
- CI workflow (backend `mvn verify` + JaCoCo, frontend `npm run build`) добавлен; deploy/CD не настроены.
- CORS в dev открыт широко; в production нужно ограничить origins.
- Демо-пароли нельзя использовать в production.
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
