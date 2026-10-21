package kz.autorrent.service;

import kz.autorrent.dto.reservation.ReservationRequest;
import kz.autorrent.dto.reservation.ReservationResponse;
import kz.autorrent.entity.Vehicle;
import kz.autorrent.entity.Reservation;
import kz.autorrent.entity.User;
import kz.autorrent.entity.enums.VehicleStatus;
import kz.autorrent.exception.ConflictException;
import kz.autorrent.exception.NotFoundException;
import kz.autorrent.mapper.DtoMapper;
import kz.autorrent.repository.VehicleRepository;
import kz.autorrent.repository.ReservationRepository;
import kz.autorrent.repository.UserRepository;
import kz.autorrent.service.pricing.PricingResult;
import kz.autorrent.service.pricing.PricingStrategyResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class BookingFacade {

    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final ReservationRepository reservationRepository;
    private final PricingStrategyResolver pricingStrategyResolver;
    private final ReservationFactory reservationFactory;

    @Transactional
    public ReservationResponse bookCar(String email, ReservationRequest request) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new NotFoundException("User not found"));
        Vehicle vehicle = vehicleRepository.findByIdForUpdate(request.carId())
                .orElseThrow(() -> new NotFoundException("Vehicle not found: " + request.carId()));

        if (vehicle.getStatus() != VehicleStatus.ACTIVE) {
            throw new ConflictException("Vehicle is not available for booking");
        }

        BookingRules.validateDates(request.startDate(), request.endDate());

        long conflicts = reservationRepository.countOverlapping(
                vehicle.getId(),
                request.startDate(),
                request.endDate(),
                BookingRules.ACTIVE_STATUSES
        );
        if (conflicts > 0) {
            throw new ConflictException("Vehicle is not available for the selected dates");
        }

        long days = BookingRules.daysBetween(request.startDate(), request.endDate());
        PricingResult pricing = pricingStrategyResolver.resolve(days)
                .calculate(vehicle.getPricePerDay(), days);

        Reservation reservation = reservationFactory.create(
                user, vehicle, request.startDate(), request.endDate(), pricing);
        Reservation saved = reservationRepository.save(reservation);

        return DtoMapper.toReservationResponse(saved);
    }
}
