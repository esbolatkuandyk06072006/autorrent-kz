package kz.autorrent.repository;

import jakarta.persistence.LockModeType;
import kz.autorrent.entity.Car;
import kz.autorrent.entity.enums.CarCategory;
import kz.autorrent.entity.enums.CarStatus;
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

public interface CarRepository extends JpaRepository<Car, Long> {

    boolean existsByLicensePlateIgnoreCase(String licensePlate);

    boolean existsByLicensePlateIgnoreCaseAndIdNot(String licensePlate, Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Car c where c.id = :id")
    Optional<Car> findByIdForUpdate(@Param("id") Long id);

    @Query("""
            select c from Car c
            where c.status = :status
              and (:brand is null or lower(c.brand) like lower(concat('%', :brand, '%')))
              and (:city is null or lower(c.city) = lower(:city))
              and (:category is null or c.category = :category)
              and (:maxPrice is null or c.pricePerDay <= :maxPrice)
            """)
    Page<Car> search(@Param("status") CarStatus status,
                     @Param("brand") String brand,
                     @Param("city") String city,
                     @Param("category") CarCategory category,
                     @Param("maxPrice") BigDecimal maxPrice,
                     Pageable pageable);

    @Query("""
            select c from Car c
            where c.status = :status
              and (:brand is null or lower(c.brand) like lower(concat('%', :brand, '%')))
              and (:city is null or lower(c.city) = lower(:city))
              and (:category is null or c.category = :category)
              and (:maxPrice is null or c.pricePerDay <= :maxPrice)
              and not exists (
                  select r from Reservation r
                  where r.car = c
                    and r.status in :activeStatuses
                    and r.startDate < :endDate
                    and r.endDate > :startDate
              )
            """)
    Page<Car> searchAvailable(@Param("status") CarStatus status,
                              @Param("brand") String brand,
                              @Param("city") String city,
                              @Param("category") CarCategory category,
                              @Param("maxPrice") BigDecimal maxPrice,
                              @Param("startDate") LocalDate startDate,
                              @Param("endDate") LocalDate endDate,
                              @Param("activeStatuses") Collection<ReservationStatus> activeStatuses,
                              Pageable pageable);
}
