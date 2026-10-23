package kz.autorrent.service;

import kz.autorrent.entity.Vehicle;
import kz.autorrent.exception.BadRequestException;
import kz.autorrent.service.pricing.PriceQuote;
import kz.autorrent.service.pricing.PricingResult;
import kz.autorrent.service.pricing.PricingStrategyResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Единая точка расчёта стоимости аренды:
 * - посуточно со скидками (10% с 7 дней, 20% с 30 дней);
 * - почасово (для техники с pricePerHour, без скидок);
 * - опция «с оператором»: суточная цена оператора × дни.
 *
 * Используется бронированием (BookingFacade, бизнес-заявки) и предпросмотром
 * цены на фронте (GET /api/v1/vehicles/{id}/price-quote).
 */
@Service
@RequiredArgsConstructor
public class PricingService {

    private final PricingStrategyResolver pricingStrategyResolver;

    public PriceQuote quote(Vehicle vehicle,
                            java.time.LocalDate startDate,
                            java.time.LocalDate endDate,
                            Integer hours,
                            Boolean withOperator) {
        boolean hourly = hours != null;
        boolean operatorRequested = Boolean.TRUE.equals(withOperator);

        if (hourly) {
            return hourlyQuote(vehicle, hours, operatorRequested);
        }
        return dailyQuote(vehicle, startDate, endDate, operatorRequested);
    }

    private PriceQuote dailyQuote(Vehicle vehicle,
                                  java.time.LocalDate startDate,
                                  java.time.LocalDate endDate,
                                  boolean operatorRequested) {
        long days = BookingRules.daysBetween(startDate, endDate);
        PricingResult pricing = pricingStrategyResolver.resolve(days)
                .calculate(vehicle.getPricePerDay(), days);

        BigDecimal discountAmount = pricing.basePrice().subtract(pricing.totalPrice());
        BigDecimal operatorTotal = BigDecimal.ZERO;
        BigDecimal operatorPricePerDay = null;

        if (operatorRequested) {
            if (!Boolean.TRUE.equals(vehicle.getWithOperator()) || vehicle.getOperatorPricePerDay() == null) {
                throw new BadRequestException("This vehicle cannot be rented with an operator");
            }
            operatorPricePerDay = vehicle.getOperatorPricePerDay().setScale(2, RoundingMode.HALF_UP);
            operatorTotal = operatorPricePerDay.multiply(BigDecimal.valueOf(days))
                    .setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal total = pricing.totalPrice().add(operatorTotal);
        return new PriceQuote(
                "DAY",
                pricing.days(),
                null,
                pricing.pricePerDay(),
                null,
                pricing.basePrice(),
                pricing.discountPercent(),
                discountAmount.setScale(2, RoundingMode.HALF_UP),
                operatorPricePerDay,
                operatorTotal.setScale(2, RoundingMode.HALF_UP),
                total.setScale(2, RoundingMode.HALF_UP)
        );
    }

    private PriceQuote hourlyQuote(Vehicle vehicle, Integer hours, boolean operatorRequested) {
        if (vehicle.getPricePerHour() == null) {
            throw new BadRequestException("Hourly rental is not available for this vehicle");
        }
        if (hours == null || hours < 1 || hours > 24) {
            throw new BadRequestException("hours must be between 1 and 24");
        }
        if (operatorRequested) {
            throw new BadRequestException("Hourly rental with an operator is not supported; choose a daily rental");
        }

        BigDecimal pricePerHour = vehicle.getPricePerHour().setScale(2, RoundingMode.HALF_UP);
        BigDecimal base = pricePerHour.multiply(BigDecimal.valueOf(hours))
                .setScale(2, RoundingMode.HALF_UP);

        return new PriceQuote(
                "HOUR",
                0,
                hours,
                null,
                pricePerHour,
                base,
                BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
                BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
                null,
                BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
                base
        );
    }
}
