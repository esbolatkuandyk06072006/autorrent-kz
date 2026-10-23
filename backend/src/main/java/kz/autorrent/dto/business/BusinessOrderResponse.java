package kz.autorrent.dto.business;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Ответ по бизнес-заявке (счёт на юрлицо): реквизиты компании, итог и
 * список позиций (обычные брони со ссылкой на заказ).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record BusinessOrderResponse(
        Long id,
        String companyName,
        String bin,
        Long userId,
        String userEmail,
        BigDecimal totalPrice,
        String status,
        List<ReservationSummary> items,
        LocalDateTime createdAt
) {
    /**
     * Краткая сводка по позиции заявки: хватает для счёта и списка в личном
     * кабинете. Полная бронь доступна через GET /reservations/{id}.
     */
    public record ReservationSummary(
            Long id,
            Long carId,
            String carBrand,
            String carModel,
            String carLicensePlate,
            String city,
            LocalDate startDate,
            LocalDate endDate,
            long daysCount,
            Integer hours,
            Boolean withOperator,
            BigDecimal pricePerDay,
            BigDecimal totalPrice,
            String status,
            BigDecimal discountPercent
    ) {
    }
}
