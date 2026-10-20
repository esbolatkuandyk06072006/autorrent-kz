package kz.autorrent.service;

import kz.autorrent.dto.review.ReviewRequest;
import kz.autorrent.dto.review.ReviewResponse;
import kz.autorrent.entity.Car;
import kz.autorrent.entity.Reservation;
import kz.autorrent.entity.Review;
import kz.autorrent.entity.User;
import kz.autorrent.entity.enums.*;
import kz.autorrent.exception.ConflictException;
import kz.autorrent.repository.CarRepository;
import kz.autorrent.repository.ReservationRepository;
import kz.autorrent.repository.ReviewRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReviewServiceTest {

    @Mock
    private ReviewRepository reviewRepository;
    @Mock
    private ReservationRepository reservationRepository;
    @Mock
    private CarRepository carRepository;

    @InjectMocks
    private ReviewService reviewService;

    private Reservation reservation;
    private ReviewRequest request;

    @BeforeEach
    void setUp() {
        User user = User.builder()
                .id(1L)
                .email("user@test.kz")
                .firstName("Test")
                .lastName("User")
                .role(Role.USER)
                .build();

        Car car = Car.builder()
                .id(1L)
                .brand("Toyota")
                .model("Camry")
                .year(2023)
                .licensePlate("123ABC01")
                .category(CarCategory.COMFORT)
                .transmission(Transmission.AUTOMATIC)
                .fuelType(FuelType.PETROL)
                .seats(5)
                .pricePerDay(new BigDecimal("20000.00"))
                .city("Almaty")
                .status(CarStatus.ACTIVE)
                .build();

        reservation = Reservation.builder()
                .id(1L)
                .user(user)
                .car(car)
                .startDate(LocalDate.now().minusDays(10))
                .endDate(LocalDate.now().minusDays(6))
                .daysCount(4)
                .pricePerDaySnapshot(new BigDecimal("20000.00"))
                .totalPrice(new BigDecimal("80000.00"))
                .status(ReservationStatus.COMPLETED)
                .build();

        request = new ReviewRequest(1L, 5, "Great car and service");
    }

    @Test
    void createsReviewForCompletedOwnReservation() {
        when(reservationRepository.findWithDetailsById(1L)).thenReturn(Optional.of(reservation));
        when(reviewRepository.existsByReservationId(1L)).thenReturn(false);
        when(reviewRepository.save(any(Review.class))).thenAnswer(invocation -> {
            Review review = invocation.getArgument(0);
            review.setId(10L);
            return review;
        });

        ReviewResponse response = reviewService.create("user@test.kz", request);

        assertThat(response.id()).isEqualTo(10L);
        assertThat(response.rating()).isEqualTo(5);
        assertThat(response.status()).isEqualTo("VISIBLE");
        assertThat(response.carId()).isEqualTo(1L);
    }

    @Test
    void rejectsReviewBeforeReservationIsCompleted() {
        reservation.setStatus(ReservationStatus.CONFIRMED);
        when(reservationRepository.findWithDetailsById(1L)).thenReturn(Optional.of(reservation));

        assertThatThrownBy(() -> reviewService.create("user@test.kz", request))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("completed");
    }

    @Test
    void rejectsDuplicateReview() {
        when(reservationRepository.findWithDetailsById(1L)).thenReturn(Optional.of(reservation));
        when(reviewRepository.existsByReservationId(1L)).thenReturn(true);

        assertThatThrownBy(() -> reviewService.create("user@test.kz", request))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("already has a review");
    }

    @Test
    void rejectsReviewForAnotherUsersReservation() {
        when(reservationRepository.findWithDetailsById(1L)).thenReturn(Optional.of(reservation));

        assertThatThrownBy(() -> reviewService.create("other@test.kz", request))
                .isInstanceOf(AccessDeniedException.class);
    }
}
