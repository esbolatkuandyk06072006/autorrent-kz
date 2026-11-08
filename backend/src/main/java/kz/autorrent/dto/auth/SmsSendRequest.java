package kz.autorrent.dto.auth;

import jakarta.validation.constraints.NotBlank;

/** Запрос SMS-кода подтверждения телефона. */
public record SmsSendRequest(
        @NotBlank String phone
) {
}
