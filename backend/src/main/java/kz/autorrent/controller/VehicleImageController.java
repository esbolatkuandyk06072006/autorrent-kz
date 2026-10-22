package kz.autorrent.controller;

import kz.autorrent.dto.vehicle.VehicleResponse;
import kz.autorrent.service.VehicleImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
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
 * Файлы сохраняются в каталог загрузок и отдаются по /images/vehicles/{id}/{file}.
 * Возвращает обновлённый ответ по технике (с актуальным списком images).
 */
@RestController
@RequiredArgsConstructor
public class VehicleImageController {

    private final VehicleImageService vehicleImageService;

    @PostMapping(value = "/api/v1/vehicles/{id}/images",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public VehicleResponse upload(@PathVariable Long id,
                                  @RequestParam("files") List<MultipartFile> files) {
        return vehicleImageService.uploadImages(id, files);
    }

    @DeleteMapping("/api/v1/vehicles/{id}/images")
    @PreAuthorize("hasRole('ADMIN')")
    public VehicleResponse removeImage(@PathVariable Long id,
                                       @RequestParam String imageUrl) {
        return vehicleImageService.removeImage(id, imageUrl);
    }

    @DeleteMapping("/api/v1/vehicles/{id}/images/all")
    @PreAuthorize("hasRole('ADMIN')")
    public VehicleResponse clearImages(@PathVariable Long id) {
        return vehicleImageService.clearImages(id);
    }
}
