package kz.autorrent.service;

import kz.autorrent.service.pricing.ExtendedDiscountPricingStrategy;
import kz.autorrent.service.pricing.LongTermDiscountPricingStrategy;
import kz.autorrent.service.pricing.PricingResult;
import kz.autorrent.service.pricing.StandardPricingStrategy;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class PricingStrategyTest {

    private final StandardPricingStrategy standard = new StandardPricingStrategy();
    private final LongTermDiscountPricingStrategy longTerm = new LongTermDiscountPricingStrategy();
    private final ExtendedDiscountPricingStrategy extended = new ExtendedDiscountPricingStrategy();

    @Test
    void standardPricingForShortRental() {
        PricingResult result = standard.calculate(new BigDecimal("20000.00"), 4);

        assertThat(result.days()).isEqualTo(4);
        assertThat(result.basePrice()).isEqualByComparingTo("80000.00");
        assertThat(result.totalPrice()).isEqualByComparingTo("80000.00");
        assertThat(result.discountPercent()).isEqualByComparingTo("0.00");
    }

    @Test
    void longTermPricingAppliesTenPercentDiscount() {
        PricingResult result = longTerm.calculate(new BigDecimal("20000.00"), 7);

        assertThat(result.basePrice()).isEqualByComparingTo("140000.00");
        assertThat(result.totalPrice()).isEqualByComparingTo("126000.00");
        assertThat(result.discountPercent()).isEqualByComparingTo("10.00");
    }

    @Test
    void extendedPricingAppliesTwentyPercentDiscount() {
        PricingResult result = extended.calculate(new BigDecimal("20000.00"), 30);

        assertThat(result.basePrice()).isEqualByComparingTo("600000.00");
        assertThat(result.totalPrice()).isEqualByComparingTo("480000.00");
        assertThat(result.discountPercent()).isEqualByComparingTo("20.00");
    }

    @Test
    void strategiesSupportExpectedRanges() {
        assertThat(standard.supports(1)).isTrue();
        assertThat(standard.supports(6)).isTrue();
        assertThat(standard.supports(7)).isFalse();

        assertThat(longTerm.supports(6)).isFalse();
        assertThat(longTerm.supports(7)).isTrue();
        assertThat(longTerm.supports(29)).isTrue();
        // 30+ дней обрабатывает ExtendedDiscountPricingStrategy (скидка 20%).
        assertThat(longTerm.supports(30)).isFalse();

        assertThat(extended.supports(29)).isFalse();
        assertThat(extended.supports(30)).isTrue();
        assertThat(extended.supports(90)).isTrue();
    }
}
