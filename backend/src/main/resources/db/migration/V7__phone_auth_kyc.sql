-- Телефонная авторизация (SMS) и KYC-верификация документов.

-- Статус KYC-верификации пользователя: NONE / PENDING / VERIFIED.
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(20) DEFAULT 'NONE';

-- Документы KYC: один документ на слот у пользователя (уникальность user_id + slot).
CREATE TABLE IF NOT EXISTS kyc_documents (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    slot VARCHAR(20) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_kyc_document_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uk_kyc_user_slot UNIQUE (user_id, slot)
);
