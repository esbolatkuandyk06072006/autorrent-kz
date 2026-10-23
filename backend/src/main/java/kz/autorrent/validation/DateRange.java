package kz.autorrent.validation;

import java.time.LocalDate;

public interface DateRange {

    LocalDate startDate();

    LocalDate endDate();

    /** Часы почасовой аренды; null — обычная посуточная аренда. */
    default Integer hours() {
        return null;
    }
}
