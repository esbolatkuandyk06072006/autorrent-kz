package kz.autorrent.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.time.temporal.ChronoUnit;

public class DateRangeValidator implements ConstraintValidator<ValidDateRange, DateRange> {

    /** Совпадает с BookingRules.MAX_RENTAL_DAYS (90 дней). */
    private static final long MAX_RENTAL_DAYS = 90;

    @Override
    public boolean isValid(DateRange value, ConstraintValidatorContext context) {
        if (value == null || value.startDate() == null) {
            return true;
        }
        // Почасовая аренда: техника занята один день, endDate не обязателен
        // (фронт шлёт только startDate + hours).
        if (value.hours() != null) {
            return value.hours() >= 1 && value.hours() <= 24
                    && (value.endDate() == null || !value.endDate().isBefore(value.startDate()));
        }
        if (value.endDate() == null) {
            return true;
        }
        if (!value.endDate().isAfter(value.startDate())) {
            return false;
        }
        long days = ChronoUnit.DAYS.between(value.startDate(), value.endDate());
        return days >= 1 && days <= MAX_RENTAL_DAYS;
    }
}
