package kz.autorrent.controller;

import jakarta.validation.Valid;
import kz.autorrent.dto.vehicle.VehicleFilter;
import kz.autorrent.dto.vehicle.VehicleRequest;
import kz.autorrent.dto.vehicle.VehicleResponse;
import kz.autorrent.dto.vehicle.VehicleStatusRequest;
import kz.autorrent.dto.common.PageResponse;
import kz.autorrent.entity.enums.VehicleCategory;
import kz.autorrent.entity.enums.VehicleType;
import kz.autorrent.service.VehicleService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Каталог техники. Канонический путь — /api/v1/vehicles;
 * /api/v1/cars сохранён как обратно совместимый алиас, чтобы не сломать
 * фронтенд, скрипты и клиентов прошлой версии.
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
                                                @RequestParam(defaultValue = "0") int page,
                                                @RequestParam(defaultValue = "10") int size,
                                                @RequestParam(defaultValue = "id") String sortBy,
                                                @RequestParam(defaultValue = "asc") String direction) {
        return vehicleService.search(
                VehicleFilter.of(brand, city, type, category, maxPrice, maxCapacity, withOperator),
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
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "pricePerDay") String sortBy,
            @RequestParam(defaultValue = "asc") String direction) {
        return vehicleService.searchAvailable(
                VehicleFilter.of(brand, city, type, category, maxPrice, maxCapacity, withOperator),
                startDate,
                endDate,
                PageRequestFactory.cars(page, size, sortBy, direction)
        );
    }

    @GetMapping("/{id}")
    public VehicleResponse getById(@PathVariable Long id) {
        return vehicleService.getById(id);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<VehicleResponse> create(@Valid @RequestBody VehicleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(vehicleService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public VehicleResponse update(@PathVariable Long id, @Valid @RequestBody VehicleRequest request) {
        return vehicleService.update(id, request);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public VehicleResponse updateStatus(@PathVariable Long id,
                                        @Valid @RequestBody VehicleStatusRequest request) {
        return vehicleService.updateStatus(id, request.status());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        vehicleService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
