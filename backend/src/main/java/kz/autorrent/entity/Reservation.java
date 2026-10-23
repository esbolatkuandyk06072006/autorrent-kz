package kz.autorrent.entity;

import jakarta.persistence.*;
import kz.autorrent.entity.enums.ReservationStatus;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "reservations", indexes = {
        @Index(name = "idx_reservations_vehicle_dates", columnList = "vehicle_id, start_date, end_date"),
        @Index(name = "idx_reservations_user", columnList = "user_id"),
        @Index(name = "idx_reservations_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Reservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "days_count", nullable = false)
    private long daysCount;

    /**
     * Часы аренды (почасовой режим, для спецтехники). Если заданы — бронь
     * почасовая: daysCount = 0, цена = pricePerHourSnapshot * hours.
     * Хранится отдельно, чтобы календарь занятости работал корректно.
     */
    @Column
    private Integer hours;

    /** Аренда с оператором/водителем: в итог вошла суточная цена оператора. */
    @Builder.Default
    @Column(name = "with_operator", nullable = false)
    private Boolean withOperator = false;

    /** Поясовая цена на момент брони (для почасового режима). */
    @Column(name = "price_per_hour_snapshot", precision = 10, scale = 2)
    private BigDecimal pricePerHourSnapshot;

    /** Применённая скидка в процентах (10 с 7 дней, 20 с 30 дней). */
    @Column(name = "discount_percent", precision = 5, scale = 2)
    private BigDecimal discountPercent;

    /** Бизнес-заявка (счёт на юрлицо), если бронь создана в режиме «Для бизнеса». */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "business_order_id")
    private BusinessOrder businessOrder;

    @Column(name = "price_per_day_snapshot", nullable = false, precision = 10, scale = 2)
    private BigDecimal pricePerDaySnapshot;

    @Column(name = "total_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalPrice;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReservationStatus status = ReservationStatus.PENDING;

    @Column(name = "cancellation_reason", length = 255)
    private String cancellationReason;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /** Активная аренда: ожидает подтверждения, подтверждена или уже идёт. */
    public boolean isActive() {
        return status == ReservationStatus.PENDING
                || status == ReservationStatus.CONFIRMED
                || status == ReservationStatus.ACTIVE;
    }
}
