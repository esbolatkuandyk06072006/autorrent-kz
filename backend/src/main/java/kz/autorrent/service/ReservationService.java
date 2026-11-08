package kz.autorrent.service;

import kz.autorrent.dto.common.PageResponse;
import kz.autorrent.dto.reservation.ReservationResponse;
import kz.autorrent.dto.reservation.ReservationUpdateRequest;
import kz.autorrent.entity.Vehicle;
import kz.autorrent.entity.Reservation;
import kz.autorrent.entity.User;
import kz.autorrent.entity.enums.VehicleStatus;
import kz.autorrent.entity.enums.ReservationStatus;
import kz.autorrent.entity.enums.Role;
import kz.autorrent.exception.ConflictException;
import kz.autorrent.exception.NotFoundException;
import kz.autorrent.mapper.DtoMapper;
import kz.autorrent.repository.VehicleRepository;
import kz.autorrent.repository.ReservationRepository;
import kz.autorrent.repository.ReviewRepository;
import kz.autorrent.repository.UserRepository;
import kz.autorrent.security.CustomUserDetails;
import kz.autorrent.service.pricing.PriceQuote;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/**
 * Управление бронями: статусный цикл PENDING → CONFIRMED → ACTIVE → COMPLETED
 * (CANCELLED на любом активном этапе), просмотр и изменение дат.
 *
 * Доступ: админ — всё; владелец техники — брони по своей технике
 * (подтверждение, активация, завершение); клиент — свои брони.
 */
