package kz.autorrent.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Регистрация по телефону: имя, фамилия и обязательные согласия. */
public record SignupRequest(
        @NotBlank @Size(max = 50) String firstName,
        @NotBlank @Size(max = 50) String lastName,
        /** Согласие с пользовательским соглашением (обязательно true). */
        @NotNull Boolean agreedTerms,
        /** Согласие на обработку персональных данных (обязательно true). */
        @NotNull Boolean agreedData
) {
}
