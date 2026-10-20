package kz.autorrent.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = DateRangeValidator.class)
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidDateRange {

    String message() default "endDate must be after startDate and rental period must be between 1 and 30 days";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
