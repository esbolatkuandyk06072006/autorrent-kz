package kz.autorrent.dto.car;

import jakarta.validation.constraints.*;
import kz.autorrent.entity.enums.CarCategory;
import kz.autorrent.entity.enums.FuelType;
import kz.autorrent.entity.enums.Transmission;

import java.math.BigDecimal;

public record CarRequest(
        @NotBlank @Size(max = 50) String brand,
        @NotBlank @Size(max = 50) String model,
        @NotNull @Min(1990) @Max(2100) Integer year,
        @NotBlank @Size(max = 20) String licensePlate,
        @NotNull CarCategory category,
        @NotNull Transmission transmission,
        @NotNull FuelType fuelType,
        @NotNull @Min(2) @Max(9) Integer seats,
        @NotNull @DecimalMin(value = "0.01") @Digits(integer = 8, fraction = 2) BigDecimal pricePerDay,
        @NotBlank @Size(max = 50) String city,
        @Size(max = 2000) String description,
        @Size(max = 500) String imageUrl
) {
}
