package kz.autorrent.dto.reservation;

import jakarta.validation.constraints.NotNull;
import kz.autorrent.entity.enums.ReservationStatus;

public record ReservationStatusRequest(@NotNull ReservationStatus status) {
}
