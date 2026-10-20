package kz.autorrent.dto.review;

import java.time.LocalDateTime;

public record ReviewResponse(
        Long id,
        Long reservationId,
        Long carId,
        String carBrand,
        String carModel,
        Long userId,
        String userFirstName,
        String userLastName,
        Integer rating,
        String comment,
        String status,
        LocalDateTime createdAt
) {
}
