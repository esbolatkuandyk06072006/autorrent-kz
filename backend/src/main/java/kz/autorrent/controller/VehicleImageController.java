package kz.autorrent.controller;

import kz.autorrent.dto.vehicle.VehicleResponse;
import kz.autorrent.security.CustomUserDetails;
import kz.autorrent.service.VehicleImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Загрузка фотографий техники.
 *
 * POST   /api/v1/vehicles/{id}/images — multipart, несколько файлов сразу.
 * DELETE /api/v1/vehicles/{id}/images imageUrl=... — убрать одно фото.
 * DELETE /api/v1/vehicles/{id}/images/all — очистить галерею.
 *
 * Доступ: админ — любой техникой; владелец (OWNER) — только своей
 * (проверка владения в VehicleImageService, по образцу checkManageAccess).
 *
 * Файлы сохраняются в каталог загрузок и отдаются по /images/vehicles/{id}/{file}.
 * Возвращает обновлённый ответ по технике (с актуальным списком images).
 */
@RestController
@RequiredArgsConstructor
public class VehicleImageController {

    private final VehicleImageService vehicleImageService;

    @PostMapping(value = "/api/v1/vehicles/{id}/images",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'OWNER')")
    public VehicleResponse upload(@PathVariable Long id,
                                  @RequestParam("files") List<MultipartFile> files,
                                  @AuthenticationPrincipal CustomUserDetails principal) {
        return vehicleImageService.uploadImages(id, files, principal);
    }

    @DeleteMapping("/api/v1/vehicles/{id}/images")
    @PreAuthorize("hasAnyRole('ADMIN', 'OWNER')")
    public VehicleResponse removeImage(@PathVariable Long id,
                                       @RequestParam String imageUrl,
                                       @AuthenticationPrincipal CustomUserDetails principal) {
        return vehicleImageService.removeImage(id, imageUrl, principal);
    }

    @DeleteMapping("/api/v1/vehicles/{id}/images/all")
    @PreAuthorize("hasAnyRole('ADMIN', 'OWNER')")
    public VehicleResponse clearImages(@PathVariable Long id,
                                       @AuthenticationPrincipal CustomUserDetails principal) {
        return vehicleImageService.clearImages(id, principal);
    }
}
