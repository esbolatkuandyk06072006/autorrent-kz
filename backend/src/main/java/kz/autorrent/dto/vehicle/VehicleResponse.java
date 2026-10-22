package kz.autorrent.dto.vehicle;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;
import java.util.List;

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
        List<String> images,
        Double averageRating,
        Long reviewCount
) {
}
