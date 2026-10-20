package kz.autorrent.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateUserRequest(
        @NotBlank @Size(max = 50) String firstName,
        @NotBlank @Size(max = 50) String lastName,
        @Pattern(regexp = "^\\+?[0-9]{10,15}$", message = "phone must contain 10-15 digits, optional +")
        String phone
) {
}
