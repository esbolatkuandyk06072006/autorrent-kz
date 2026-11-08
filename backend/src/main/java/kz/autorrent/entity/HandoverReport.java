package kz.autorrent.entity;

import jakarta.persistence.*;
import kz.autorrent.entity.enums.FuelLevel;
import kz.autorrent.entity.enums.HandoverType;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Шаг 8: акт приёма-передачи техники.
 *
 * Один акт на бронь и тип (уникальный парой reservation_id + type):
 * PICKUP — фиксирует состояние при выдаче (начало аренды),
 * RETURN — при возврате (завершение). Показывая оба акта рядом,
 * видно разницу состояния до и после аренды.
 */
@Entity
@Table(name = "handover_reports", uniqueConstraints = {
        @UniqueConstraint(name = "uk_handover_reservation_type",
                columnNames = {"reservation_id", "type"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HandoverReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reservation_id", nullable = false)
    private Reservation reservation;

    /** Тип акта: выдача (PICKUP) или возврат (RETURN). */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private HandoverType type;

    /** Уровень топлива на момент акта. */
    @Enumerated(EnumType.STRING)
    @Column(name = "fuel_level", length = 20)
    private FuelLevel fuelLevel;

    /** Пробег, км, на момент акта. */
    @Column
    private Integer mileage;

    /** Заметки о повреждениях: «царапина на заднем бампере». */
    @Column(name = "damages_note", length = 1000)
    private String damagesNote;

    /**
     * Фотографии состояния техники (пути вида /images/handover/{reservationId}/N.jpg).
     * Порядок важен: первая — главное фото акта.
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "handover_report_photos",
            joinColumns = @JoinColumn(name = "report_id"))
    @Column(name = "photo_path", length = 500)
    @OrderColumn(name = "position")
    @Builder.Default
    private List<String> photos = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
