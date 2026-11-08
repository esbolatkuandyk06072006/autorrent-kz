package kz.autorrent.controller;

import jakarta.validation.Valid;
import kz.autorrent.dto.auth.AuthResponse;
import kz.autorrent.dto.auth.KycDocumentResponse;
import kz.autorrent.dto.auth.LoginRequest;
import kz.autorrent.dto.auth.RegisterRequest;
import kz.autorrent.dto.auth.SignupRequest;
import kz.autorrent.dto.auth.SmsSendRequest;
import kz.autorrent.dto.auth.SmsSendResponse;
import kz.autorrent.dto.auth.SmsVerifyRequest;
import kz.autorrent.dto.auth.SmsVerifyResponse;
import kz.autorrent.entity.User;
import kz.autorrent.entity.enums.Role;
import kz.autorrent.exception.BadRequestException;
import kz.autorrent.exception.ConflictException;
import kz.autorrent.repository.UserRepository;
import kz.autorrent.security.JwtService;
import kz.autorrent.service.AuthService;
import kz.autorrent.service.KycService;
import kz.autorrent.service.SmsCodeService;
import kz.autorrent.util.PhoneUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.SecureRandom;
import java.util.List;

/**
 * Авторизация: email+пароль (как раньше) и телефонная (SMS) авторизация
 * в стиле каршеринга + загрузка KYC-документов при регистрации.
 *
 * Все эндпоинты лежат под /api/v1/auth/** и открыты (permitAll).
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    /** Алфавит случайного пароля: буквы + цифры. */
    private static final String PASSWORD_ALPHABET =
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    /** Длина случайного пароля: пользователь входит по SMS, пароль не нужен. */
    private static final int PASSWORD_LENGTH = 32;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final AuthService authService;
    private final SmsCodeService smsCodeService;
    private final KycService kycService;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    // ==== Телефонная (SMS) авторизация ====

    /** Запрос SMS-кода подтверждения телефона. */
    @PostMapping("/sms/request")
    public SmsSendResponse requestSmsCode(@Valid @RequestBody SmsSendRequest request) {
        return smsCodeService.requestCode(request.phone());
    }

    /**
     * Проверка SMS-кода: существующий пользователь получает auth,
     * новый — signupToken для последующего /signup.
     */
    @PostMapping("/sms/verify")
    public SmsVerifyResponse verifySmsCode(@Valid @RequestBody SmsVerifyRequest request) {
        if (!smsCodeService.verifyCode(request.phone(), request.code())) {
            throw new BadRequestException("Неверный код");
        }
        String phone = PhoneUtil.normalize(request.phone());
        User user = userRepository.findByPhone(phone).orElse(null);
        if (user != null) {
            return new SmsVerifyResponse(true, null, authService.buildAuthResponse(user));
        }
        return new SmsVerifyResponse(false, jwtService.generateSignupToken(phone), null);
    }

    /**
     * Регистрация по телефону: согласия, подтверждённый номер, отсутствие
     * дубликата и загруженные KYC-документы. Пароль генерируется случайный —
     * вход идёт по SMS.
     */
    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signup(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @Valid @RequestBody SignupRequest request) {
        String phone = phoneFromSignupHeader(authorizationHeader);

        if (!Boolean.TRUE.equals(request.agreedTerms()) || !Boolean.TRUE.equals(request.agreedData())) {
            throw new BadRequestException(
                    "Необходимо принять пользовательское соглашение и обработку персональных данных");
        }
        if (!smsCodeService.isPhoneVerified(phone)) {
            throw new BadRequestException("Телефон не подтверждён. Запросите код SMS заново");
        }
        if (userRepository.existsByPhone(phone)) {
            throw new ConflictException("Аккаунт с таким телефоном уже существует");
        }

        // Email формируется из цифр телефона (без +) — дубликат недопустим.
        String email = phone.substring(1) + "@autorent.kz";
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ConflictException("Аккаунт с таким email уже существует");
        }

        boolean hasDocuments = !kycService.listPendingDocuments(phone).isEmpty();
        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(randomPassword()))
                .firstName(request.firstName().trim())
                .lastName(request.lastName().trim())
                .phone(phone)
                .role(Role.USER)
                .enabled(true)
                .kycStatus(hasDocuments ? "PENDING" : "NONE")
                .build();
        user = userRepository.save(user);

        // Переносим KYC-файлы из pending-каталога в постоянный и создаём записи.
        kycService.finalizeSignup(phone, user.getId());

        return ResponseEntity.status(HttpStatus.CREATED).body(authService.buildAuthResponse(user));
    }

    /** Уже загруженные pending-документы — восстановление состояния после F5. */
    @GetMapping("/signup/documents")
    public List<KycDocumentResponse> listSignupDocuments(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader) {
        String phone = phoneFromSignupHeader(authorizationHeader);
        return kycService.listPendingDocuments(phone);
    }

    /** Загрузка KYC-документа до регистрации (multipart: поля slot и file). */
    @PostMapping(value = "/signup/documents", consumes = {"multipart/form-data"})
    public KycDocumentResponse uploadSignupDocument(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @RequestParam String slot,
            @RequestParam MultipartFile file) {
        String phone = phoneFromSignupHeader(authorizationHeader);
        return kycService.savePendingDocument(phone, slot, file);
    }

    /**
     * Телефон из заголовка Authorization с токеном регистрации (Bearer <signupToken>).
     * Заголовка нет или он в неверном формате — «Токен регистрации не передан».
     */
    private String phoneFromSignupHeader(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new BadRequestException("Токен регистрации не передан");
        }
        return jwtService.extractSignupPhone(authorizationHeader.substring(7).trim());
    }

    /** Случайный 32-символьный пароль (буквы + цифры) — вход идёт по SMS. */
    private String randomPassword() {
        StringBuilder password = new StringBuilder(PASSWORD_LENGTH);
        for (int i = 0; i < PASSWORD_LENGTH; i++) {
            password.append(PASSWORD_ALPHABET.charAt(RANDOM.nextInt(PASSWORD_ALPHABET.length())));
        }
        return password.toString();
    }
}
