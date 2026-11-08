package kz.autorrent.service;

import kz.autorrent.entity.Vehicle;
import kz.autorrent.exception.BadRequestException;
import kz.autorrent.service.pricing.PriceQuote;
import kz.autorrent.service.pricing.PricingStrategyResolver;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Расчёт стоимости: суточно со скидками (10% с 7 дней, 20% с 30),
 * почасово, опция «с оператором» и её ограничения.
 */
class PricingServiceTest {

    private final PricingService service = new PricingService(
            new PricingStrategyResolver(List.of(
                    new kz.autorrent.service.pricing.StandardPricingStrategy(),
                    new kz.autorrent.service.pricing.LongTermDiscountPricingStrategy(),
                    new kz.autorrent.service.pricing.ExtendedDiscountPricingStrategy())));

    private static final LocalDate START = LocalDate.of(2030, 6, 1);

    private Vehicle car() {
        return Vehicle.builder()
                .brand("Toyota").model("Camry")
                .pricePerDay(new BigDecimal("20000.00"))
                .build();
    }

    private Vehicle crane() {
        return Vehicle.builder()
                .brand("Kobelco").model("CK210")
                .pricePerDay(new BigDecimal("120000.00"))
                .pricePerHour(new BigDecimal("8000.00"))
                .withOperator(true)
                .operatorPricePerDay(new BigDecimal("30000.00"))
                .build();
    }

    @Test
    void dailyRentalWithoutDiscount() {
        PriceQuote quote = service.quote(car(), START, START.plusDays(4), null, null);

        assertThat(quote.rentalUnit()).isEqualTo("DAY");
        assertThat(quote.days()).isEqualTo(4);
        assertThat(quote.basePrice()).isEqualByComparingTo("80000.00");
        assertThat(quote.discountPercent()).isEqualByComparingTo("0.00");
        assertThat(quote.totalPrice()).isEqualByComparingTo("80000.00");
    }

    @Test
    void dailyRentalWithTenPercentDiscount() {
        PriceQuote quote = service.quote(car(), START, START.plusDays(7), null, null);

        assertThat(quote.discountPercent()).isEqualByComparingTo("10.00");
        assertThat(quote.discountAmount()).isEqualByComparingTo("14000.00");
        assertThat(quote.totalPrice()).isEqualByComparingTo("126000.00");
    }

    @Test
    void dailyRentalWithTwentyPercentDiscount() {
        PriceQuote quote = service.quote(car(), START, START.plusDays(30), null, null);

        assertThat(quote.discountPercent()).isEqualByComparingTo("20.00");
        assertThat(quote.totalPrice()).isEqualByComparingTo("480000.00");
    }

    @Test
    void operatorAddsDailyRateToTotal() {
        PriceQuote quote = service.quote(crane(), START, START.plusDays(3), null, true);

        assertThat(quote.operatorPricePerDay()).isEqualByComparingTo("30000.00");
        assertThat(quote.operatorTotal()).isEqualByComparingTo("90000.00");
        // 120000 × 3 дня + 30000 × 3 дня оператора
        assertThat(quote.totalPrice()).isEqualByComparingTo("450000.00");
    }

    @Test
    void operatorNotAllowedForVehicleWithoutOperator() {
        assertThatThrownBy(() -> service.quote(car(), START, START.plusDays(2), null, true))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("operator");
    }

    @Test
    void hourlyRentalMultipliesHoursByRate() {
        PriceQuote quote = service.quote(crane(), START, null, 5, null);

        assertThat(quote.rentalUnit()).isEqualTo("HOUR");
        assertThat(quote.hours()).isEqualTo(5);
        assertThat(quote.days()).isZero();
        assertThat(quote.discountPercent()).isEqualByComparingTo("0.00");
        assertThat(quote.totalPrice()).isEqualByComparingTo("40000.00");
    }

    @Test
    void hourlyRentalRejectedWithoutHourlyRate() {
        assertThatThrownBy(() -> service.quote(car(), START, null, 4, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Hourly rental");
    }

    @Test
    void hourlyRentalWithOperatorRejected() {
        assertThatThrownBy(() -> service.quote(crane(), START, null, 4, true))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("daily rental");
    }

    @Test
    void hourlyRentalValidatesHoursRange() {
        assertThatThrownBy(() -> service.quote(crane(), START, null, 0, null))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.quote(crane(), START, null, 25, null))
                .isInstanceOf(BadRequestException.class);
    }
}
