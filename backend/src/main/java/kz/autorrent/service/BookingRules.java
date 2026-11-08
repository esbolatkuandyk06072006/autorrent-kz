package kz.autorrent.service;

import kz.autorrent.entity.enums.ReservationStatus;
import kz.autorrent.exception.BadRequestException;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.security.SecureRandom;

public final class BookingRules {

    /** Максимальный срок аренды: 90 дней (скидка 20% действует с 30 дней). */
    public static final long MAX_RENTAL_DAYS = 90;

    /** Статусы, при которых техника считается занятой. */
    public static final List<ReservationStatus> ACTIVE_STATUSES =
            List.of(ReservationStatus.PENDING, ReservationStatus.CONFIRMED, ReservationStatus.ACTIVE);

    /** Генератор кода от ключа (шаг 8): 4 цифры, ведущие нули сохраняются. */
    private static final SecureRandom RANDOM = new SecureRandom();

    private BookingRules() {
    }

    /** Код от ключа к подтверждённой брони: ровно 4 цифры, например «0417». */
    public static String generateKeyCode() {
        return String.format("%04d", RANDOM.nextInt(10_000));
    }

    /** Валидация дат суточной аренды: не в прошлом, конец позже начала, лимит срока. */
    public static void validateDates(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            throw new BadRequestException("startDate and endDate are required");
        }
        if (!endDate.isAfter(startDate)) {
            throw new BadRequestException("endDate must be after startDate");
        }
        long days = ChronoUnit.DAYS.between(startDate, endDate);
        if (days > MAX_RENTAL_DAYS) {
            throw new BadRequestException("Rental period cannot exceed " + MAX_RENTAL_DAYS + " days");
        }
        if (startDate.isBefore(LocalDate.now())) {
            throw new BadRequestException("startDate cannot be in the past");
        }
    }

    /** Валидация параметров почасовой аренды. */
    public static void validateHours(Integer hours) {
        if (hours == null || hours < 1 || hours > 24) {
            throw new BadRequestException("hours must be between 1 and 24");
        }
    }

    public static long daysBetween(LocalDate startDate, LocalDate endDate) {
        return ChronoUnit.DAYS.between(startDate, endDate);
    }

    public static String normalizeCancellationReason(String reason) {
        if (reason == null) {
            return null;
        }
        String trimmed = reason.trim();
        return trimmed.length() > 255 ? trimmed.substring(0, 255) : trimmed;
    }
}
