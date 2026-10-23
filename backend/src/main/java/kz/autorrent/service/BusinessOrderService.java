package kz.autorrent.service;

import kz.autorrent.dto.business.BusinessOrderItemRequest;
import kz.autorrent.dto.business.BusinessOrderResponse;
import kz.autorrent.entity.BusinessOrder;
import kz.autorrent.entity.Reservation;
import kz.autorrent.entity.User;
import kz.autorrent.entity.enums.Role;
import kz.autorrent.exception.BadRequestException;
import kz.autorrent.exception.ForbiddenException;
import kz.autorrent.exception.NotFoundException;
import kz.autorrent.repository.BusinessOrderRepository;
import kz.autorrent.repository.ReservationRepository;
import kz.autorrent.repository.UserRepository;
import kz.autorrent.repository.VehicleRepository;
import kz.autorrent.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Бизнес-заявки (режим «Для бизнеса»): несколько единиц техники в одной
 * заявке на юрлицо (название компании + БИН). Каждая позиция проходит ту же
 * валидацию, что и обычное бронирование (даты, пересечения, права), и
 * сохраняется как бронь со ссылкой на заказ — поэтому календарь занятости,
 * статусы и подтверждение работают без изменений.
 */
@Service
@RequiredArgsConstructor
public class BusinessOrderService {

    /** Максимум позиций в одной заявке. */
    private static final int MAX_ITEMS = 10;

    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final ReservationRepository reservationRepository;
    private final BusinessOrderRepository businessOrderRepository;
    private final BookingFacade bookingFacade;

    @Transactional
    public BusinessOrderResponse create(String email,
                                        String companyName,
                                        String bin,
                                        List<BusinessOrderItemRequest> items) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new NotFoundException("User not found"));

        if (companyName == null || companyName.isBlank()) {
            throw new BadRequestException("companyName is required");
        }
        String normalizedBin = bin == null ? "" : bin.trim();
        if (!normalizedBin.matches("\\d{12}")) {
            throw new BadRequestException("BIN must be 12 digits");
        }
        if (items == null || items.isEmpty()) {
            throw new BadRequestException("At least one item is required");
        }
        if (items.size() > MAX_ITEMS) {
            throw new BadRequestException("A business order can contain at most " + MAX_ITEMS + " items");
        }

        BusinessOrder order = BusinessOrder.builder()
                .user(user)
                .companyName(companyName.trim())
                .bin(normalizedBin)
                .totalPrice(BigDecimal.ZERO)
                .build();
        // Заказ сохраняется первым: позиции (брони) ссылаются на него по FK.
        businessOrderRepository.save(order);

        BigDecimal total = BigDecimal.ZERO;
        List<Reservation> reservations = new ArrayList<>();
        for (BusinessOrderItemRequest item : items) {
            Reservation reservation = buildItem(user, order, item);
            reservations.add(reservation);
            total = total.add(reservation.getTotalPrice());
        }

        order.setTotalPrice(total.setScale(2, java.math.RoundingMode.HALF_UP));
        reservationRepository.saveAll(reservations);

        return toResponse(order, reservations, user);
    }

    /** Собирает одну позицию заявки: загружает технику и валидирует бронь. */
    private Reservation buildItem(User user, BusinessOrder order, BusinessOrderItemRequest item) {
        var vehicle = vehicleRepository.findById(item.carId())
                .orElseThrow(() -> new NotFoundException("Vehicle not found: " + item.carId()));

        Reservation reservation = bookingFacade.prepare(
                user, vehicle, item.startDate(), item.endDate(), item.hours(), item.withOperator());
        reservation.setBusinessOrder(order);
        return reservation;
    }

    @Transactional(readOnly = true)
    public BusinessOrderResponse getById(Long id, CustomUserDetails principal) {
        BusinessOrder order = findOrder(id);
        checkAccess(order, principal);
        List<Reservation> items = reservationRepository.findByBusinessOrderId(id);
        return toResponse(order, items, order.getUser());
    }

    @Transactional(readOnly = true)
    public List<BusinessOrderResponse> getMy(String email) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new NotFoundException("User not found"));
        List<BusinessOrder> orders = reservationRepository.findBusinessOrdersByUserId(user.getId());
        return orders.stream()
                .map(order -> toResponse(order, reservationRepository.findByBusinessOrderId(order.getId()),
                        user))
                .toList();
    }

    /** Доступ: админ, владелец техники (для будущего) или сам заявитель. */
    private void checkAccess(BusinessOrder order, CustomUserDetails principal) {
        if (principal == null) {
            throw new ForbiddenException("Access denied");
        }
        if (principal.getRole() == Role.ADMIN || principal.getRole() == Role.OWNER) {
            return;
        }
        if (!order.getUser().getId().equals(principal.getId())) {
            throw new ForbiddenException("Access denied");
        }
    }

    private BusinessOrder findOrder(Long id) {
        return reservationRepository.findBusinessOrderById(id)
                .orElseThrow(() -> new NotFoundException("Business order not found: " + id));
    }

    private BusinessOrderResponse toResponse(BusinessOrder order,
                                             List<Reservation> reservations,
                                             User user) {
        List<BusinessOrderResponse.ReservationSummary> items = reservations.stream()
                .map(this::toSummary)
                .toList();
        return new BusinessOrderResponse(
                order.getId(),
                order.getCompanyName(),
                order.getBin(),
                user.getId(),
                user.getEmail(),
                order.getTotalPrice(),
                resolveStatus(reservations),
                items,
                order.getCreatedAt()
        );
    }

    private BusinessOrderResponse.ReservationSummary toSummary(Reservation r) {
        return new BusinessOrderResponse.ReservationSummary(
                r.getId(),
                r.getVehicle().getId(),
                r.getVehicle().getBrand(),
                r.getVehicle().getModel(),
                r.getVehicle().getLicensePlate(),
                r.getVehicle().getCity(),
                r.getStartDate(),
                r.getEndDate(),
                r.getHours() == null ? r.getDaysCount() : 0,
                r.getHours(),
                r.getWithOperator(),
                r.getPricePerDaySnapshot(),
                r.getTotalPrice(),
                r.getStatus() == null ? null : r.getStatus().name(),
                r.getDiscountPercent()
        );
    }

    /** Сводный статус заявки: пока есть активные позиции — активна, иначе завершена. */
    private String resolveStatus(List<Reservation> reservations) {
        boolean anyActive = reservations.stream().anyMatch(r -> r.isActive());
        return anyActive ? "ACTIVE" : "COMPLETED";
    }
}
