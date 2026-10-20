CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name    VARCHAR(50)  NOT NULL,
    last_name     VARCHAR(50)  NOT NULL,
    phone         VARCHAR(20),
    role          VARCHAR(20)  NOT NULL,
    enabled       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cars (
    id              BIGSERIAL PRIMARY KEY,
    brand           VARCHAR(50)    NOT NULL,
    model           VARCHAR(50)    NOT NULL,
    production_year INTEGER        NOT NULL,
    license_plate   VARCHAR(20)    NOT NULL UNIQUE,
    category        VARCHAR(20)    NOT NULL,
    transmission    VARCHAR(20)    NOT NULL,
    fuel_type       VARCHAR(20)    NOT NULL,
    seats           INTEGER        NOT NULL,
    price_per_day   NUMERIC(10, 2) NOT NULL,
    city            VARCHAR(50)    NOT NULL,
    status          VARCHAR(20)    NOT NULL,
    description     VARCHAR(2000),
    image_url       VARCHAR(500),
    created_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP,
    CONSTRAINT chk_cars_price CHECK (price_per_day > 0),
    CONSTRAINT chk_cars_seats CHECK (seats BETWEEN 2 AND 9),
    CONSTRAINT chk_cars_year CHECK (production_year BETWEEN 1990 AND 2100)
);

CREATE TABLE reservations (
    id                    BIGSERIAL PRIMARY KEY,
    user_id               BIGINT         NOT NULL REFERENCES users (id),
    car_id                BIGINT         NOT NULL REFERENCES cars (id),
    start_date            DATE           NOT NULL,
    end_date              DATE           NOT NULL,
    days_count            BIGINT         NOT NULL,
    price_per_day_snapshot NUMERIC(10, 2) NOT NULL,
    total_price           NUMERIC(12, 2) NOT NULL,
    status                VARCHAR(20)    NOT NULL,
    cancellation_reason   VARCHAR(255),
    created_at            TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP,
    CONSTRAINT chk_reservations_dates CHECK (end_date > start_date),
    CONSTRAINT chk_reservations_days CHECK (days_count > 0),
    CONSTRAINT chk_reservations_total CHECK (total_price >= 0)
);

CREATE INDEX idx_reservations_car_dates ON reservations (car_id, start_date, end_date);
CREATE INDEX idx_reservations_user ON reservations (user_id);
CREATE INDEX idx_reservations_status ON reservations (status);

CREATE TABLE reviews (
    id              BIGSERIAL PRIMARY KEY,
    reservation_id  BIGINT       NOT NULL UNIQUE REFERENCES reservations (id) ON DELETE CASCADE,
    rating          INTEGER      NOT NULL,
    comment_text    VARCHAR(1000) NOT NULL,
    status          VARCHAR(20)  NOT NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP,
    CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5)
);