@Service
@RequiredArgsConstructor
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final VehicleRepository vehicleRepository;
    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final PricingService pricingService;

    @Transactional(readOnly = true)
    public PageResponse<ReservationResponse> getMy(String email, Pageable pageable) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new NotFoundException("User not found"));
        // Список своих броней — клиент видит код от ключа и инструкцию выдачи.
        return PageResponse.from(reservationRepository
                .findByUserIdWithDetails(user.getId(), pageable)
                .map(reservation -> DtoMapper.toReservationResponse(reservation, true)));
    }

    @Transactional(readOnly = true)
    public PageResponse<ReservationResponse> getAll(Pageable pageable) {
        return PageResponse.from(reservationRepository
                .findAllWithDetails(pageable)
                .map(DtoMapper::toReservationResponse));
    }

    /** Брони по технике владельца (роль OWNER) — для подтверждения заявок. */
    @Transactional(readOnly = true)
    public PageResponse<ReservationResponse> getForMyVehicles(String email, Pageable pageable) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new NotFoundException("User not found"));
        return PageResponse.from(reservationRepository
                .findByVehicleOwnerIdWithDetails(user.getId(), pageable)
                .map(DtoMapper::toReservationResponse));
    }

    @Transactional(readOnly = true)
    public ReservationResponse getById(Long id, CustomUserDetails principal) {
        Reservation reservation = find(id);
        checkAccess(reservation, principal);
        // Код от ключа и инструкция — только если смотрит сам клиент-владелец брони.
        boolean owner = principal != null
                && reservation.getUser().getId().equals(principal.getId());
        return DtoMapper.toReservationResponse(reservation, owner);
    }

    @Transactional
    public ReservationResponse cancel(Long id, CustomUserDetails principal, String reason) {
        Reservation reservation = find(id);
        checkAccess(reservation, principal);

        if (!reservation.isActive()) {
            throw new ConflictException("Only pending or confirmed reservations can be cancelled");
        }
        boolean privileged = principal.getRole() == Role.ADMIN || isVehicleOwner(reservation, principal);
        if (!privileged && !LocalDate.now().isBefore(reservation.getStartDate())) {
            throw new ConflictException("Reservation can only be cancelled before the rental starts");
        }

        String defaultReason = principal.getRole() == Role.ADMIN
                ? "Cancelled by admin"
                : (isVehicleOwner(reservation, principal) ? "Cancelled by owner" : "Cancelled by user");
        reservation.setStatus(ReservationStatus.CANCELLED);
        reservation.setCancellationReason(reason == null || reason.isBlank()
                ? defaultReason
                : BookingRules.normalizeCancellationReason(reason));

        // Отмена своей брони клиентом — в ответе виден код (если был).
        boolean owner = reservation.getUser().getId().equals(principal.getId());
        return DtoMapper.toReservationResponse(reservationRepository.save(reservation), owner);
    }

    @Transactional
    public ReservationResponse update(Long id, ReservationUpdateRequest request) {
        Reservation reservation = find(id);
        if (!reservation.isActive()) {
            throw new ConflictException("Only pending or confirmed reservations can be updated");
        }

        BookingRules.validateDates(request.startDate(), request.endDate());

        Vehicle vehicle = vehicleRepository.findByIdForUpdate(reservation.getVehicle().getId())
                .orElseThrow(() -> new NotFoundException("Vehicle not found"));
        if (vehicle.getStatus() != VehicleStatus.ACTIVE) {
            throw new ConflictException("Vehicle is not available for booking");
        }

        long conflicts = reservationRepository.countOverlappingExcluding(
                vehicle.getId(),
                reservation.getId(),
                request.startDate(),
                request.endDate(),
                BookingRules.ACTIVE_STATUSES
        );
        if (conflicts > 0) {
            throw new ConflictException("Vehicle is not available for the selected dates");
        }

        // Пересчёт с учётом режима брони (часы/оператор сохраняются как были).
        PriceQuote quote = pricingService.quote(vehicle, request.startDate(), request.endDate(),
                reservation.getHours(),
                Boolean.TRUE.equals(reservation.getWithOperator()));

        reservation.setStartDate(request.startDate());
        reservation.setEndDate(request.endDate());
        reservation.setDaysCount(quote.days());
        reservation.setPricePerDaySnapshot(quote.pricePerDay());
        reservation.setDiscountPercent(quote.discountPercent());
        reservation.setTotalPrice(quote.totalPrice());

        return DtoMapper.toReservationResponse(reservationRepository.save(reservation));
    }

    /**
     * Смена статуса брони. Доступны: админ и владелец техники.
     * Цикл: PENDING → CONFIRMED → ACTIVE → COMPLETED; CANCELLED на активных этапах.
     */
    @Transactional
    public ReservationResponse updateStatus(Long id, ReservationStatus newStatus, CustomUserDetails principal) {
        Reservation reservation = find(id);
        checkManageAccess(reservation, principal);
        ReservationStatus current = reservation.getStatus();

        if (current == newStatus) {
            return DtoMapper.toReservationResponse(reservation);
        }
        if (!isTransitionAllowed(current, newStatus)) {
            throw new ConflictException("Cannot change reservation status from "
                    + current + " to " + newStatus);
        }
        if (newStatus == ReservationStatus.CONFIRMED
                && reservation.getVehicle().getStatus() != VehicleStatus.ACTIVE) {
            throw new ConflictException("Vehicle is not active and cannot be confirmed");
        }
        if (newStatus == ReservationStatus.ACTIVE
                && LocalDate.now().isBefore(reservation.getStartDate())) {
            throw new ConflictException("Reservation can be activated only on the rental start date");
        }
        if (newStatus == ReservationStatus.COMPLETED
                && reservation.getEndDate().isAfter(LocalDate.now())) {
            throw new ConflictException("Reservation can be completed only after the end date");
        }
        if (newStatus == ReservationStatus.CANCELLED
                && reservation.getCancellationReason() == null) {
            reservation.setCancellationReason(principal.getRole() == Role.ADMIN
                    ? "Cancelled by admin" : "Cancelled by owner");
        }

        reservation.setStatus(newStatus);
        // Шаг 8: при подтверждении брони выдаём клиенту код от ключа (4 цифры).
        if (newStatus == ReservationStatus.CONFIRMED && reservation.getKeyCode() == null) {
            reservation.setKeyCode(BookingRules.generateKeyCode());
        }
        // Ответ для админа/владельца техники — без кода от ключа клиента.
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

    /** Просмотр: админ, владелец техники или сам клиент. */
    private void checkAccess(Reservation reservation, CustomUserDetails principal) {
        if (principal == null) {
            throw new AccessDeniedException("Access denied");
        }
        if (principal.getRole() == Role.ADMIN || isVehicleOwner(reservation, principal)) {
            return;
        }
        if (!reservation.getUser().getId().equals(principal.getId())) {
            throw new AccessDeniedException("Access denied");
        }
    }

    /** Управление статусом: админ или владелец техники. */
    private void checkManageAccess(Reservation reservation, CustomUserDetails principal) {
        if (principal == null) {
            throw new AccessDeniedException("Access denied");
        }
        if (principal.getRole() != Role.ADMIN && !isVehicleOwner(reservation, principal)) {
            throw new AccessDeniedException("Only the vehicle owner or an admin can manage this reservation");
        }
    }

    private boolean isVehicleOwner(Reservation reservation, CustomUserDetails principal) {
        if (principal.getRole() != Role.OWNER) {
            return false;
        }
        Long ownerId = reservation.getVehicle().getOwner() == null
                ? null : reservation.getVehicle().getOwner().getId();
        return ownerId != null && ownerId.equals(principal.getId());
    }

    /**
     * Статусный цикл брони:
     * PENDING → CONFIRMED / CANCELLED;
     * CONFIRMED → ACTIVE / COMPLETED / CANCELLED;
     * ACTIVE → COMPLETED / CANCELLED;
     * COMPLETED, CANCELLED — финальные.
     */
    private boolean isTransitionAllowed(ReservationStatus current, ReservationStatus next) {
        return switch (current) {
            case PENDING -> next == ReservationStatus.CONFIRMED || next == ReservationStatus.CANCELLED;
            case CONFIRMED -> next == ReservationStatus.ACTIVE
                    || next == ReservationStatus.COMPLETED
                    || next == ReservationStatus.CANCELLED;
            case ACTIVE -> next == ReservationStatus.COMPLETED || next == ReservationStatus.CANCELLED;
            case COMPLETED, CANCELLED -> false;
        };
    }
}
