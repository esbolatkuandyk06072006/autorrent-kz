package kz.autorrent.dto.review;

import jakarta.validation.constraints.NotNull;
import kz.autorrent.entity.enums.ReviewStatus;

public record ReviewVisibilityRequest(@NotNull ReviewStatus status) {
}
