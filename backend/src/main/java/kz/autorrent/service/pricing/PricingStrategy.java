package kz.autorrent.service.pricing;

import java.math.BigDecimal;

public interface PricingStrategy {

    boolean supports(long days);

    PricingResult calculate(BigDecimal pricePerDay, long days);
}
