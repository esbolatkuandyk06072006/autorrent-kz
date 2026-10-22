package kz.autorrent.service;

import kz.autorrent.dto.vehicle.VehicleResponse;
import kz.autorrent.entity.Vehicle;
import kz.autorrent.exception.BadRequestException;
import kz.autorrent.mapper.DtoMapper;
import kz.autorrent.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Загрузка и удаление фотографий техники.
 *
 * Файлы кладутся в {app.upload.dir}/vehicles/{id}/{uuid}.{ext} и отдаются
 * статикой по /images/vehicles/{id}/{uuid}.{ext} (см. WebConfig).
 * Список URL хранится в Vehicle.images; images[0] продублирован в imageUrl.
 */
@Service
@RequiredArgsConstructor
public class VehicleImageService {

    /** Максимум фотографий в галерее (должно совпадать с VehicleService). */
    private static final int MAX_IMAGES = 12;

    /** Разрешённые расширения файлов изображений. */
    private static final Set<String> ALLOWED_EXTENSIONS =
            Set.of("jpg", "jpeg", "png", "webp", "gif", "avif");

    private final VehicleRepository vehicleRepository;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Transactional
    public VehicleResponse uploadImages(Long vehicleId, List<MultipartFile> files) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new BadRequestException("Vehicle not found: " + vehicleId));

        if (files == null || files.isEmpty()) {
            throw new BadRequestException("No files uploaded");
        }

        List<String> current = vehicle.getImages() == null
                ? new ArrayList<>()
                : new ArrayList<>(vehicle.getImages());

        Path targetDir = Path.of(uploadDir, "vehicles", String.valueOf(vehicleId));
        try {
            Files.createDirectories(targetDir);
        } catch (IOException e) {
            throw new BadRequestException("Cannot create upload directory: " + e.getMessage());
        }

        for (MultipartFile file : files) {
            if (current.size() >= MAX_IMAGES) {
                throw new BadRequestException("Maximum " + MAX_IMAGES + " photos per vehicle");
            }
            String fileName = storeFile(targetDir, file);
            String publicUrl = "/images/vehicles/" + vehicleId + "/" + fileName;
            if (!current.contains(publicUrl)) {
                current.add(publicUrl);
            }
        }

        vehicle.setImages(current);
        vehicle.setImageUrl(current.isEmpty() ? null : current.get(0));
        return DtoMapper.toVehicleResponse(vehicleRepository.save(vehicle));
    }

    @Transactional
    public VehicleResponse removeImage(Long vehicleId, String imageUrl) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new BadRequestException("Vehicle not found: " + vehicleId));

        List<String> current = vehicle.getImages() == null
                ? new ArrayList<>()
                : new ArrayList<>(vehicle.getImages());

        if (!current.remove(imageUrl)) {
            throw new BadRequestException("Image not found on this vehicle: " + imageUrl);
        }

        vehicle.setImages(current);
        vehicle.setImageUrl(current.isEmpty() ? null : current.get(0));
        deleteFileIfExists(vehicleId, imageUrl);
        return DtoMapper.toVehicleResponse(vehicleRepository.save(vehicle));
    }

    @Transactional
    public VehicleResponse clearImages(Long vehicleId) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new BadRequestException("Vehicle not found: " + vehicleId));

        List<String> current = vehicle.getImages() == null
                ? List.of()
                : new ArrayList<>(vehicle.getImages());

        for (String url : current) {
            deleteFileIfExists(vehicleId, url);
        }

        vehicle.setImages(new ArrayList<>());
        vehicle.setImageUrl(null);
        return DtoMapper.toVehicleResponse(vehicleRepository.save(vehicle));
    }

    /** Сохраняет файл, возвращает безопасное имя вида {uuid}.{ext}. */
    private String storeFile(Path targetDir, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Empty file");
        }
        String extension = extractExtension(file.getOriginalFilename());
        if (extension == null || !ALLOWED_EXTENSIONS.contains(extension)) {
            throw new BadRequestException(
                    "Unsupported file type. Allowed: " + String.join(", ", ALLOWED_EXTENSIONS));
        }
        String fileName = java.util.UUID.randomUUID() + "." + extension;
        try {
            Files.copy(file.getInputStream(), targetDir.resolve(fileName),
                    StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new BadRequestException("Cannot save file: " + e.getMessage());
        }
        return fileName;
    }

    private void deleteFileIfExists(Long vehicleId, String publicUrl) {
        String prefix = "/images/vehicles/" + vehicleId + "/";
        if (publicUrl == null || !publicUrl.startsWith(prefix)) {
            return;
        }
        String fileName = publicUrl.substring(prefix.length());
        // Защита от path traversal: имя файла не должно содержать разделителей.
        if (fileName.contains("/") || fileName.contains("\\") || fileName.contains("..")) {
            return;
        }
        try {
            Files.deleteIfExists(Path.of(uploadDir, "vehicles", String.valueOf(vehicleId), fileName));
        } catch (IOException ignored) {
            // Файл мог не существовать — не критично.
        }
    }

    private String extractExtension(String originalFilename) {
        if (originalFilename == null) {
            return null;
        }
        int dot = originalFilename.lastIndexOf('.');
        if (dot < 0 || dot == originalFilename.length() - 1) {
            return null;
        }
        return originalFilename.substring(dot + 1).toLowerCase(Locale.ROOT);
    }
}
