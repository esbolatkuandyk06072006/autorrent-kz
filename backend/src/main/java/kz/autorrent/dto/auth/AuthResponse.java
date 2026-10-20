package kz.autorrent.dto.auth;

import kz.autorrent.dto.user.UserResponse;

public record AuthResponse(
        String token,
        String tokenType,
        long expiresIn,
        UserResponse user
) {
}
