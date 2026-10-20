package kz.autorrent.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.time.temporal.ChronoUnit;

public class DateRangeValidator implements ConstraintValidator<ValidDateRange, DateRange> {

    private static final long MAX_RENTAL_DAYS = 30;

    @Override
    public boolean isValid(DateRange value, ConstraintValidatorContext context) {
        if (value == null || value.startDate() == null || value.endDate() == null) {
            return true;
        }
        if (!value.endDate().isAfter(value.startDate())) {
            return false;
        }
        long days = ChronoUnit.DAYS.between(value.startDate(), value.endDate());
        return days >= 1 && days <= MAX_RENTAL_DAYS;
    }
}
