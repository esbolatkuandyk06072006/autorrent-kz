package kz.autorrent.dto.auth;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Результат проверки SMS-кода:
 * registered=true — существующий пользователь, сразу выдан auth;
 * registered=false — новый пользователь, выдан signupToken для /signup.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record SmsVerifyResponse(
        Boolean registered,
        String signupToken,
        AuthResponse auth
) {
}
