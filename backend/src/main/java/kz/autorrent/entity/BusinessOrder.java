package kz.autorrent.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Бизнес-заявка (счёт на юрлицо): несколько единиц техники в одной заявке
 * с реквизитами компании (название + БИН). Позиции заявки — обычные брони
 * со ссылкой на заказ (Reservation.businessOrder), поэтому календарь
 * занятости, статусы и подтверждение работают без изменений.
 */
@Entity
@Table(name = "business_orders", indexes = {
        @Index(name = "idx_business_orders_user", columnList = "user_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BusinessOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Название компании-арендатора (юрлицо). */
    @Column(name = "company_name", nullable = false, length = 200)
    private String companyName;

    /** БИН юрлица — 12 цифр (Казахстан). */
    @Column(nullable = false, length = 12)
    private String bin;

    /** Итоговая сумма по всем позициям (снимок на момент создания). */
    @Column(name = "total_price", nullable = false, precision = 14, scale = 2)
    private BigDecimal totalPrice;

    @Builder.Default
    @OneToMany(mappedBy = "businessOrder", fetch = FetchType.LAZY)
    private List<Reservation> reservations = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
