-- Шаг 4: владельцы техники, теги умных подборок, расширенные брони и бизнес-заявки.
-- H2 (dev/test) использует ddl-auto=create-drop и эту миграцию не применяет;
-- миграция нужна профилю postgres (flyway.enabled=true).

-- 1. Владелец техники (роль OWNER) и категория прав у клиента.
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS driving_license VARCHAR(20);

ALTER TABLE IF EXISTS vehicles ADD COLUMN IF NOT EXISTS owner_id BIGINT;
ALTER TABLE IF EXISTS vehicles
    ADD CONSTRAINT fk_vehicles_owner FOREIGN KEY (owner_id) REFERENCES users (id);
CREATE INDEX IF NOT EXISTS idx_vehicles_owner ON vehicles (owner_id);

-- 2. Теги для умных подборок (@ElementCollection Vehicle.tags).
CREATE TABLE IF NOT EXISTS vehicle_tags (
    vehicle_id BIGINT NOT NULL,
    tag        VARCHAR(30) NOT NULL,
    PRIMARY KEY (vehicle_id, tag),
    CONSTRAINT fk_vehicle_tags_vehicle
        FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vehicle_tags_vehicle ON vehicle_tags (vehicle_id);

-- 3. Расширенные брони: почасовая аренда, оператор, скидка, ссылка на заявку.
ALTER TABLE IF EXISTS reservations ADD COLUMN IF NOT EXISTS hours INT;
ALTER TABLE IF EXISTS reservations ADD COLUMN IF NOT EXISTS with_operator BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE IF EXISTS reservations ADD COLUMN IF NOT EXISTS price_per_hour_snapshot NUMERIC(10, 2);
ALTER TABLE IF EXISTS reservations ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5, 2);
ALTER TABLE IF EXISTS reservations ADD COLUMN IF NOT EXISTS business_order_id BIGINT;

-- 4. Бизнес-заявки (счёт на юрлицо): несколько позиций в одной заявке.
CREATE TABLE IF NOT EXISTS business_orders (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT NOT NULL,
    company_name VARCHAR(200) NOT NULL,
    bin          VARCHAR(12) NOT NULL,
    total_price  NUMERIC(14, 2) NOT NULL,
    created_at   TIMESTAMP NOT NULL,
    updated_at   TIMESTAMP,
    CONSTRAINT fk_business_orders_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_business_orders_user ON business_orders (user_id);

ALTER TABLE IF EXISTS reservations
    ADD CONSTRAINT fk_reservations_business_order
        FOREIGN KEY (business_order_id) REFERENCES business_orders (id);

-- 5. Индекс для календаря занятости техники.
CREATE INDEX IF NOT EXISTS idx_reservations_vehicle_status_dates
    ON reservations (vehicle_id, status, start_date, end_date);
