package kz.autorrent.service;

import kz.autorrent.dto.reservation.ReservationRequest;
import kz.autorrent.dto.reservation.ReservationResponse;
import kz.autorrent.entity.Car;
import kz.autorrent.entity.Reservation;
import kz.autorrent.entity.User;
import kz.autorrent.entity.enums.*;
import kz.autorrent.exception.ConflictException;
import kz.autorrent.repository.CarRepository;
import kz.autorrent.repository.ReservationRepository;
import kz.autorrent.repository.UserRepository;
import kz.autorrent.service.pricing.PricingStrategyResolver;
import kz.autorrent.service.pricing.StandardPricingStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookingFacadeTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private CarRepository carRepository;
    @Mock
    private ReservationRepository reservationRepository;
    @Mock
    private PricingStrategyResolver pricingStrategyResolver;
    @Mock
    private ReservationFactory reservationFactory;

    @InjectMocks
    private BookingFacade bookingFacade;

    private User user;
    private Car car;
    private LocalDate start;
    private LocalDate end;
    private ReservationRequest request;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id(1L)
                .email("user@test.kz")
                .firstName("Test")
                .lastName("User")
                .role(Role.USER)
                .build();

        car = Car.builder()
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

        start = LocalDate.now().plusDays(2);
        end = start.plusDays(4);
        request = new ReservationRequest(1L, start, end);
    }

    @Test
    void booksCarAndCalculatesTotalPrice() {
        Reservation reservation = Reservation.builder()
                .user(user)
                .car(car)
                .startDate(start)
                .endDate(end)
                .daysCount(4)
                .pricePerDaySnapshot(new BigDecimal("20000.00"))
                .totalPrice(new BigDecimal("80000.00"))
                .status(ReservationStatus.PENDING)
                .build();

        when(userRepository.findByEmailIgnoreCase("user@test.kz")).thenReturn(Optional.of(user));
        when(carRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(car));
        when(reservationRepository.countOverlapping(eq(1L), eq(start), eq(end), anyCollection()))
                .thenReturn(0L);
        when(pricingStrategyResolver.resolve(4)).thenReturn(new StandardPricingStrategy());
        when(reservationFactory.create(eq(user), eq(car), eq(start), eq(end), any()))
                .thenReturn(reservation);
        when(reservationRepository.save(any(Reservation.class))).thenAnswer(invocation -> {
            Reservation saved = invocation.getArgument(0);
            saved.setId(10L);
            return saved;
        });

        ReservationResponse response = bookingFacade.bookCar("user@test.kz", request);

        assertThat(response.id()).isEqualTo(10L);
        assertThat(response.status()).isEqualTo("PENDING");
        assertThat(response.daysCount()).isEqualTo(4);
        assertThat(response.totalPrice()).isEqualByComparingTo("80000.00");
    }

    @Test
    void rejectsOverlappingReservation() {
        when(userRepository.findByEmailIgnoreCase("user@test.kz")).thenReturn(Optional.of(user));
        when(carRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(car));
        when(reservationRepository.countOverlapping(eq(1L), eq(start), eq(end), anyCollection()))
                .thenReturn(1L);

        assertThatThrownBy(() -> bookingFacade.bookCar("user@test.kz", request))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("not available");
    }

    @Test
    void rejectsCarUnderMaintenance() {
        car.setStatus(CarStatus.MAINTENANCE);
        when(userRepository.findByEmailIgnoreCase("user@test.kz")).thenReturn(Optional.of(user));
        when(carRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(car));

        assertThatThrownBy(() -> bookingFacade.bookCar("user@test.kz", request))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("not available");
    }
}
