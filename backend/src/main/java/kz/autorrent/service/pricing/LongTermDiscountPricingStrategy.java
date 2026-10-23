package kz.autorrent.service.pricing;

import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Долгосрочная аренда от 7 до 29 дней: скидка 10%.
 * 30+ дней обрабатывает {@link ExtendedDiscountPricingStrategy} (скидка 20%).
 */
@Component
@Order(2)
public class LongTermDiscountPricingStrategy implements PricingStrategy {

    private static final BigDecimal DISCOUNT = new BigDecimal("0.10");
    private static final BigDecimal MULTIPLIER = BigDecimal.ONE.subtract(DISCOUNT);

    @Override
    public boolean supports(long days) {
        return days >= 7 && days < 30;
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
                new BigDecimal("10.00"),
                totalPrice
        );
    }
}
