-- Шаг 3: галерея фотографий техники.
-- Таблица-коллекция для @ElementCollection Vehicle.images.
-- H2 (dev/test) использует ddl-auto=create-drop и эту миграцию не применяет;
-- миграция нужна профилю postgres (flyway.enabled=true).

CREATE TABLE IF NOT EXISTS vehicle_images (
    vehicle_id BIGINT NOT NULL,
    position   INT    NOT NULL,
    image_path VARCHAR(500) NOT NULL,
    PRIMARY KEY (vehicle_id, position),
    CONSTRAINT fk_vehicle_images_vehicle
        FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vehicle_images_vehicle ON vehicle_images (vehicle_id);

-- Перенести существующее главное фото (image_url) в галерею как images[0].
INSERT INTO vehicle_images (vehicle_id, position, image_path)
SELECT v.id, 0, v.image_url
FROM vehicles v
WHERE v.image_url IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM vehicle_images vi WHERE vi.vehicle_id = v.id
  );
