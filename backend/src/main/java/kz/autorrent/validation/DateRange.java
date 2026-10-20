package kz.autorrent.validation;

import java.time.LocalDate;

public interface DateRange {

    LocalDate startDate();

    LocalDate endDate();
}
