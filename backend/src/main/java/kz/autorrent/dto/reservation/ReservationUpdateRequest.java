package kz.autorrent.dto.reservation;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotNull;
import kz.autorrent.validation.DateRange;
import kz.autorrent.validation.ValidDateRange;

import java.time.LocalDate;

@ValidDateRange
public record ReservationUpdateRequest(
        @NotNull @FutureOrPresent LocalDate startDate,
        @NotNull @Future LocalDate endDate
) implements DateRange {
}
