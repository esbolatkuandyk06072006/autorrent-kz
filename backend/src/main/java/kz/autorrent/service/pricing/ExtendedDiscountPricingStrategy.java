package kz.autorrent.service.pricing;

import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Очень долгосрочная аренда от 30 дней: скидка 20%.
 * Проверяется первой, поэтому перекрывает 10% скидку от 7 дней.
 */
@Component
@Order(0)
public class ExtendedDiscountPricingStrategy implements PricingStrategy {

    private static final BigDecimal DISCOUNT = new BigDecimal("0.20");
    private static final BigDecimal MULTIPLIER = BigDecimal.ONE.subtract(DISCOUNT);

    @Override
    public boolean supports(long days) {
        return days >= 30;
    }

    @Override
    public PricingResult calculate(BigDecimal pricePerDay, long days) {
        BigDecimal basePrice = pricePerDay.multiply(BigDecimal.valueOf(days))
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalPrice = basePrice.multiply(MULTIPLIER)
                .setScale(2, RoundingMode.HALF_UP);
        return new PricingResult(
                pricePerDay.setScale(2, RoundingMode.HALF_UP),
                days,
                basePrice,
                new BigDecimal("20.00"),
                totalPrice
        );
    }
}
