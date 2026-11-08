-- Шаг 8: код от ключа у брони + акты приёма-передачи техники.

-- 1) Код от ключа: 4 цифры, генерируются при переводе брони в CONFIRMED.
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS key_code VARCHAR(4);

-- 2) Акт приёма-передачи: один акт на бронь и тип (выдача / возврат).
CREATE TABLE IF NOT EXISTS handover_reports (
    id BIGSERIAL PRIMARY KEY,
    reservation_id BIGINT NOT NULL,
    type VARCHAR(20) NOT NULL,
    fuel_level VARCHAR(20),
    mileage INTEGER,
    damages_note VARCHAR(1000),
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_handover_report_reservation
        FOREIGN KEY (reservation_id) REFERENCES reservations (id) ON DELETE CASCADE,
    CONSTRAINT uk_handover_reservation_type
        UNIQUE (reservation_id, type)
);

CREATE INDEX IF NOT EXISTS idx_handover_reports_reservation
    ON handover_reports (reservation_id);

-- 3) Фотографии акта (список путей /images/handover/{reservationId}/...).
CREATE TABLE IF NOT EXISTS handover_report_photos (
    report_id BIGINT NOT NULL,
    photo_path VARCHAR(500) NOT NULL,
    position INTEGER NOT NULL,
    CONSTRAINT fk_handover_photo_report
        FOREIGN KEY (report_id) REFERENCES handover_reports (id) ON DELETE CASCADE,
    PRIMARY KEY (report_id, position)
);
