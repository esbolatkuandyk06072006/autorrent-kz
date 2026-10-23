package kz.autorrent.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import kz.autorrent.entity.enums.VehicleLicense;

public record RegisterRequest(
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(min = 8, max = 72) String password,
        @NotBlank @Size(max = 50) String firstName,
        @NotBlank @Size(max = 50) String lastName,
        @Pattern(regexp = "^\\+?[0-9]{10,15}$", message = "phone must contain 10-15 digits, optional +")
        String phone,
        /** Категория прав — необязательно, можно указать позже в профиле. */
        VehicleLicense drivingLicense,
        /** Роль при регистрации: USER (клиент, по умолчанию) или OWNER (владелец техники). */
        String role
) {
}
