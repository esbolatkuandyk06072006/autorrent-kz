package kz.autorrent.dto.vehicle;

import jakarta.validation.constraints.*;
import kz.autorrent.entity.enums.VehicleCategory;
import kz.autorrent.entity.enums.VehicleLicense;
import kz.autorrent.entity.enums.VehicleType;
import kz.autorrent.entity.enums.FuelType;
import kz.autorrent.entity.enums.Transmission;

import java.math.BigDecimal;
import java.util.List;

/**
 * Запрос на создание/обновление единицы техники.
 *
 * type, requiredLicense, seats опциональны: если не переданы — сервис выведет
 * их из категории (легковая → тип PASSENGER, права B, 5 мест и т.д.).
 * Это сохраняет совместимость со старыми запросами вида «{category: COMFORT}».
 *
 * images — галерея фотографий (пути /images/vehicles/{id}/N.jpg); первая — главное фото.
 * imageUrl сохранён для обратной совместимости: если images пуст, но imageUrl задан,
 * сервис превратит его в images[0].
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
        @Size(max = 500) String imageUrl,
        @Size(max = 12) List<@Size(max = 500) String> images,
        /** Теги умных подборок: construction, wedding, mountains, city, longtrip, family. */
        @Size(max = 10) List<@Size(max = 30) String> tags,
        // --- Шаг 7: локатор точки выдачи (все поля опциональны) ---
        @Size(max = 200) String pickupAddress,
        @DecimalMin(value = "-90.0") @DecimalMax(value = "90.0") Double latitude,
        @DecimalMin(value = "-180.0") @DecimalMax(value = "180.0") Double longitude,
        @Size(max = 300) String pickupInstructions
) {
}
