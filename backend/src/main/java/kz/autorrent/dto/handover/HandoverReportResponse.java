package kz.autorrent.dto.handover;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDateTime;
import java.util.List;

/** Акт приёма-передачи техники (шаг 8). */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record HandoverReportResponse(
        Long id,
        Long reservationId,
        String type,
        String fuelLevel,
        Integer mileage,
        String damagesNote,
        List<String> photos,
        LocalDateTime createdAt
) {
}
