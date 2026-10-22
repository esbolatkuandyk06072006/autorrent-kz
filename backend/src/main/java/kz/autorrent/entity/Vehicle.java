package kz.autorrent.entity;

import jakarta.persistence.*;
import kz.autorrent.entity.enums.VehicleCategory;
import kz.autorrent.entity.enums.VehicleLicense;
import kz.autorrent.entity.enums.VehicleStatus;
import kz.autorrent.entity.enums.VehicleType;
import kz.autorrent.entity.enums.FuelType;
import kz.autorrent.entity.enums.Transmission;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Единица техники в каталоге (легковая машина, грузовик или спецтехника).
 *
 * Переименована из Car (шаг 2 доработки). Таблица vehicles — миграция V2.
 * JSON-контракт API не изменился: /api/v1/cars работает как алиас /api/v1/vehicles.
 */
@Entity
@Table(name = "vehicles", uniqueConstraints = {
        @UniqueConstraint(name = "uk_vehicles_license_plate", columnNames = "license_plate")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String brand;

    @Column(nullable = false, length = 50)
    private String model;

    @Column(name = "production_year", nullable = false)
    private Integer year;

    @Column(name = "license_plate", nullable = false, unique = true, length = 20)
    private String licensePlate;

    /** Группа техники: легковые / грузовые / спецтехника. */
    @Enumerated(EnumType.STRING)
    @Column(name = "vehicle_type", nullable = false, length = 20)
    private VehicleType type;

    /** Подкатегория внутри группы (эконом, газель, экскаватор…). */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private VehicleCategory category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Transmission transmission;

    @Enumerated(EnumType.STRING)
    @Column(name = "fuel_type", nullable = false, length = 20)
    private FuelType fuelType;

    /** Мест для легковых (2–9); для грузовых/спецтехники — посадочных мест экипажа. */
    @Column
    private Integer seats;

    /** Грузоподъёмность в тоннах (для грузовых и спецтехники). */
    @Column(precision = 6, scale = 2)
    private BigDecimal capacity;

    /** Требуемые права: B / C / E / спецудостоверение. */
    @Enumerated(EnumType.STRING)
    @Column(name = "required_license", length = 20)
    private VehicleLicense requiredLicense;

    /** Аренда с оператором (для грузовой и спецтехники). */
    @Builder.Default
    @Column(name = "with_operator", nullable = false)
    private Boolean withOperator = false;

    /** Цена аренды с оператором за сутки. */
    @Column(name = "operator_price_per_day", precision = 10, scale = 2)
    private BigDecimal operatorPricePerDay;

    /** Почасовая цена (для спецтехники и почасовой аренды). */
    @Column(name = "price_per_hour", precision = 10, scale = 2)
    private BigDecimal pricePerHour;

    @Column(name = "price_per_day", nullable = false, precision = 10, scale = 2)
    private BigDecimal pricePerDay;

    @Column(nullable = false, length = 50)
    private String city;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VehicleStatus status;

    @Column(length = 2000)
    private String description;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    /**
     * Галерея фотографий (пути вида /images/vehicles/{id}/1.jpg).
     * Порядок важен: images[0] — главное фото карточки.
     * imageUrl сохранён для обратной совместимости и дублирует images[0].
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "vehicle_images", joinColumns = @JoinColumn(name = "vehicle_id"))
    @Column(name = "image_path", length = 500)
    @OrderColumn(name = "position")
    @Builder.Default
    private List<String> images = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
