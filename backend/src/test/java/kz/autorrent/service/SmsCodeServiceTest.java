package kz.autorrent.service;

import kz.autorrent.dto.auth.SmsSendResponse;
import kz.autorrent.exception.BadRequestException;
import kz.autorrent.util.PhoneUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Тесты SMS-кодов: чистый JUnit5 без Spring — SmsCodeService самодостаточен.
 */
class SmsCodeServiceTest {

    private static final String PHONE = "87001234567";
    private static final String NORMALIZED_PHONE = "+77001234567";

    private SmsCodeService smsCodeService;

    @BeforeEach
    void setUp() {
        smsCodeService = new SmsCodeService(true);
    }

    @Test
    void requestCodeReturnsSixDigitCode() {
        SmsSendResponse response = smsCodeService.requestCode(PHONE);

        assertThat(response.phone()).isEqualTo(NORMALIZED_PHONE);
        // В dev-режиме код возвращается в devCode — 6 цифр.
        assertThat(response.devCode()).isNotNull().matches("\\d{6}");
        assertThat(response.expiresInSeconds()).isEqualTo(300);
        assertThat(response.resendAfterSeconds()).isEqualTo(60);
    }

    @Test
    void devCodeHiddenWhenDevModeDisabled() {
        SmsCodeService productionLikeService = new SmsCodeService(false);

        assertThat(productionLikeService.requestCode(PHONE).devCode()).isNull();
    }

    @Test
    void repeatedRequestTooSoonRejected() {
        smsCodeService.requestCode(PHONE);

        assertThatThrownBy(() -> smsCodeService.requestCode(PHONE))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Запросите код повторно через");
    }

    @Test
    void verifyCodeSuccessAndReuseRejected() {
        SmsSendResponse response = smsCodeService.requestCode(PHONE);

        assertThat(smsCodeService.verifyCode(PHONE, response.devCode())).isTrue();
        // Телефон подтверждён после успешной проверки.
        assertThat(smsCodeService.isPhoneVerified(PHONE)).isTrue();
        // Код одноразовый: повторная проверка тем же кодом — ошибка.
        assertThatThrownBy(() -> smsCodeService.verifyCode(PHONE, response.devCode()))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Код истёк или не запрошен");
    }

    @Test
    void tooManyAttemptsInvalidatesCode() {
        SmsSendResponse response = smsCodeService.requestCode(PHONE);
        assertThat(response.devCode()).isNotNull();

        // Пять неверных попыток — просто false.
        for (int attempt = 1; attempt <= 5; attempt++) {
            assertThat(smsCodeService.verifyCode(PHONE, "000000")).isFalse();
        }
        // Шестая — код сгорает.
        assertThatThrownBy(() -> smsCodeService.verifyCode(PHONE, "000000"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Слишком много попыток");
        // После сгорания — «код истёк или не запрошен».
        assertThatThrownBy(() -> smsCodeService.verifyCode(PHONE, "000000"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Код истёк или не запрошен");
    }

    @Test
    void invalidPhoneRejected() {
        assertThatThrownBy(() -> smsCodeService.requestCode("12345"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Неверный формат телефона");
        assertThatThrownBy(() -> smsCodeService.verifyCode("abc", "123456"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Неверный формат телефона");
        assertThatThrownBy(() -> smsCodeService.isPhoneVerified(null))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Неверный формат телефона");
    }

    @Test
    void phoneIsNormalizedToCanonicalFormat() {
        // Разные варианты ввода → один формат хранения +7XXXXXXXXXX.
        assertThat(PhoneUtil.normalize("87001234567")).isEqualTo(NORMALIZED_PHONE);
        assertThat(PhoneUtil.normalize("77001234567")).isEqualTo(NORMALIZED_PHONE);
        assertThat(PhoneUtil.normalize("+77001234567")).isEqualTo(NORMALIZED_PHONE);
        assertThat(PhoneUtil.normalize("+7 700 123 45 67")).isEqualTo(NORMALIZED_PHONE);
        assertThat(PhoneUtil.normalize("8 (700) 123-45-67")).isEqualTo(NORMALIZED_PHONE);
        assertThat(PhoneUtil.normalize("+7 (700) 123-45-67")).isEqualTo(NORMALIZED_PHONE);

        // Нормализация применяется и при запросе кода.
        SmsSendResponse response = smsCodeService.requestCode("+7 701 555 66 77");
        assertThat(response.phone()).isEqualTo("+77015556677");
    }
}
