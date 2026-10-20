package kz.autorrent.dto.car;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record CarResponse(
        Long id,
        String brand,
        String model,
        Integer year,
        String licensePlate,
        String category,
        String transmission,
        String fuelType,
        Integer seats,
        BigDecimal pricePerDay,
        String city,
        String status,
        String description,
        String imageUrl,
        Double averageRating,
        Long reviewCount
) {
}
