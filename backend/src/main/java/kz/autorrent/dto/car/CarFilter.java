package kz.autorrent.dto.car;

import kz.autorrent.entity.enums.CarCategory;

import java.math.BigDecimal;

public record CarFilter(
        String brand,
        String city,
        CarCategory category,
        BigDecimal maxPrice
) {
    public static CarFilter of(String brand, String city, CarCategory category, BigDecimal maxPrice) {
        return new CarFilter(blankToNull(brand), blankToNull(city), category, maxPrice);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
