package kz.autorrent.service;

import kz.autorrent.entity.enums.ReservationStatus;
import kz.autorrent.exception.BadRequestException;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

public final class BookingRules {

    public static final long MAX_RENTAL_DAYS = 30;
    public static final List<ReservationStatus> ACTIVE_STATUSES =
            List.of(ReservationStatus.PENDING, ReservationStatus.CONFIRMED);

    private BookingRules() {
    }

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
