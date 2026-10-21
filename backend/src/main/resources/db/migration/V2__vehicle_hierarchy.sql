-- Шаг 2: переименование Car → Vehicle и иерархия техники.
-- H2 (dev/test) использует ddl-auto=create-drop и эту миграцию не применяет;
-- миграция нужна профилю postgres (flyway.enabled=true).

-- 1. Переименование таблицы и FK-колонки в reservations.
ALTER TABLE IF EXISTS cars RENAME TO vehicles;
ALTER TABLE IF EXISTS reservations RENAME COLUMN car_id TO vehicle_id;
ALTER INDEX IF EXISTS idx_reservations_car_dates RENAME TO idx_reservations_vehicle_dates;

-- 2. Новые колонки иерархии и полей аренды.
ALTER TABLE IF EXISTS vehicles ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(20);
ALTER TABLE IF EXISTS vehicles ADD COLUMN IF NOT EXISTS capacity NUMERIC(6, 2);
ALTER TABLE IF EXISTS vehicles ADD COLUMN IF NOT EXISTS required_license VARCHAR(20);
ALTER TABLE IF EXISTS vehicles ADD COLUMN IF NOT EXISTS with_operator BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE IF EXISTS vehicles ADD COLUMN IF NOT EXISTS operator_price_per_day NUMERIC(10, 2);
ALTER TABLE IF EXISTS vehicles ADD COLUMN IF NOT EXISTS price_per_hour NUMERIC(10, 2);

-- 3. seats теперь не обязателен для грузовой/спецтехники.
ALTER TABLE IF EXISTS vehicles ALTER COLUMN seats DROP NOT NULL;
ALTER TABLE IF EXISTS vehicles DROP CONSTRAINT IF EXISTS chk_cars_seats;
ALTER TABLE IF EXISTS vehicles ADD CONSTRAINT chk_vehicles_seats CHECK (seats IS NULL OR seats BETWEEN 1 AND 9);

-- 4. Заполнить группу (vehicle_type) из категории для существующих строк.
UPDATE vehicles SET vehicle_type = CASE
    WHEN category IN ('ECONOMY', 'COMFORT', 'BUSINESS', 'SUV', 'ELECTRIC') THEN 'PASSENGER'
    WHEN category IN ('LIGHT_TRUCK', 'MEDIUM_TRUCK', 'HEAVY_TRUCK', 'DUMP_TRUCK') THEN 'CARGO'
    WHEN category IN ('EXCAVATOR', 'CRANE', 'BULLDOZER', 'LOADER', 'CONCRETE_MIXER') THEN 'SPECIAL'
    ELSE 'PASSENGER'
END
WHERE vehicle_type IS NULL;

ALTER TABLE IF EXISTS vehicles ALTER COLUMN vehicle_type SET NOT NULL;

-- 5. Дать всем легковым правам B по умолчанию, если не заполнено.
UPDATE vehicles SET required_license = 'B'
WHERE required_license IS NULL AND vehicle_type = 'PASSENGER';

-- Переименовать ограничение уникальности номера (на случай если старое имя сохранилось).
ALTER TABLE IF EXISTS vehicles DROP CONSTRAINT IF EXISTS uk_cars_license_plate;
ALTER TABLE IF EXISTS vehicles ADD CONSTRAINT uk_vehicles_license_plate UNIQUE (license_plate);
