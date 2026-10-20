package kz.autorrent.repository;

import kz.autorrent.entity.Review;
import kz.autorrent.entity.enums.ReviewStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    boolean existsByReservationId(Long reservationId);

    Optional<Review> findByReservationId(Long reservationId);

    @EntityGraph(attributePaths = {"reservation", "reservation.car", "reservation.user"})
    @Query("select r from Review r where r.reservation.car.id = :carId and r.status = :status")
    Page<Review> findByCarIdAndStatusWithDetails(@Param("carId") Long carId,
                                                 @Param("status") ReviewStatus status,
                                                 Pageable pageable);

    @EntityGraph(attributePaths = {"reservation", "reservation.car", "reservation.user"})
    @Query("select r from Review r")
    Page<Review> findAllWithDetails(Pageable pageable);

    @EntityGraph(attributePaths = {"reservation", "reservation.car", "reservation.user"})
    @Query("select r from Review r where r.id = :id")
    Optional<Review> findWithDetailsById(@Param("id") Long id);

    @Query("select avg(r.rating) from Review r where r.reservation.car.id = :carId and r.status = :status")
    Double averageRating(@Param("carId") Long carId, @Param("status") ReviewStatus status);

    long countByReservationCarIdAndStatus(Long carId, ReviewStatus status);
}
