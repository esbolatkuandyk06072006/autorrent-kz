package kz.autorrent.entity;

import jakarta.persistence.*;
import kz.autorrent.entity.enums.Role;
import kz.autorrent.entity.enums.VehicleLicense;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "first_name", nullable = false, length = 50)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 50)
    private String lastName;

    @Column(length = 20)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    /**
     * Категория водительского удостоверения клиента (B / C / E / SPECIAL).
     * Участвует в проверке соответствия при бронировании техники.
     * Если не указана — при бронировании техники, требующей права, будет отказано.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "driving_license", length = 20)
    private VehicleLicense drivingLicense;

    @Builder.Default
    @Column(nullable = false)
    private boolean enabled = true;

    /**
     * Статус KYC-верификации: NONE (документов нет) / PENDING (документы
     * загружены, ждут проверки) / VERIFIED (проверены).
     */
    @Builder.Default
    @Column(name = "kyc_status", length = 20)
    private String kycStatus = "NONE";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
