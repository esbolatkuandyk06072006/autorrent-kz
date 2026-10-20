package kz.autorrent.controller;

import jakarta.validation.Valid;
import kz.autorrent.dto.car.CarFilter;
import kz.autorrent.dto.car.CarRequest;
import kz.autorrent.dto.car.CarResponse;
import kz.autorrent.dto.car.CarStatusRequest;
import kz.autorrent.dto.common.PageResponse;
import kz.autorrent.entity.enums.CarCategory;
import kz.autorrent.service.CarService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/cars")
@RequiredArgsConstructor
public class CarController {

    private final CarService carService;

    @GetMapping
    public PageResponse<CarResponse> search(@RequestParam(required = false) String brand,
                                            @RequestParam(required = false) String city,
                                            @RequestParam(required = false) CarCategory category,
                                            @RequestParam(required = false) BigDecimal maxPrice,
                                            @RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "10") int size,
                                            @RequestParam(defaultValue = "id") String sortBy,
                                            @RequestParam(defaultValue = "asc") String direction) {
        return carService.search(
                CarFilter.of(brand, city, category, maxPrice),
                PageRequestFactory.cars(page, size, sortBy, direction)
        );
    }

    @GetMapping("/available")
    public PageResponse<CarResponse> available(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) CarCategory category,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "pricePerDay") String sortBy,
            @RequestParam(defaultValue = "asc") String direction) {
        return carService.searchAvailable(
                CarFilter.of(brand, city, category, maxPrice),
                startDate,
                endDate,
                PageRequestFactory.cars(page, size, sortBy, direction)
        );
    }

    @GetMapping("/{id}")
    public CarResponse getById(@PathVariable Long id) {
        return carService.getById(id);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CarResponse> create(@Valid @RequestBody CarRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(carService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public CarResponse update(@PathVariable Long id, @Valid @RequestBody CarRequest request) {
        return carService.update(id, request);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public CarResponse updateStatus(@PathVariable Long id,
                                    @Valid @RequestBody CarStatusRequest request) {
        return carService.updateStatus(id, request.status());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        carService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
