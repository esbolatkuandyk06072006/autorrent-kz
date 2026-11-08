package kz.autorrent.service;

import kz.autorrent.exception.BadRequestException;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Правила бронирования: валидация дат (не в прошлом, лимит 90 дней),
 * почасовые часы 1..24, нормализация причины отмены.
 */
class BookingRulesTest {

    @Test
    void acceptsValidRange() {
        LocalDate today = LocalDate.now();
        assertThatNoException(() -> BookingRules.validateDates(today, today.plusDays(1)));
        assertThatNoException(() -> BookingRules.validateDates(today, today.plusDays(90)));
    }

    private static void assertThatNoException(Runnable action) {
        org.assertj.core.api.Assertions.assertThatCode(action::run).doesNotThrowAnyException();
    }

    @Test
    void rejectsMissingDates() {
        LocalDate today = LocalDate.now();
        assertThatThrownBy(() -> BookingRules.validateDates(null, today.plusDays(1)))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> BookingRules.validateDates(today, null))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void rejectsEndBeforeOrEqualStart() {
        LocalDate today = LocalDate.now();
        assertThatThrownBy(() -> BookingRules.validateDates(today, today))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("after startDate");
        assertThatThrownBy(() -> BookingRules.validateDates(today, today.minusDays(1)))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void rejectsPastStartDate() {
        LocalDate past = LocalDate.now().minusDays(1);
        assertThatThrownBy(() -> BookingRules.validateDates(past, past.plusDays(3)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("past");
    }

    @Test
    void rejectsRangeOverNinetyDays() {
        LocalDate today = LocalDate.now();
        assertThatThrownBy(() -> BookingRules.validateDates(today, today.plusDays(91)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("90");
    }

    @Test
    void validatesHours() {
        assertThat(BookingRules.daysBetween(LocalDate.of(2030, 1, 1), LocalDate.of(2030, 1, 8)))
                .isEqualTo(7);

        org.assertj.core.api.Assertions.assertThatCode(() -> BookingRules.validateHours(1))
                .doesNotThrowAnyException();
        org.assertj.core.api.Assertions.assertThatCode(() -> BookingRules.validateHours(24))
                .doesNotThrowAnyException();

        assertThatThrownBy(() -> BookingRules.validateHours(null))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> BookingRules.validateHours(0))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> BookingRules.validateHours(25))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void normalizesCancellationReason() {
        assertThat(BookingRules.normalizeCancellationReason(null)).isNull();
        assertThat(BookingRules.normalizeCancellationReason("  Планы изменились  "))
                .isEqualTo("Планы изменились");
        assertThat(BookingRules.normalizeCancellationReason("x".repeat(300))).hasSize(255);
    }
}
