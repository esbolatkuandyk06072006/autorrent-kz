package kz.autorrent.repository;

import kz.autorrent.entity.Reservation;
import kz.autorrent.entity.enums.ReservationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.Optional;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    @EntityGraph(attributePaths = {"user", "vehicle"})
    @Query("select r from Reservation r where r.user.id = :userId")
    Page<Reservation> findByUserIdWithDetails(@Param("userId") Long userId, Pageable pageable);

    @EntityGraph(attributePaths = {"user", "vehicle"})
    @Query("select r from Reservation r")
    Page<Reservation> findAllWithDetails(Pageable pageable);

    @EntityGraph(attributePaths = {"user", "vehicle"})
    @Query("select r from Reservation r where r.id = :id")
    Optional<Reservation> findWithDetailsById(@Param("id") Long id);

    @Query("""
            select count(r) from Reservation r
            where r.vehicle.id = :vehicleId
              and r.status in :statuses
              and r.startDate < :endDate
              and r.endDate > :startDate
            """)
    long countOverlapping(@Param("vehicleId") Long vehicleId,
                          @Param("startDate") LocalDate startDate,
                          @Param("endDate") LocalDate endDate,
                          @Param("statuses") Collection<ReservationStatus> statuses);

    @Query("""
            select count(r) from Reservation r
            where r.vehicle.id = :vehicleId
              and r.id <> :excludedId
              and r.status in :statuses
              and r.startDate < :endDate
              and r.endDate > :startDate
            """)
    long countOverlappingExcluding(@Param("vehicleId") Long vehicleId,
                                   @Param("excludedId") Long excludedId,
                                   @Param("startDate") LocalDate startDate,
                                   @Param("endDate") LocalDate endDate,
                                   @Param("statuses") Collection<ReservationStatus> statuses);

    boolean existsByVehicleIdAndStatusIn(Long vehicleId, Collection<ReservationStatus> statuses);

    boolean existsByVehicleId(Long vehicleId);
}
