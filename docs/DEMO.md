# Демонстрация AutoRent KZ

Короткий сценарий для защиты проекта: 7–10 минут, через сайт (frontend) и Swagger UI.

---

## 1. Подготовка

```powershell
# 1) собрать frontend (пишет статику в backend/src/main/resources/static)
cd frontend
npm install
npm run build

# 2) запустить backend
cd ..\backend
.\mvnw.cmd spring-boot:run
```

Открыть:

- Сайт: `http://localhost:8080`
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- OpenAPI JSON: `http://localhost:8080/v3/api-docs`

Демо-доступ:

| Роль | Email | Пароль |
|---|---|---|
| ADMIN | `admin@autorrent.kz` | `Admin123!` |
| USER | `user@autorrent.kz` | `User123!` |

Если приложение уже запускалось и в H2 остались данные, перезапуск создаёт чистую in-memory БД. Для PostgreSQL очистить volume или использовать отдельную БД.

---

## 2. Сценарий показа

### Шаг 1. Сайт: каталог (1–2 минуты)

1. Открыть `http://localhost:8080` — каталог автомобилей с фильтрами.
2. Показать фильтры: марка, город, категория, цена, даты доступности.
3. Открыть карточку автомобиля — характеристики, рейтинг, отзывы.

### Шаг 2. Вход и роли (1 минута)

1. Войти как `user@autorrent.kz` / `User123!` — показать вход в шапке.
2. Показать, что раздел «Админ» у пользователя недоступен.
3. Выйти, войти как `admin@autorrent.kz` / `Admin123!` — появляется «Админ».

### Шаг 3. Бронирование (2 минуты)

1. Открыть любой автомобиль, выбрать даты.
2. Показать расчёт цены и скидку 10% при сроке ≥ 7 дней.
3. Нажать «Забронировать» — статус `PENDING`.
4. Раздел «Мои брони» — показать бронь и кнопку отмены.
5. Повторить бронь на те же даты — показать `409 Conflict` (защита от двойного бронирования).

### Шаг 4. Админ-панель (2 минуты)

1. Войти админом, открыть «Админ».
2. Вкладка «Автомобили»: добавить автомобиль, изменить, перевести в `MAINTENANCE`, удалить.
3. Вкладка «Брони»: подтвердить бронь пользователя (`PENDING → CONFIRMED`), завершить (`→ COMPLETED`).
4. Вкладка «Отзывы»: скрыть/показать отзыв, удалить.

### Шаг 5. Отзывы (1 минута)

1. Как пользователь: в «Мои брони» дождаться завершённой брони, оставить отзыв на странице автомобиля.
2. Показать редактирование и удаление своего отзыва.
3. Админ скрывает отзыв — он исчезает из публичного списка.

### Шаг 6. Swagger и API (1–2 минуты)

1. Открыть Swagger UI, показать группы контроллеров и `bearerAuth`.
2. `POST /api/v1/auth/login` → скопировать токен → **Authorize**.
3. Показать `403` для USER на `POST /api/v1/cars`.
4. Показать `400` с `fieldErrors` (например, `endDate` раньше `startDate`).
5. Показать `401` без токена на `/api/v1/users/me`.

### Шаг 7. Технические бонусы (1 минута)

Показать в проекте:

- `docs/TZ.md` — ТЗ и стек;
- `backend/src/main/resources/db/migration/V1__init.sql` — Flyway;
- `Dockerfile` (multi-stage: node → maven → jre) и `docker-compose.yml`;
- `.github/workflows/ci.yml` — CI для backend и frontend;
- `backend/target/site/jacoco/index.html` — покрытие;
- `backend/postman/AutoRentKZ.postman_collection.json`.

---

## 3. Что подчеркнуть

| Требование | Где показать |
|---|---|
| Java 21 / Spring Boot | `backend/pom.xml` |
| React frontend | каталог, бронирование, админ-панель на `:8080` |
| 3+ связанные таблицы | `docs/TZ.md`, ER-диаграмма; фактически 4 таблицы |
| CRUD 3 ресурсов | Car, Reservation, Review: в UI и в Swagger |
| JWT и 2 роли | логин, «Админ» только для ADMIN, 403 в Swagger |
| Bean Validation | `400` с `fieldErrors` |
| Global Exception Handler | единый JSON ошибок |
| 2+ паттерна | Strategy, Factory, Facade в `service` |
| JUnit 5 + Mockito | `mvnw test`, 13 тестов |
| Swagger/OpenAPI | `/swagger-ui.html` |
| Docker/PostgreSQL | `docker compose up --build` (образ собирает и frontend, и backend) |
| CI | GitHub Actions: два job — Maven и Vite |

---

## 4. Быстрая проверка одной командой

При запущенном приложении:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File backend\scripts\smoke-test.ps1
```

Скрипт выполняет 45 проверок и завершается сообщением `SMOKE TEST PASSED`.

---

## 5. Возможные вопросы комиссии

**Как frontend общается с backend?**  
SPA собрана Vite и встроена в Spring Boot jar (`static`); в dev-режиме Vite dev-server проксирует `/api` на `:8080`. Авторизация — JWT в `localStorage`, запросы через единый fetch-клиент.

**Как исключено двойное бронирование?**  
Проверка пересечения дат + pessimistic lock на строке автомобиля в транзакции `BookingFacade.bookCar`.

**Как считается цена?**  
Strategy: базовая цена и скидка 10% от 7 дней. Цена фиксируется в бронировании снимком `pricePerDaySnapshot`.

**Как проверяются права?**  
URL-правила Spring Security + `@PreAuthorize` для ADMIN + проверка владельца в сервисах для броней и отзывов.

**Чем отличается H2 и PostgreSQL?**  
H2 — быстрый локальный профиль с `create-drop`; PostgreSQL — production-профиль с Flyway и `ddl-auto: none`.

**Где хранятся секреты?**  
JWT и БД задаются переменными окружения; в репозитории только dev-значения и `.env.example`.

---

## 6. Если что-то пошло не так

- **Порт 8080 занят:** остановить старое Java-приложение или задать `SERVER_PORT`.
- **Пустая страница сайта:** frontend не собран — выполнить `npm run build` в `frontend/` и перезапустить backend.
- **401 после долгого простоя:** JWT истёк, выполнить login заново.
- **409 при бронировании:** даты пересекаются с активной бронью — это ожидаемая защита.
- **H2 данные пропали:** H2 in-memory очищается при перезапуске, это нормально для демо.
- **Нет JDK:** установить JDK 21 и проверить `java -version`.
- **Maven не установлен:** использовать `mvnw.cmd` / `./mvnw`.
