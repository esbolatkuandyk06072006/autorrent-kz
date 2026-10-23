package kz.autorrent.controller;

import jakarta.validation.Valid;
import kz.autorrent.dto.vehicle.VehicleFilter;
import kz.autorrent.dto.vehicle.VehicleRequest;
import kz.autorrent.dto.vehicle.VehicleResponse;
import kz.autorrent.dto.vehicle.VehicleStatusRequest;
import kz.autorrent.dto.common.PageResponse;
import kz.autorrent.entity.enums.VehicleCategory;
import kz.autorrent.entity.enums.VehicleType;
import kz.autorrent.security.CustomUserDetails;
import kz.autorrent.service.VehicleService;
import kz.autorrent.service.pricing.PriceQuote;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Каталог техники. Канонический путь — /api/v1/vehicles;
 * /api/v1/cars сохранён как обратно совместимый алиас, чтобы не сломать
 * фронтенд, скрипты и клиентов прошлой версии.
 *
 * Владелец (роль OWNER) и админ добавляют/правят технику; календарь
 * занятости и предпросмотр цены доступны всем посетителям каталога.
 */
@RestController
@RequestMapping({"/api/v1/vehicles", "/api/v1/cars"})
@RequiredArgsConstructor
public class VehicleController {

    private final VehicleService vehicleService;

    @GetMapping
    public PageResponse<VehicleResponse> search(@RequestParam(required = false) String brand,
                                                @RequestParam(required = false) String city,
                                                @RequestParam(required = false) VehicleType type,
                                                @RequestParam(required = false) VehicleCategory category,
                                                @RequestParam(required = false) BigDecimal maxPrice,
                                                @RequestParam(required = false) BigDecimal maxCapacity,
                                                @RequestParam(required = false) Boolean withOperator,
                                                @RequestParam(required = false) String tag,
                                                @RequestParam(defaultValue = "0") int page,
                                                @RequestParam(defaultValue = "10") int size,
                                                @RequestParam(defaultValue = "id") String sortBy,
                                                @RequestParam(defaultValue = "asc") String direction) {
        return vehicleService.search(
                VehicleFilter.of(brand, city, type, category, maxPrice, maxCapacity, withOperator, tag),
                PageRequestFactory.cars(page, size, sortBy, direction)
        );
    }

    @GetMapping("/available")
    public PageResponse<VehicleResponse> available(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) VehicleType type,
            @RequestParam(required = false) VehicleCategory category,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) BigDecimal maxCapacity,
            @RequestParam(required = false) Boolean withOperator,
            @RequestParam(required = false) String tag,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "pricePerDay") String sortBy,
            @RequestParam(defaultValue = "asc") String direction) {
        return vehicleService.searchAvailable(
                VehicleFilter.of(brand, city, type, category, maxPrice, maxCapacity, withOperator, tag),
                startDate,
                endDate,
                PageRequestFactory.cars(page, size, sortBy, direction)
        );
    }

    /** Техника владельца (OWNER) или вся техника (админ) — для панели управления. */
    @GetMapping("/mine")
    @PreAuthorize("hasAnyRole('ADMIN', 'OWNER')")
    public PageResponse<VehicleResponse> myVehicles(
            @AuthenticationPrincipal CustomUserDetails principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {
        return vehicleService.getMy(principal, PageRequestFactory.cars(page, size, sortBy, direction));
    }

    /**
     * Календарь занятости: даты, которые нельзя выбрать (техника уже забронирована).
     * from/to необязательны: по умолчанию — ближайшие полгода.
     */
    @GetMapping("/{id}/busy-dates")
    public List<String> busyDates(@PathVariable Long id,
                                  @RequestParam(required = false)
                                  @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                  @RequestParam(required = false)
                                  @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return vehicleService.busyDates(id, from, to);
    }

    /**
     * Предпросмотр стоимости: суточно (с учётом скидок и оператора) или
     * почасово (hours). Возвращает расчёт, не создавая бронь.
     */
    @GetMapping("/{id}/price-quote")
    public PriceQuote priceQuote(@PathVariable Long id,
                                 @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
                                 @RequestParam(required = false)
                                 @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
                                 @RequestParam(required = false) Integer hours,
                                 @RequestParam(required = false) Boolean withOperator) {
        return vehicleService.priceQuote(id, startDate, endDate, hours, withOperator);
    }

    @GetMapping("/{id}")
    public VehicleResponse getById(@PathVariable Long id) {
        return vehicleService.getById(id);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'OWNER')")
    public ResponseEntity<VehicleResponse> create(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody VehicleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(vehicleService.create(request, principal));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'OWNER')")
    public VehicleResponse update(@PathVariable Long id,
                                  @AuthenticationPrincipal CustomUserDetails principal,
                                  @Valid @RequestBody VehicleRequest request) {
        return vehicleService.update(id, request, principal);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'OWNER')")
    public VehicleResponse updateStatus(@PathVariable Long id,
                                        @AuthenticationPrincipal CustomUserDetails principal,
                                        @Valid @RequestBody VehicleStatusRequest request) {
        return vehicleService.updateStatus(id, request.status(), principal);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'OWNER')")
    public ResponseEntity<Void> delete(@PathVariable Long id,
                                       @AuthenticationPrincipal CustomUserDetails principal) {
        vehicleService.delete(id, principal);
        return ResponseEntity.noContent().build();
    }
}
