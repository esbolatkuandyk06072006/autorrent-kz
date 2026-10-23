package kz.autorrent.entity.enums;

/**
 * Жизненный цикл брони:
 * PENDING (ожидает) → CONFIRMED (подтверждена) → ACTIVE (активна) → COMPLETED (завершена).
 * На любых активных этапах возможен переход в CANCELLED (отменена).
 */
public enum ReservationStatus {
    PENDING,
    CONFIRMED,
    ACTIVE,
    COMPLETED,
    CANCELLED
}
