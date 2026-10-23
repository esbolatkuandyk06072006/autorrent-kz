package kz.autorrent.repository;

import kz.autorrent.entity.BusinessOrder;
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
import java.util.List;
import java.util.Optional;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    @EntityGraph(attributePaths = {"user", "vehicle"})
    @Query("select r from Reservation r where r.user.id = :userId")
    Page<Reservation> findByUserIdWithDetails(@Param("userId") Long userId, Pageable pageable);

    /** Брони по технике владельца (роль OWNER). */
    @EntityGraph(attributePaths = {"user", "vehicle"})
    @Query("select r from Reservation r where r.vehicle.owner.id = :ownerId")
    Page<Reservation> findByVehicleOwnerIdWithDetails(@Param("ownerId") Long ownerId, Pageable pageable);

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

    /** Диапазоны дат активных броней техники для календаря занятости. */
    @Query("""
            select r.startDate, r.endDate from Reservation r
            where r.vehicle.id = :vehicleId
              and r.status in :statuses
              and r.startDate < :to
              and r.endDate > :from
            """)
    java.util.List<Object[]> findBusyRanges(@Param("vehicleId") Long vehicleId,
                                            @Param("from") LocalDate from,
                                            @Param("to") LocalDate to,
                                            @Param("statuses") Collection<ReservationStatus> statuses);

    boolean existsByVehicleIdAndUserId(Long vehicleId, Long userId);

    /** Позиции бизнес-заявки. */
    @EntityGraph(attributePaths = {"user", "vehicle"})
    @Query("select r from Reservation r where r.businessOrder.id = :orderId")
    List<Reservation> findByBusinessOrderId(@Param("orderId") Long orderId);

    /** Заявки пользователя, отсортированные от новых к старым. */
    @Query("select distinct r.businessOrder from Reservation r "
            + "where r.businessOrder.user.id = :userId order by r.businessOrder.createdAt desc")
    List<BusinessOrder> findBusinessOrdersByUserId(@Param("userId") Long userId);

    /** Одна бизнес-заявка по id (для доступа и PDF). */
    @Query("select o from BusinessOrder o where o.id = :id")
    Optional<BusinessOrder> findBusinessOrderById(@Param("id") Long id);
}
