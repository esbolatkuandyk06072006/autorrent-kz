package kz.autorrent.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;

/**
 * Загруженный KYC-документ пользователя (паспорт, селфи, водительское
 * удостоверение). Уникален парой пользователь + слот: повторная загрузка
 * слота заменяет старый документ.
 *
 * Файлы приватные: лежат в {app.upload.dir}/kyc/{userId}/ и наружу
 * статикой не отдаются (см. WebConfig — публичного ресурса для kyc нет).
 */
@Entity
@Table(name = "kyc_documents", uniqueConstraints = {
        @UniqueConstraint(name = "uk_kyc_user_slot", columnNames = {"user_id", "slot"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KycDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User user;

    /** Слот документа: ID_FRONT, ID_BACK, ID_SELFIE, LICENSE_FRONT, LICENSE_BACK. */
    @Column(nullable = false, length = 20)
    private String slot;

    /** Путь к файлу документа (включая {app.upload.dir}). */
    @Column(name = "file_path", nullable = false, length = 500)
    private String filePath;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
