package kz.autorrent.dto.user;

public record UserResponse(
        Long id,
        String email,
        String firstName,
        String lastName,
        String phone,
        String role
) {
}
