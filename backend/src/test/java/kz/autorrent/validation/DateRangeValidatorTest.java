package kz.autorrent.validation;

import kz.autorrent.dto.reservation.ReservationRequest;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * @ValidDateRange: суточная аренда требует конца после начала и лимита 90 дней,
 * почасовая допускает отсутствие endDate (фронт шлёт только startDate + hours).
 */
class DateRangeValidatorTest {

    private final DateRangeValidator validator = new DateRangeValidator();

    private static final LocalDate START = LocalDate.of(2030, 6, 1);

    private boolean isValid(LocalDate start, LocalDate end, Integer hours) {
        return validator.isValid(new ReservationRequest(1L, start, end, hours, null), null);
    }

    @Test
    void dailyRangeIsValid() {
        assertThat(isValid(START, START.plusDays(5), null)).isTrue();
    }

    @Test
    void dailyRangeDefersMissingEndDateToServiceRules() {
        // Валидатор пропускает null endDate, отсутствие конца суточной аренды
        // ловит BookingRules.validateDates (BadRequest "startDate and endDate are required").
        assertThat(isValid(START, null, null)).isTrue();
    }

    @Test
    void dailyRangeRejectsEqualOrInvertedDates() {
        assertThat(isValid(START, START, null)).isFalse();
        assertThat(isValid(START, START.minusDays(1), null)).isFalse();
    }

    @Test
    void dailyRangeRejectsMoreThanNinetyDays() {
        assertThat(isValid(START, START.plusDays(91), null)).isFalse();
        assertThat(isValid(START, START.plusDays(90), null)).isTrue();
    }

    @Test
    void hourlyRangeAllowsMissingEndDate() {
        assertThat(isValid(START, null, 5)).isTrue();
    }

    @Test
    void hourlyRangeRejectsInvalidHours() {
        assertThat(isValid(START, null, 0)).isFalse();
        assertThat(isValid(START, null, 25)).isFalse();
    }

    @Test
    void hourlyRangeRejectsEndDateBeforeStart() {
        assertThat(isValid(START, START.minusDays(1), 4)).isFalse();
        assertThat(isValid(START, START.plusDays(1), 4)).isTrue();
    }

    @Test
    void nullStartIsValidForOtherValidators() {
        assertThat(validator.isValid(new ReservationRequest(1L, null, null, null, null), null)).isTrue();
    }
}
