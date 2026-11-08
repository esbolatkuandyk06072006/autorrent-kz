package kz.autorrent.dto.auth;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Ответ на запрос SMS-кода: срок жизни кода, через сколько можно запросить
 * повторно и devCode (только в dev-режиме, иначе null).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record SmsSendResponse(
        String phone,
        long expiresInSeconds,
        long resendAfterSeconds,
        String devCode
) {
}
