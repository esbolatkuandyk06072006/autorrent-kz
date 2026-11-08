package kz.autorrent.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.security.Keys;
import kz.autorrent.entity.User;
import kz.autorrent.exception.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationSeconds;

    public JwtService(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.expiration-seconds:86400}") long expirationSeconds) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationSeconds = expirationSeconds;
    }

    public String generateToken(User user) {
        Date now = new Date();
        Date expiresAt = new Date(now.getTime() + expirationSeconds * 1000);
        return Jwts.builder()
                .subject(user.getEmail())
                .claim("userId", user.getId())
                .claim("role", user.getRole().name())
                .issuedAt(now)
                .expiration(expiresAt)
                .signWith(key)
                .compact();
    }

    public String extractUsername(String token) {
        return extractAllClaims(token).getSubject();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        Claims claims = extractAllClaims(token);
        String username = claims.getSubject();
        Date expiration = claims.getExpiration();
        return username != null
                && username.equalsIgnoreCase(userDetails.getUsername())
                && expiration != null
                && expiration.after(new Date());
    }

    public long getExpirationSeconds() {
        return expirationSeconds;
    }

    /**
     * Токен регистрации (signup): subject — телефон, claim purpose="signup",
     * срок жизни 30 минут. Выдаётся после проверки SMS-кода новому пользователю.
     */
    public String generateSignupToken(String phone) {
        Date now = new Date();
        Date expiresAt = new Date(now.getTime() + 30 * 60 * 1000);
        return Jwts.builder()
                .subject(phone)
                .claim("purpose", "signup")
                .issuedAt(now)
                .expiration(expiresAt)
                .signWith(key)
                .compact();
    }

    /**
     * Телефон из токена регистрации. Не-signup-токен, просроченный или
     * невалидный — BadRequestException «Недействительный токен регистрации».
     */
    public String extractSignupPhone(String token) {
        Claims claims;
        try {
            claims = extractAllClaims(token);
        } catch (JwtException | IllegalArgumentException e) {
            throw new BadRequestException("Недействительный токен регистрации");
        }
        if (!"signup".equals(claims.get("purpose"))) {
            throw new BadRequestException("Недействительный токен регистрации");
        }
        Date expiration = claims.getExpiration();
        if (expiration == null || !expiration.after(new Date())) {
            throw new BadRequestException("Недействительный токен регистрации");
        }
        return claims.getSubject();
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
