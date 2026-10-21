package kz.autorrent.dto.vehicle;

import jakarta.validation.constraints.*;
import kz.autorrent.entity.enums.VehicleCategory;
import kz.autorrent.entity.enums.VehicleLicense;
import kz.autorrent.entity.enums.VehicleType;
import kz.autorrent.entity.enums.FuelType;
import kz.autorrent.entity.enums.Transmission;

import java.math.BigDecimal;

/**
 * Запрос на создание/обновление единицы техники.
 *
 * type, requiredLicense, seats опциональны: если не переданы — сервис выведет
 * их из категории (легковая → тип PASSENGER, права B, 5 мест и т.д.).
 * Это сохраняет совместимость со старыми запросами вида «{category: COMFORT}».
 */
public record VehicleRequest(
        @NotBlank @Size(max = 50) String brand,
        @NotBlank @Size(max = 50) String model,
        @NotNull @Min(1990) @Max(2100) Integer year,
        @NotBlank @Size(max = 20) String licensePlate,
        @NotNull VehicleCategory category,
        VehicleType type,
        @NotNull Transmission transmission,
        @NotNull FuelType fuelType,
        @Min(2) @Max(9) Integer seats,
        @DecimalMin(value = "0.01") @Digits(integer = 8, fraction = 2) BigDecimal capacity,
        VehicleLicense requiredLicense,
        Boolean withOperator,
        @DecimalMin(value = "0.01") @Digits(integer = 8, fraction = 2) BigDecimal operatorPricePerDay,
        @DecimalMin(value = "0.01") @Digits(integer = 8, fraction = 2) BigDecimal pricePerHour,
        @NotNull @DecimalMin(value = "0.01") @Digits(integer = 8, fraction = 2) BigDecimal pricePerDay,
        @NotBlank @Size(max = 50) String city,
        @Size(max = 2000) String description,
        @Size(max = 500) String imageUrl
) {
}
