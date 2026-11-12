package kz.autorrent.util;

import kz.autorrent.exception.BadRequestException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PhoneUtilTest {

    @Test
    void normalizesKazakhNumbersWithSpacesAndLegacyPrefixes() {
        assertThat(PhoneUtil.normalize("+7 700 000 00 02")).isEqualTo("+77000000002");
        assertThat(PhoneUtil.normalize("8 (700) 000-00-02")).isEqualTo("+77000000002");
        assertThat(PhoneUtil.normalize("77000000002")).isEqualTo("+77000000002");
        assertThat(PhoneUtil.normalize("7000000002")).isEqualTo("+77000000002");
    }

    @Test
    void keepsInternationalNumbersInE164() {
        assertThat(PhoneUtil.normalize("+44 7911 123456")).isEqualTo("+447911123456");
        assertThat(PhoneUtil.normalize("+1 (242) 555-0123")).isEqualTo("+12425550123");
        assertThat(PhoneUtil.normalize("+971 50 123 4567")).isEqualTo("+971501234567");
        assertThat(PhoneUtil.normalize("+7 701 777 88 99")).isEqualTo("+77017778899");
    }

    @Test
    void rejectsTooShortOrTooLongNumbers() {
        assertThatThrownBy(() -> PhoneUtil.normalize("12345")).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> PhoneUtil.normalize("+1234567890123456")).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> PhoneUtil.normalize(" ")).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> PhoneUtil.normalize(null)).isInstanceOf(BadRequestException.class);
    }
}
