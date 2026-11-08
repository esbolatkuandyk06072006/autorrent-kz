package kz.autorrent.dto.auth;

import jakarta.validation.constraints.NotBlank;

/** Проверка полученного SMS-кода. */
public record SmsVerifyRequest(
        @NotBlank String phone,
        @NotBlank String code
) {
}
