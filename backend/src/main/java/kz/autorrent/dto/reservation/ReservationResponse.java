package kz.autorrent.dto.reservation;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ReservationResponse(
        Long id,
        Long userId,
        String userEmail,
        Long carId,
        String carBrand,
        String carModel,
        String carLicensePlate,
        String city,
        LocalDate startDate,
        LocalDate endDate,
        long daysCount,
        BigDecimal pricePerDay,
        BigDecimal totalPrice,
        String status,
        String cancellationReason,
        LocalDateTime createdAt
) {
}
