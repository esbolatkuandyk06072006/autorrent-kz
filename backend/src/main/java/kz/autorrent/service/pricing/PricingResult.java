package kz.autorrent.service.pricing;

import java.math.BigDecimal;

public record PricingResult(
        BigDecimal pricePerDay,
        long days,
        BigDecimal basePrice,
        BigDecimal discountPercent,
        BigDecimal totalPrice
) {
}
