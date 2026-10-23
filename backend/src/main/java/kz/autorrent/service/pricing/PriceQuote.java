package kz.autorrent.service.pricing;

import java.math.BigDecimal;

/**
 * Итоговый расчёт аренды для одной единицы техники.
 *
 * rentalUnit: DAY (суточная) или HOUR (почасовая, для техники с pricePerHour).
 * discountAmount = basePrice - totalPrice без учёта оператора.
 * operatorTotal = operatorPricePerDay * days (суточный режим с оператором).
 * totalPrice = (basePrice - discountAmount) + operatorTotal.
 */
public record PriceQuote(
        String rentalUnit,
        long days,
        Integer hours,
        BigDecimal pricePerDay,
        BigDecimal pricePerHour,
        BigDecimal basePrice,
        BigDecimal discountPercent,
        BigDecimal discountAmount,
        BigDecimal operatorPricePerDay,
        BigDecimal operatorTotal,
        BigDecimal totalPrice
) {
}
