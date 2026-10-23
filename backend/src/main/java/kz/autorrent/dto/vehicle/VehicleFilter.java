package kz.autorrent.dto.vehicle;

import kz.autorrent.entity.enums.VehicleCategory;
import kz.autorrent.entity.enums.VehicleType;

import java.math.BigDecimal;

/**
 * Фильтр каталога: сначала группа (type), затем подкатегория (category)
 * и поля, зависящие от группы (maxCapacity — тонны, withOperator).
 * tag — тег умной подборки (construction, wedding, mountains…).
 */
public record VehicleFilter(
        String brand,
        String city,
        VehicleType type,
        VehicleCategory category,
        BigDecimal maxPrice,
        BigDecimal maxCapacity,
        Boolean withOperator,
        String tag
) {
    public static VehicleFilter of(String brand, String city, VehicleType type, VehicleCategory category,
                                   BigDecimal maxPrice, BigDecimal maxCapacity, Boolean withOperator,
                                   String tag) {
        return new VehicleFilter(blankToNull(brand), blankToNull(city), type, category,
                maxPrice, maxCapacity, withOperator, blankToNull(tag));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
