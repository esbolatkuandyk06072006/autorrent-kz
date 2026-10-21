package kz.autorrent.repository;

import jakarta.persistence.LockModeType;
import kz.autorrent.entity.Vehicle;
import kz.autorrent.entity.enums.VehicleCategory;
import kz.autorrent.entity.enums.VehicleStatus;
import kz.autorrent.entity.enums.VehicleType;
import kz.autorrent.entity.enums.ReservationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.Optional;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {

    boolean existsByLicensePlateIgnoreCase(String licensePlate);

    boolean existsByLicensePlateIgnoreCaseAndIdNot(String licensePlate, Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select v from Vehicle v where v.id = :id")
    Optional<Vehicle> findByIdForUpdate(@Param("id") Long id);

    /**
     * Каталог с фильтрами. Все параметры опциональны: null — «не фильтровать».
     * type — группа (легковые/грузовые/спецтехника), category — подкатегория,
     * maxCapacity — «до N тонн», withOperator — «только с оператором».
     */
    @Query("""
            select v from Vehicle v
            where v.status = :status
              and (:type is null or v.type = :type)
              and (:category is null or v.category = :category)
              and (:brand is null or lower(v.brand) like lower(concat('%', :brand, '%')))
              and (:city is null or lower(v.city) = lower(:city))
              and (:maxPrice is null or v.pricePerDay <= :maxPrice)
              and (:maxCapacity is null or v.capacity <= :maxCapacity)
              and (:withOperator is null or v.withOperator = :withOperator)
            """)
    Page<Vehicle> search(@Param("status") VehicleStatus status,
                         @Param("type") VehicleType type,
                         @Param("brand") String brand,
                         @Param("city") String city,
                         @Param("category") VehicleCategory category,
                         @Param("maxPrice") BigDecimal maxPrice,
                         @Param("maxCapacity") BigDecimal maxCapacity,
                         @Param("withOperator") Boolean withOperator,
                         Pageable pageable);

    @Query("""
            select v from Vehicle v
            where v.status = :status
              and (:type is null or v.type = :type)
              and (:category is null or v.category = :category)
              and (:brand is null or lower(v.brand) like lower(concat('%', :brand, '%')))
              and (:city is null or lower(v.city) = lower(:city))
              and (:maxPrice is null or v.pricePerDay <= :maxPrice)
              and (:maxCapacity is null or v.capacity <= :maxCapacity)
              and (:withOperator is null or v.withOperator = :withOperator)
              and not exists (
                  select r from Reservation r
                  where r.vehicle.id = v.id
                    and r.status in :statuses
                    and r.startDate < :endDate
                    and r.endDate > :startDate
              )
            """)
    Page<Vehicle> searchAvailable(@Param("status") VehicleStatus status,
                                  @Param("type") VehicleType type,
                                  @Param("brand") String brand,
                                  @Param("city") String city,
                                  @Param("category") VehicleCategory category,
                                  @Param("maxPrice") BigDecimal maxPrice,
                                  @Param("maxCapacity") BigDecimal maxCapacity,
                                  @Param("withOperator") Boolean withOperator,
                                  @Param("startDate") LocalDate startDate,
                                  @Param("endDate") LocalDate endDate,
                                  @Param("statuses") Collection<ReservationStatus> statuses,
                                  Pageable pageable);
}
