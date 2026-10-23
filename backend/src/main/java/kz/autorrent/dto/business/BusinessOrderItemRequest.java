package kz.autorrent.dto.business;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

/**
 * Позиция бизнес-заявки: одна единица техники на выбранные даты
 * (или часы — для почасовой аренды спецтехники).
 */
public record BusinessOrderItemRequest(
        @NotNull Long carId,
        @NotNull LocalDate startDate,
        LocalDate endDate,
        Integer hours,
        Boolean withOperator
) {
}
