package kz.autorrent.service;

import kz.autorrent.dto.reservation.ReservationRequest;
import kz.autorrent.dto.reservation.ReservationResponse;
import kz.autorrent.entity.Vehicle;
import kz.autorrent.entity.Reservation;
import kz.autorrent.entity.User;
import kz.autorrent.entity.enums.*;
import kz.autorrent.exception.BadRequestException;
import kz.autorrent.exception.ConflictException;
import kz.autorrent.repository.VehicleRepository;
import kz.autorrent.repository.ReservationRepository;
import kz.autorrent.repository.UserRepository;
import kz.autorrent.service.pricing.PriceQuote;
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
    private VehicleRepository vehicleRepository;
    @Mock
    private ReservationRepository reservationRepository;
    @Mock
    private PricingService pricingService;
    @Mock
    private ReservationFactory reservationFactory;

    @InjectMocks
    private BookingFacade bookingFacade;

    private User user;
    private Vehicle vehicle;
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
                .drivingLicense(VehicleLicense.B)
                .role(Role.USER)
                .build();

        vehicle = Vehicle.builder()
                .id(1L)
                .brand("Toyota")
                .model("Camry")
                .year(2023)
                .licensePlate("123ABC01")
                .category(VehicleCategory.COMFORT)
                .type(VehicleType.PASSENGER)
                .transmission(Transmission.AUTOMATIC)
                .fuelType(FuelType.PETROL)
                .seats(5)
                .requiredLicense(VehicleLicense.B)
                .pricePerDay(new BigDecimal("20000.00"))
                .city("Almaty")
                .status(VehicleStatus.ACTIVE)
                .build();

        start = LocalDate.now().plusDays(2);
        end = start.plusDays(4);
        request = new ReservationRequest(1L, start, end);
    }

    @Test
    void booksVehicleAndCalculatesTotalPrice() {
        PriceQuote quote = new PriceQuote("DAY", 4, null, new BigDecimal("20000.00"), null,
                new BigDecimal("80000.00"), new BigDecimal("0.00"), new BigDecimal("0.00"),
                null, BigDecimal.ZERO, new BigDecimal("80000.00"));
        Reservation reservation = Reservation.builder()
                .user(user)
                .vehicle(vehicle)
                .startDate(start)
                .endDate(end)
                .daysCount(4)
                .pricePerDaySnapshot(new BigDecimal("20000.00"))
                .totalPrice(new BigDecimal("80000.00"))
                .status(ReservationStatus.PENDING)
                .build();

        when(userRepository.findByEmailIgnoreCase("user@test.kz")).thenReturn(Optional.of(user));
        when(vehicleRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(vehicle));
        when(reservationRepository.countOverlapping(eq(1L), eq(start), eq(end), anyCollection()))
                .thenReturn(0L);
        when(pricingService.quote(eq(vehicle), eq(start), eq(end), isNull(), any()))
                .thenReturn(quote);
        when(reservationFactory.create(eq(user), eq(vehicle), eq(start), eq(end), any()))
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
        when(vehicleRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(vehicle));
        when(reservationRepository.countOverlapping(eq(1L), eq(start), eq(end), anyCollection()))
                .thenReturn(1L);

        assertThatThrownBy(() -> bookingFacade.bookCar("user@test.kz", request))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("not available");
    }

    @Test
    void rejectsVehicleUnderMaintenance() {
        vehicle.setStatus(VehicleStatus.MAINTENANCE);
        when(userRepository.findByEmailIgnoreCase("user@test.kz")).thenReturn(Optional.of(user));
        when(vehicleRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(vehicle));

        assertThatThrownBy(() -> bookingFacade.bookCar("user@test.kz", request))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("not available");
    }

    @Test
    void rejectsBookingWithoutLicense() {
        user.setDrivingLicense(null);
        when(userRepository.findByEmailIgnoreCase("user@test.kz")).thenReturn(Optional.of(user));
        when(vehicleRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(vehicle));

        assertThatThrownBy(() -> bookingFacade.bookCar("user@test.kz", request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("driving licence");
    }

    @Test
    void rejectsBookingWithWrongLicense() {
        user.setDrivingLicense(VehicleLicense.B);
        vehicle.setRequiredLicense(VehicleLicense.SPECIAL);
        when(userRepository.findByEmailIgnoreCase("user@test.kz")).thenReturn(Optional.of(user));
        when(vehicleRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(vehicle));

        assertThatThrownBy(() -> bookingFacade.bookCar("user@test.kz", request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("does not allow");
    }

    @Test
    void rejectsHourlyBookingWithoutHourlyPrice() {
        vehicle.setPricePerHour(null);
        vehicle.setRequiredLicense(VehicleLicense.SPECIAL);
        user.setDrivingLicense(VehicleLicense.SPECIAL);
        ReservationRequest hourly = new ReservationRequest(1L, start, start, 4, null);
        when(userRepository.findByEmailIgnoreCase("user@test.kz")).thenReturn(Optional.of(user));
        when(vehicleRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(vehicle));
        when(reservationRepository.countOverlapping(eq(1L), eq(start), eq(start.plusDays(1)), anyCollection()))
                .thenReturn(0L);
        when(pricingService.quote(eq(vehicle), eq(start), eq(start.plusDays(1)), eq(4), any()))
                .thenThrow(new BadRequestException("Hourly rental is not available for this vehicle"));

        assertThatThrownBy(() -> bookingFacade.bookCar("user@test.kz", hourly))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Hourly rental is not available");
    }
}
