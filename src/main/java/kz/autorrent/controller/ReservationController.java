package kz.autorrent.controller;

import jakarta.validation.Valid;
import kz.autorrent.dto.common.PageResponse;
import kz.autorrent.dto.reservation.ReservationRequest;
import kz.autorrent.dto.reservation.ReservationResponse;
import kz.autorrent.dto.reservation.ReservationStatusRequest;
import kz.autorrent.dto.reservation.ReservationUpdateRequest;
import kz.autorrent.security.CustomUserDetails;
import kz.autorrent.service.BookingFacade;
import kz.autorrent.service.ReservationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/reservations")
@RequiredArgsConstructor
public class ReservationController {

    private final BookingFacade bookingFacade;
    private final ReservationService reservationService;

    @PostMapping
    public ResponseEntity<ReservationResponse> create(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody ReservationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(bookingFacade.bookCar(principal.getUsername(), request));
    }

    @GetMapping("/my")
    public PageResponse<ReservationResponse> myReservations(
            @AuthenticationPrincipal CustomUserDetails principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {
        return reservationService.getMy(
                principal.getUsername(),
                PageRequestFactory.reservations(page, size, sortBy, direction)
        );
    }

    @GetMapping("/{id}")
    public ReservationResponse getById(@PathVariable Long id,
                                       @AuthenticationPrincipal CustomUserDetails principal) {
        return reservationService.getById(id, principal);
    }

    @PatchMapping("/{id}/cancel")
    public ReservationResponse cancel(@PathVariable Long id,
                                      @AuthenticationPrincipal CustomUserDetails principal,
                                      @RequestParam(required = false) String reason) {
        return reservationService.cancel(id, principal, reason);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public PageResponse<ReservationResponse> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {
        return reservationService.getAll(
                PageRequestFactory.reservations(page, size, sortBy, direction)
        );
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ReservationResponse update(@PathVariable Long id,
                                      @Valid @RequestBody ReservationUpdateRequest request) {
        return reservationService.update(id, request);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ReservationResponse updateStatus(@PathVariable Long id,
                                            @Valid @RequestBody ReservationStatusRequest request) {
        return reservationService.updateStatus(id, request.status());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        reservationService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
