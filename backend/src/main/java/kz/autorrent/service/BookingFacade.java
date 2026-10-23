package kz.autorrent.service;

import kz.autorrent.dto.reservation.ReservationRequest;
import kz.autorrent.dto.reservation.ReservationResponse;
import kz.autorrent.entity.Vehicle;
import kz.autorrent.entity.Reservation;
import kz.autorrent.entity.User;
import kz.autorrent.entity.enums.VehicleStatus;
import kz.autorrent.exception.BadRequestException;
import kz.autorrent.exception.ConflictException;
import kz.autorrent.exception.NotFoundException;
import kz.autorrent.mapper.DtoMapper;
import kz.autorrent.repository.VehicleRepository;
import kz.autorrent.repository.ReservationRepository;
import kz.autorrent.repository.UserRepository;
import kz.autorrent.service.pricing.PriceQuote;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/**
 * Бронирование одной единицы техники.
 *
 * Проверки: техника активна, даты корректны (не в прошлом, конец позже начала),
 * нет пересечений с другими бронями, категория водительского удостоверения
 * клиента соответствует требованиям техники.
 */
@Service
@RequiredArgsConstructor
public class BookingFacade {

    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final ReservationRepository reservationRepository;
    private final PricingService pricingService;
    private final ReservationFactory reservationFactory;

    @Transactional
    public ReservationResponse bookCar(String email, ReservationRequest request) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new NotFoundException("User not found"));
        Vehicle vehicle = vehicleRepository.findByIdForUpdate(request.carId())
                .orElseThrow(() -> new NotFoundException("Vehicle not found: " + request.carId()));

        Reservation reservation = prepare(user, vehicle, request.startDate(), request.endDate(),
                request.hours(), request.withOperator());

        Reservation saved = reservationRepository.save(reservation);
        return DtoMapper.toReservationResponse(saved);
    }

    /**
     * Проверяет валидность брони и собирает несохранённую бронь (PENDING).
     * Переиспользуется бизнес-заявкой (несколько позиций в одной заявке).
     * Требует, чтобы vehicle уже был загружен (с блокировкой — при бронировании).
     */
    Reservation prepare(User user, Vehicle vehicle, LocalDate startDate, LocalDate endDate,
                        Integer hours, Boolean withOperator) {
        if (vehicle.getStatus() != VehicleStatus.ACTIVE) {
            throw new ConflictException("Vehicle is not available for booking");
        }

        boolean hourly = hours != null;
        // Почасовая аренда занимает один день: храним полуинтервал [день, день+1),
        // чтобы проверка пересечений и календарь занятости работали единообразно.
        LocalDate effectiveEnd = hourly ? startDate.plusDays(1) : endDate;

        if (hourly) {
            BookingRules.validateHours(hours);
            if (startDate.isBefore(LocalDate.now())) {
                throw new BadRequestException("startDate cannot be in the past");
            }
        } else {
            BookingRules.validateDates(startDate, effectiveEnd);
        }

        checkDriverLicense(user, vehicle);

        long conflicts = reservationRepository.countOverlapping(
                vehicle.getId(), startDate, effectiveEnd, BookingRules.ACTIVE_STATUSES);
        if (conflicts > 0) {
            throw new ConflictException("Vehicle is not available for the selected dates");
        }

        PriceQuote quote = pricingService.quote(vehicle, startDate, effectiveEnd, hours, withOperator);
        return reservationFactory.create(user, vehicle, startDate, effectiveEnd, quote);
    }

    /**
     * Проверка категории водительского удостоверения: права клиента должны
     * допускать вождение техники требуемой категории (см. VehicleLicense.allows).
     */
    static void checkDriverLicense(User user, Vehicle vehicle) {
        if (vehicle.getRequiredLicense() == null) {
            return;
        }
        if (user.getDrivingLicense() == null) {
            throw new BadRequestException(
                    "Your driving licence category is not specified. Add it in your profile to book this vehicle");
        }
        if (!user.getDrivingLicense().allows(vehicle.getRequiredLicense())) {
            throw new BadRequestException(
                    "Your driving licence category " + user.getDrivingLicense()
                            + " does not allow renting a vehicle that requires " + vehicle.getRequiredLicense());
        }
    }
}
