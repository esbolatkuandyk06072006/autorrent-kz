package kz.autorrent.dto.user;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record UserResponse(
        Long id,
        String email,
        String firstName,
        String lastName,
        String phone,
        String role,
        String drivingLicense,
        String kycStatus
) {
}
