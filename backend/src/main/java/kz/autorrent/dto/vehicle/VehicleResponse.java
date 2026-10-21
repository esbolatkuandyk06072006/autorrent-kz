package kz.autorrent.dto.vehicle;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record VehicleResponse(
        Long id,
        String brand,
        String model,
        Integer year,
        String licensePlate,
        String type,
        String category,
        String transmission,
        String fuelType,
        Integer seats,
        BigDecimal capacity,
        String requiredLicense,
        Boolean withOperator,
        BigDecimal operatorPricePerDay,
        BigDecimal pricePerHour,
        BigDecimal pricePerDay,
        String city,
        String status,
        String description,
        String imageUrl,
        Double averageRating,
        Long reviewCount
) {
}
