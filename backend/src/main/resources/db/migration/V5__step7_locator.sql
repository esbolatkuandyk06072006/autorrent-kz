-- Шаг 7: локатор точки выдачи — адрес, координаты и подсказка для техники.
-- H2 (dev/test) использует ddl-auto=create-drop и эту миграцию не применяет;
-- миграция нужна профилю postgres (flyway.enabled=true).

ALTER TABLE IF EXISTS vehicles ADD COLUMN IF NOT EXISTS pickup_address VARCHAR(200);
ALTER TABLE IF EXISTS vehicles ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE IF EXISTS vehicles ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE IF EXISTS vehicles ADD COLUMN IF NOT EXISTS pickup_instructions VARCHAR(300);
