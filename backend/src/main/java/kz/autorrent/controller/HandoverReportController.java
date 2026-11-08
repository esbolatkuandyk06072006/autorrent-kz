package kz.autorrent.controller;

import kz.autorrent.dto.handover.HandoverReportResponse;
import kz.autorrent.entity.enums.HandoverType;
import kz.autorrent.security.CustomUserDetails;
import kz.autorrent.service.HandoverReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Шаг 8: акты приёма-передачи техники по брони.
 *
 * GET  /api/v1/reservations/{id}/handover — оба акта брони (выдача и возврат).
 * POST /api/v1/reservations/{id}/handover — составить акт (multipart: поля + фото).
 *
 * Доступ — как у просмотра брони: клиент-владелец брони, владелец техники, админ.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/reservations/{reservationId}/handover")
public class HandoverReportController {

    private final HandoverReportService handoverReportService;

    @GetMapping
    public List<HandoverReportResponse> list(@PathVariable Long reservationId,
                                             @AuthenticationPrincipal CustomUserDetails principal) {
        return handoverReportService.list(reservationId, principal);
    }

    @PostMapping(consumes = {"multipart/form-data"})
    public ResponseEntity<HandoverReportResponse> create(
            @PathVariable Long reservationId,
            @RequestParam HandoverType type,
            @RequestParam(required = false) String fuelLevel,
            @RequestParam(required = false) Integer mileage,
            @RequestParam(required = false) String damagesNote,
            @RequestParam(required = false) List<MultipartFile> files,
            @AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                handoverReportService.create(reservationId, type, fuelLevel, mileage,
                        damagesNote, files, principal)
        );
    }
}
