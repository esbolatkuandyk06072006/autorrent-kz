package kz.autorrent.dto.reservation;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import kz.autorrent.validation.DateRange;
import kz.autorrent.validation.ValidDateRange;

import java.time.LocalDate;

/**
 * Запрос на бронирование.
 *
 * Суточный режим: startDate < endDate, опционально withOperator (с оператором).
 * Почасовой режим (спецтехника): hours = 1..24, endDate = startDate.
 */
@ValidDateRange
public record ReservationRequest(
        @NotNull Long carId,
        @NotNull @FutureOrPresent LocalDate startDate,
        /** Обязателен для суточной аренды; для почасовой (hours != null) — не указывается. */
        @FutureOrPresent LocalDate endDate,
        @Min(1) @Max(24) Integer hours,
        Boolean withOperator
) implements DateRange {

    /** Совместимость со старыми запросами: три поля без часов/оператора. */
    public ReservationRequest(Long carId, LocalDate startDate, LocalDate endDate) {
        this(carId, startDate, endDate, null, null);
    }
}
