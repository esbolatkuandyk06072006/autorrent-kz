package kz.autorrent.service;

import kz.autorrent.dto.auth.SmsSendResponse;
import kz.autorrent.exception.BadRequestException;
import kz.autorrent.util.PhoneUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Телефонная (SMS) авторизация: генерация и проверка одноразовых кодов.
 *
 * Состояние in-memory (без БД):
 * - коды (6 цифр, живут 5 минут, максимум 5 попыток ввода);
 * - время последнего запроса кода (защита от спама, интервал 60 секунд);
 * - подтверждённые телефоны (TTL 15 минут после успешной проверки) —
 *   без проверки кода зарегистрироваться нельзя.
 *
 * В dev-режиме (app.sms.dev-mode) код возвращается в devCode ответа.
 */
@Service
@Slf4j
public class SmsCodeService {

    /** Срок жизни SMS-кода — 5 минут. */
    private static final long CODE_TTL_MS = 5 * 60 * 1000;

    /** Минимальный интервал между запросами кода — 60 секунд. */
    private static final long RESEND_INTERVAL_MS = 60 * 1000;

    /** Максимум неверных попыток ввода кода. */
    private static final int MAX_ATTEMPTS = 5;

    /** Срок жизни подтверждённого телефона — 15 минут (для регистрации). */
    private static final long VERIFIED_TTL_MS = 15 * 60 * 1000;

    private static final SecureRandom RANDOM = new SecureRandom();

    /** Коды по телефону: код, срок истечения, счётчик попыток. */
    private final Map<String, SmsEntry> codes = new ConcurrentHashMap<>();

    /** Когда запрашивался последний код (защита от спам-запросов). */
    private final Map<String, Long> lastRequestAt = new ConcurrentHashMap<>();

    /** Когда телефон был подтверждён (TTL 15 минут). */
    private final Map<String, Long> verifiedAt = new ConcurrentHashMap<>();

    /** dev-режим: код возвращается в devCode (для демо, в проде выключить). */
    private final boolean devMode;

    public SmsCodeService(@Value("${app.sms.dev-mode:true}") boolean devMode) {
        this.devMode = devMode;
    }

    /**
     * Запрос SMS-кода: нормализация телефона, генерация 6 цифр,
     * защита от повторного запроса раньше 60 секунд.
     */
    public SmsSendResponse requestCode(String rawPhone) {
        String phone = PhoneUtil.normalize(rawPhone);
        long now = System.currentTimeMillis();

        Long lastRequest = lastRequestAt.get(phone);
        if (lastRequest != null && now - lastRequest < RESEND_INTERVAL_MS) {
            long seconds = (RESEND_INTERVAL_MS - (now - lastRequest) + 999) / 1000;
            throw new BadRequestException("Запросите код повторно через " + seconds + " сек");
        }

        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        codes.put(phone, new SmsEntry(code, now + CODE_TTL_MS, 0));
        lastRequestAt.put(phone, now);
        log.info("SMS-код для {}: {}", phone, code);

        return new SmsSendResponse(phone, CODE_TTL_MS / 1000, RESEND_INTERVAL_MS / 1000,
                devMode ? code : null);
    }

    /**
     * Проверка кода: true — верный, код снят, телефон подтверждён на 15 минут;
     * false — неверный код (попытка засчитана). Просроченный или отсутствующий
     * код, а также превышение попыток — ошибка.
     */
    public boolean verifyCode(String rawPhone, String code) {
        String phone = PhoneUtil.normalize(rawPhone);
        long now = System.currentTimeMillis();

        SmsEntry entry = codes.get(phone);
        if (entry == null || entry.expiresAt() <= now) {
            codes.remove(phone);
            throw new BadRequestException("Код истёк или не запрошен");
        }
        if (entry.code().equals(code)) {
            codes.remove(phone);
            verifiedAt.put(phone, now);
            return true;
        }
        int attempts = entry.attempts() + 1;
        if (attempts > MAX_ATTEMPTS) {
            // Слишком много попыток — код сгорает, нужно запрашивать новый.
            codes.remove(phone);
            throw new BadRequestException("Слишком много попыток");
        }
        codes.put(phone, new SmsEntry(entry.code(), entry.expiresAt(), attempts));
        return false;
    }

    /** Телефон подтверждён (в течение 15 минут после успешной проверки кода). */
    public boolean isPhoneVerified(String rawPhone) {
        String phone = PhoneUtil.normalize(rawPhone);
        Long verified = verifiedAt.get(phone);
        if (verified == null) {
            return false;
        }
        if (System.currentTimeMillis() - verified > VERIFIED_TTL_MS) {
            verifiedAt.remove(phone);
            return false;
        }
        return true;
    }

    /** Запись кода: сам код, время истечения, счётчик попыток ввода. */
    private record SmsEntry(String code, long expiresAt, int attempts) {
    }
}
