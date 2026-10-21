package kz.autorrent.dto.vehicle;

import kz.autorrent.entity.enums.VehicleStatus;
import jakarta.validation.constraints.NotNull;

public record VehicleStatusRequest(@NotNull VehicleStatus status) {
}
