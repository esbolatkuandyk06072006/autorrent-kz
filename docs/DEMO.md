# Демонстрация AutoRent KZ

Короткий сценарий для защиты проекта: 7–10 минут, без фронтенда, через Swagger UI и при необходимости Postman.

---

## 1. Подготовка

```powershell
# из корня проекта
.\mvnw.cmd spring-boot:run
```

Открыть:

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

### Шаг 1. Обзор API (30 секунд)

В Swagger UI показать:

- группы `auth-controller`, `car-controller`, `reservation-controller`, `review-controller`;
- схему `bearerAuth` (JWT);
- модели `CarRequest`, `ReservationRequest`, `ReviewRequest`;
- коды ответов.

### Шаг 2. Вход администратора (30 секунд)

1. `POST /api/v1/auth/login`
2. Body:

```json
{
  "email": "admin@autorrent.kz",
  "password": "Admin123!"
}
```

3. Скопировать `token`.
4. Нажать **Authorize** и вставить токен без слова `Bearer`.
5. Показать, что в ответе роль `ADMIN`.

### Шаг 3. Каталог и создание автомобиля (1–2 минуты)

1. `GET /api/v1/cars` — показать 6 демо-автомобилей, пагинацию и рейтинг.
2. `POST /api/v1/cars` — создать автомобиль:

```json
{
  "brand": "Toyota",
  "model": "Camry",
  "year": 2023,
  "licensePlate": "DEMO001",
  "category": "COMFORT",
  "transmission": "AUTOMATIC",
  "fuelType": "PETROL",
  "seats": 5,
  "pricePerDay": 25000.00,
  "city": "Almaty",
  "description": "Демонстрационный автомобиль",
  "imageUrl": "https://placehold.co/600x400?text=Demo"
}
```

3. Показать `201 Created` и `id`.
4. `PATCH /api/v1/cars/{id}/status` — перевести в `MAINTENANCE`, затем вернуть `ACTIVE`.

### Шаг 4. Проверка ролей (30 секунд)

1. Выполнить `POST /api/v1/auth/login` для `user@autorrent.kz` / `User123!`.
2. Вставить токен USER.
3. `POST /api/v1/cars` — показать `403 Forbidden`.
4. `GET /api/v1/reservations` — показать `403 Forbidden`.

### Шаг 5. Бронирование (2 минуты)

1. `GET /api/v1/cars/available?startDate=2026-11-10&endDate=2026-11-14`.
2. `POST /api/v1/reservations` (даты должны быть в будущем; `carId` — id созданного автомобиля):

```json
{
  "carId": 7,
  "startDate": "2026-11-10",
  "endDate": "2026-11-14"
}
```

3. Показать `201`, статус `PENDING`, `daysCount = 4`, `totalPrice = 100000.00`.
4. Повторить тот же запрос — показать `409 Conflict`.
5. `GET /api/v1/reservations/my` — показать свою бронь.
6. `PATCH /api/v1/reservations/{id}/cancel?reason=Demo` — показать `CANCELLED` и освобождение дат.

### Шаг 6. Отзывы (1–2 минуты)

1. `GET /api/v1/cars/1/reviews` — показать публичный отзыв из seed.
2. `POST /api/v1/reviews` с `reservationId = 1` — показать `409`, потому что отзыв уже есть.
3. Войти ADMIN и выполнить `PATCH /api/v1/reviews/1/visibility`:

```json
{
  "status": "HIDDEN"
}
```

4. `GET /api/v1/cars/1/reviews` — отзыв исчез из публичного списка.
5. Вернуть `VISIBLE`.

### Шаг 7. Ошибки и валидация (30 секунд)

1. `POST /api/v1/reservations` с `endDate` раньше `startDate` — показать `400` и `fieldErrors`.
2. Запрос без токена к `/api/v1/users/me` — показать `401`.

### Шаг 8. Технические бонусы (1 минута)

Показать в проекте:

- `docs/TZ.md` — ТЗ и стек;
- `src/main/resources/db/migration/V1__init.sql` — Flyway;
- `Dockerfile` и `docker-compose.yml`;
- `.github/workflows/ci.yml` — CI;
- `target/site/jacoco/index.html` — покрытие;
- `postman/AutoRentKZ.postman_collection.json`.

---

## 3. Что подчеркнуть

| Требование | Где показать |
|---|---|
| Java 21 / Spring Boot | `pom.xml` |
| 3+ связанные таблицы | `docs/TZ.md`, ER-диаграмма; фактически 4 таблицы |
| CRUD 3 ресурсов | Car, Reservation, Review в Swagger |
| JWT и 2 роли | логин, `Authorize`, 403 для USER |
| Bean Validation | `400` с `fieldErrors` |
| Global Exception Handler | единый JSON ошибок |
| 2+ паттерна | Strategy, Factory, Facade в `service` |
| JUnit 5 + Mockito | `mvnw test`, 13 тестов |
| Swagger/OpenAPI | `/swagger-ui.html` |
| Docker/PostgreSQL | `docker compose up --build` |
| CI | GitHub Actions workflow |

---

## 4. Быстрая проверка одной командой

При запущенном приложении:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\smoke-test.ps1
```

Скрипт выполняет 45 проверок и завершается сообщением `SMOKE TEST PASSED`.

---

## 5. Возможные вопросы комиссии

**Почему нет frontend?**  
По методичке frontend не обязателен при наличии Swagger/OpenAPI. MVP сфокусирован на backend, безопасности и бизнес-правилах; frontend вынесен в следующий этап.

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
- **401 после долгого простоя:** JWT истёк, выполнить login заново.
- **409 при бронировании:** даты пересекаются с активной бронью — это ожидаемая защита.
- **H2 данные пропали:** H2 in-memory очищается при перезапуске, это нормально для демо.
- **Нет JDK:** установить JDK 21 и проверить `java -version`.
- **Maven не установлен:** использовать `mvnw.cmd` / `./mvnw`.
