package kz.autorrent.service.pricing;

import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Component
@Order(1)
public class StandardPricingStrategy implements PricingStrategy {

    @Override
    public boolean supports(long days) {
        return days < 7;
    }

    @Override
    public PricingResult calculate(BigDecimal pricePerDay, long days) {
        BigDecimal basePrice = pricePerDay.multiply(BigDecimal.valueOf(days))
                .setScale(2, RoundingMode.HALF_UP);
        return new PricingResult(
                pricePerDay.setScale(2, RoundingMode.HALF_UP),
                days,
                basePrice,
                BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
                basePrice
        );
    }
}
