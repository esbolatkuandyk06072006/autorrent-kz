package kz.autorrent.util;

import kz.autorrent.exception.BadRequestException;

/**
 * Нормализация телефонов.
 *
 * Базовый формат хранения — E.164: «+» и 8–15 цифр (например, +77000000002,
 * +447911123456, +12425550123). Для обратной совместимости локальные
 * казахстанские номера без «+» (10 цифр, 11 цифр с 7/8) приводятся к +7XXXXXXXXXX.
 */
public final class PhoneUtil {

    private PhoneUtil() {
    }

    /**
     * Приводит телефон к международному формату +XXXXXXXXXXX.
     *
     * @throws BadRequestException «Неверный формат телефона» при неверном вводе
     */
    public static String normalize(String rawPhone) {
        if (rawPhone == null || rawPhone.isBlank()) {
            throw new BadRequestException("Неверный формат телефона");
        }
        String trimmed = rawPhone.trim();
        boolean international = trimmed.startsWith("+");
        // Убираем всё, кроме цифр (пробелы, скобки, дефисы, плюс).
        String digits = trimmed.replaceAll("[^0-9]", "");
        if (digits.isEmpty()) {
            throw new BadRequestException("Неверный формат телефона");
        }
        // Старый локальный формат Казахстана: 8XXXXXXXXXX или 7XXXXXXXXXX.
        if (!international && digits.length() == 11 && (digits.startsWith("8") || digits.startsWith("7"))) {
            digits = digits.substring(1);
            return "+7" + digits;
        }
        // 10 цифр без кода страны — считаем казахстанским номером.
        if (!international && digits.length() == 10) {
            return "+7" + digits;
        }
        // E.164: от 8 до 15 цифр, первая цифра — код страны.
        if (digits.length() < 8 || digits.length() > 15) {
            throw new BadRequestException("Неверный формат телефона");
        }
        return "+" + digits;
    }
}
