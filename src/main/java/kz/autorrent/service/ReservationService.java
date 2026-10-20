package kz.autorrent.service;

import kz.autorrent.dto.common.PageResponse;
import kz.autorrent.dto.reservation.ReservationResponse;
import kz.autorrent.dto.reservation.ReservationUpdateRequest;
import kz.autorrent.entity.Car;
import kz.autorrent.entity.Reservation;
import kz.autorrent.entity.User;
import kz.autorrent.entity.enums.CarStatus;
import kz.autorrent.entity.enums.ReservationStatus;
import kz.autorrent.entity.enums.Role;
import kz.autorrent.exception.ConflictException;
import kz.autorrent.exception.NotFoundException;
import kz.autorrent.mapper.DtoMapper;
import kz.autorrent.repository.CarRepository;
import kz.autorrent.repository.ReservationRepository;
import kz.autorrent.repository.ReviewRepository;
import kz.autorrent.repository.UserRepository;
import kz.autorrent.security.CustomUserDetails;
import kz.autorrent.service.pricing.PricingResult;
import kz.autorrent.service.pricing.PricingStrategyResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final CarRepository carRepository;
    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final PricingStrategyResolver pricingStrategyResolver;

    @Transactional(readOnly = true)
    public PageResponse<ReservationResponse> getMy(String email, Pageable pageable) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new NotFoundException("User not found"));
        return PageResponse.from(reservationRepository
                .findByUserIdWithDetails(user.getId(), pageable)
                .map(DtoMapper::toReservationResponse));
    }

    @Transactional(readOnly = true)
    public PageResponse<ReservationResponse> getAll(Pageable pageable) {
        return PageResponse.from(reservationRepository
                .findAllWithDetails(pageable)
                .map(DtoMapper::toReservationResponse));
    }

    @Transactional(readOnly = true)
    public ReservationResponse getById(Long id, CustomUserDetails principal) {
        Reservation reservation = find(id);
        checkAccess(reservation, principal);
        return DtoMapper.toReservationResponse(reservation);
    }

    @Transactional
    public ReservationResponse cancel(Long id, CustomUserDetails principal, String reason) {
        Reservation reservation = find(id);
        checkAccess(reservation, principal);

        if (!reservation.isActive()) {
            throw new ConflictException("Only pending or confirmed reservations can be cancelled");
        }
        if (principal.getRole() != Role.ADMIN
                && !LocalDate.now().isBefore(reservation.getStartDate())) {
            throw new ConflictException("Reservation can only be cancelled before the rental starts");
        }

        String defaultReason = principal.getRole() == Role.ADMIN
                ? "Cancelled by admin"
                : "Cancelled by user";
        reservation.setStatus(ReservationStatus.CANCELLED);
        reservation.setCancellationReason(reason == null || reason.isBlank()
                ? defaultReason
                : BookingRules.normalizeCancellationReason(reason));

        return DtoMapper.toReservationResponse(reservationRepository.save(reservation));
    }

    @Transactional
    public ReservationResponse update(Long id, ReservationUpdateRequest request) {
        Reservation reservation = find(id);
        if (!reservation.isActive()) {
            throw new ConflictException("Only pending or confirmed reservations can be updated");
        }

        BookingRules.validateDates(request.startDate(), request.endDate());

        Car car = carRepository.findByIdForUpdate(reservation.getCar().getId())
                .orElseThrow(() -> new NotFoundException("Car not found"));
        if (car.getStatus() != CarStatus.ACTIVE) {
            throw new ConflictException("Car is not available for booking");
        }

        long conflicts = reservationRepository.countOverlappingExcluding(
                car.getId(),
                reservation.getId(),
                request.startDate(),
                request.endDate(),
                BookingRules.ACTIVE_STATUSES
        );
        if (conflicts > 0) {
            throw new ConflictException("Car is not available for the selected dates");
        }

        long days = BookingRules.daysBetween(request.startDate(), request.endDate());
        PricingResult pricing = pricingStrategyResolver.resolve(days)
                .calculate(car.getPricePerDay(), days);

        reservation.setStartDate(request.startDate());
        reservation.setEndDate(request.endDate());
        reservation.setDaysCount(pricing.days());
        reservation.setPricePerDaySnapshot(pricing.pricePerDay());
        reservation.setTotalPrice(pricing.totalPrice());

        return DtoMapper.toReservationResponse(reservationRepository.save(reservation));
    }

    @Transactional
    public ReservationResponse updateStatus(Long id, ReservationStatus newStatus) {
        Reservation reservation = find(id);
        ReservationStatus current = reservation.getStatus();

        if (current == newStatus) {
            return DtoMapper.toReservationResponse(reservation);
        }
        if (!isTransitionAllowed(current, newStatus)) {
            throw new ConflictException("Cannot change reservation status from "
                    + current + " to " + newStatus);
        }
        if (newStatus == ReservationStatus.CONFIRMED
                && reservation.getCar().getStatus() != CarStatus.ACTIVE) {
            throw new ConflictException("Car is not active and cannot be confirmed");
        }
        if (newStatus == ReservationStatus.COMPLETED
                && reservation.getEndDate().isAfter(LocalDate.now())) {
            throw new ConflictException("Reservation can be completed only after the end date");
        }
        if (newStatus == ReservationStatus.CANCELLED
                && reservation.getCancellationReason() == null) {
            reservation.setCancellationReason("Cancelled by admin");
        }

        reservation.setStatus(newStatus);
        return DtoMapper.toReservationResponse(reservationRepository.save(reservation));
    }

    @Transactional
    public void delete(Long id) {
        Reservation reservation = find(id);
        if (reservation.getStatus() != ReservationStatus.CANCELLED) {
            throw new ConflictException("Only cancelled reservations can be deleted");
        }
        if (reviewRepository.existsByReservationId(id)) {
            throw new ConflictException("Reservation has a review and cannot be deleted");
        }
        reservationRepository.delete(reservation);
    }

    private Reservation find(Long id) {
        return reservationRepository.findWithDetailsById(id)
                .orElseThrow(() -> new NotFoundException("Reservation not found: " + id));
    }

    private void checkAccess(Reservation reservation, CustomUserDetails principal) {
        if (principal == null) {
            throw new AccessDeniedException("Access denied");
        }
        if (principal.getRole() == Role.ADMIN) {
            return;
        }
        if (!reservation.getUser().getId().equals(principal.getId())) {
            throw new AccessDeniedException("Access denied");
        }
    }

    private boolean isTransitionAllowed(ReservationStatus current, ReservationStatus next) {
        return switch (current) {
            case PENDING -> next == ReservationStatus.CONFIRMED || next == ReservationStatus.CANCELLED;
            case CONFIRMED -> next == ReservationStatus.COMPLETED || next == ReservationStatus.CANCELLED;
            case COMPLETED, CANCELLED -> false;
        };
    }
}
