package kz.autorrent.dto.car;

import jakarta.validation.constraints.NotNull;
import kz.autorrent.entity.enums.CarStatus;

public record CarStatusRequest(@NotNull CarStatus status) {
}
