package kz.autorrent.service;

import kz.autorrent.dto.handover.HandoverReportResponse;
import kz.autorrent.entity.HandoverReport;
import kz.autorrent.entity.Reservation;
import kz.autorrent.entity.enums.FuelLevel;
import kz.autorrent.entity.enums.HandoverType;
import kz.autorrent.entity.enums.ReservationStatus;
import kz.autorrent.entity.enums.Role;
import kz.autorrent.exception.BadRequestException;
import kz.autorrent.exception.ConflictException;
import kz.autorrent.exception.NotFoundException;
import kz.autorrent.repository.HandoverReportRepository;
import kz.autorrent.repository.ReservationRepository;
import kz.autorrent.security.CustomUserDetails;
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
import java.util.UUID;

/**
 * Шаг 8: акты приёма-передачи техники.
 *
 * POST /api/v1/reservations/{id}/handover — составить акт (multipart: поля + фото);
 * GET  /api/v1/reservations/{id}/handover — оба акта брони (выдача и возврат).
 *
 * Доступ — как у просмотра брони: клиент-владелец брони, владелец техники, админ.
 * Файлы кладутся в {app.upload.dir}/handover/{reservationId}/ и отдаются
 * статикой по /images/handover/{reservationId}/{file} (см. WebConfig).
 */
@Service
@RequiredArgsConstructor
public class HandoverReportService {

    /** Максимум фотографий в одном акте. */
    private static final int MAX_PHOTOS = 10;

    /** Разрешённые расширения файлов изображений (как у галереи техники). */
    private static final Set<String> ALLOWED_EXTENSIONS =
            Set.of("jpg", "jpeg", "png", "webp", "gif", "avif");

    private final ReservationRepository reservationRepository;
    private final HandoverReportRepository handoverReportRepository;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    /** Оба акта брони: [{type: PICKUP…}, {type: RETURN…}] — пусто, если ещё нет. */
    @Transactional(readOnly = true)
    public List<HandoverReportResponse> list(Long reservationId, CustomUserDetails principal) {
        Reservation reservation = find(reservationId);
        checkAccess(reservation, principal);
        return handoverReportRepository.findByReservationIdOrderByCreatedAtAsc(reservationId)
                .stream()
                .map(HandoverReportService::toResponse)
                .toList();
    }

    /**
     * Создать акт. Правила:
     * - акт выдачи (PICKUP) — когда бронь подтверждена или уже активна;
     * - акт возврата (RETURN) — когда аренда активна или завершена;
     * - не больше одного акта каждого типа на бронь.
     */
    @Transactional
    public HandoverReportResponse create(Long reservationId, HandoverType type,
                                         String fuelLevel, Integer mileage, String damagesNote,
                                         List<MultipartFile> files, CustomUserDetails principal) {
        Reservation reservation = find(reservationId);
        checkAccess(reservation, principal);

        if (type == null) {
            throw new BadRequestException("type (PICKUP или RETURN) is required");
        }
        if (handoverReportRepository.findByReservationIdAndType(reservationId, type).isPresent()) {
            throw new ConflictException("Handover report of type " + type + " already exists");
        }

        ReservationStatus status = reservation.getStatus();
        if (type == HandoverType.PICKUP
                && status != ReservationStatus.CONFIRMED
                && status != ReservationStatus.ACTIVE) {
            throw new ConflictException("Pickup report can be created only for confirmed or active reservation");
        }
        if (type == HandoverType.RETURN
                && status != ReservationStatus.ACTIVE
                && status != ReservationStatus.COMPLETED) {
            throw new ConflictException("Return report can be created only for active or completed reservation");
        }

        HandoverReport report = HandoverReport.builder()
                .reservation(reservation)
                .type(type)
                .fuelLevel(parseFuelLevel(fuelLevel))
                .mileage(mileage)
                .damagesNote(trimToNull(damagesNote))
                .build();
        // Сначала сохраняем (нужен id), затем кладём фото под его номер.
        report = handoverReportRepository.save(report);
        report.setPhotos(storePhotos(reservationId, report.getId(), files));

        return toResponse(handoverReportRepository.save(report));
    }

    private Reservation find(Long id) {
        return reservationRepository.findWithDetailsById(id)
                .orElseThrow(() -> new NotFoundException("Reservation not found: " + id));
    }

    /** Просмотр и составление акта: админ, владелец техники или сам клиент. */
    private void checkAccess(Reservation reservation, CustomUserDetails principal) {
        if (principal == null) {
            throw new BadRequestException("Authentication required");
        }
        if (principal.getRole() == Role.ADMIN) {
            return;
        }
        if (principal.getRole() == Role.OWNER && reservation.getVehicle().getOwner() != null
                && reservation.getVehicle().getOwner().getId().equals(principal.getId())) {
            return;
        }
        if (!reservation.getUser().getId().equals(principal.getId())) {
            throw new BadRequestException("Access denied");
        }
    }

    private static HandoverReportResponse toResponse(HandoverReport report) {
        return new HandoverReportResponse(
                report.getId(),
                report.getReservation().getId(),
                report.getType().name(),
                report.getFuelLevel() == null ? null : report.getFuelLevel().name(),
                report.getMileage(),
                report.getDamagesNote(),
                report.getPhotos() == null ? null : List.copyOf(report.getPhotos()),
                report.getCreatedAt()
        );
    }

    private FuelLevel parseFuelLevel(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return FuelLevel.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Unknown fuel level: " + value);
        }
    }

    /** Сохраняет файлы акта, возвращает публичные пути /images/handover/{rid}/{file}. */
    private List<String> storePhotos(Long reservationId, Long reportId, List<MultipartFile> files) {
        List<String> photos = new ArrayList<>();
        if (files == null || files.isEmpty()) {
            return photos;
        }
        if (files.size() > MAX_PHOTOS) {
            throw new BadRequestException("Maximum " + MAX_PHOTOS + " photos per report");
        }

        Path targetDir = Path.of(uploadDir, "handover", String.valueOf(reservationId));
        try {
            Files.createDirectories(targetDir);
        } catch (IOException e) {
            throw new BadRequestException("Cannot create upload directory: " + e.getMessage());
        }

        // Имя файла содержит id акта — фото разных актов не пересекаются.
        String prefix = "report-" + reportId + "-";
        for (MultipartFile file : files) {
            String fileName = storeFile(targetDir, prefix, file);
            photos.add("/images/handover/" + reservationId + "/" + fileName);
        }
        return photos;
    }

    private String storeFile(Path targetDir, String prefix, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Empty file");
        }
        String extension = extractExtension(file.getOriginalFilename());
        if (extension == null || !ALLOWED_EXTENSIONS.contains(extension)) {
            throw new BadRequestException(
                    "Unsupported file type. Allowed: " + String.join(", ", ALLOWED_EXTENSIONS));
        }
        String fileName = prefix + UUID.randomUUID() + "." + extension;
        try {
            Files.copy(file.getInputStream(), targetDir.resolve(fileName),
                    StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new BadRequestException("Cannot save file: " + e.getMessage());
        }
        return fileName;
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

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
