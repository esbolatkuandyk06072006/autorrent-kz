package kz.autorrent.util;

import kz.autorrent.exception.BadRequestException;

/**
 * Нормализация телефонов.
 *
 * Формат хранения: +7 и ровно 10 цифр (например, +77000000002).
 * На вход принимается пользовательский ввод вида «+7 700 123 45 67»,
 * «87001234567», «77001234567», «+77001234567».
 */
public final class PhoneUtil {

    private PhoneUtil() {
    }

    /**
     * Приводит телефон к формату хранения +7XXXXXXXXXX.
     *
     * @throws BadRequestException «Неверный формат телефона» при неверном вводе
     */
    public static String normalize(String rawPhone) {
        if (rawPhone == null) {
            throw new BadRequestException("Неверный формат телефона");
        }
        // Убираем всё, кроме цифр (пробелы, скобки, дефисы, плюс).
        String digits = rawPhone.replaceAll("[^0-9]", "");
        // 11 цифр с ведущей 8 (код страны) или 7 → отбрасываем первую цифру.
        if (digits.length() == 11 && (digits.startsWith("8") || digits.startsWith("7"))) {
            digits = digits.substring(1);
        }
        if (digits.length() != 10) {
            throw new BadRequestException("Неверный формат телефона");
        }
        return "+7" + digits;
    }
}
