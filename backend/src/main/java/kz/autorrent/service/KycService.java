package kz.autorrent.service;

import kz.autorrent.dto.auth.KycDocumentResponse;
import kz.autorrent.entity.KycDocument;
import kz.autorrent.entity.User;
import kz.autorrent.exception.BadRequestException;
import kz.autorrent.repository.KycDocumentRepository;
import kz.autorrent.repository.UserRepository;
import kz.autorrent.util.PhoneUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Stream;

/**
 * Загрузка KYC-документов (паспорт, селфи, водительское удостоверение).
 *
 * Два сценария:
 * - до регистрации документы кладутся в {uploadDir}/kyc/pending/{phone}/
 *   (оперативная карта phone → слот → имя файла), при signup переносятся
 *   в {uploadDir}/kyc/{userId}/ и создаются записи KycDocument;
 * - для уже зарегистрированного пользователя — сразу в {uploadDir}/kyc/{userId}/.
 *
 * Файлы приватные: публичный ресурс-хендлер для kyc в WebConfig не добавляем,
 * URL наружу не отдаются.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class KycService {

    /** Допустимые слоты KYC-документов. */
    private static final Set<String> ALLOWED_SLOTS =
            Set.of("ID_FRONT", "ID_BACK", "ID_SELFIE", "LICENSE_FRONT", "LICENSE_BACK");

    /** Разрешённые расширения файлов документов. */
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");

    /** Максимальный размер файла — 8 МБ. */
    private static final long MAX_FILE_SIZE = 8L * 1024 * 1024;

    private final KycDocumentRepository kycDocumentRepository;
    private final UserRepository userRepository;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    /** Pending-документы до регистрации: телефон → (слот → имя файла). */
    private final Map<String, Map<String, String>> pendingFiles = new ConcurrentHashMap<>();

    /** Сохранение документа зарегистрированного пользователя (перезапись слота). */
    @Transactional
    public KycDocumentResponse saveDocument(Long userId, String slot, MultipartFile file) {
        Path targetDir = Path.of(uploadDir, "kyc", String.valueOf(userId));
        String fileName = storeFile(targetDir, slot, file);
        Path filePath = targetDir.resolve(fileName);

        // Старая запись слота заменяется новой (уникальность user_id + slot).
        kycDocumentRepository.deleteByUserIdAndSlot(userId, slot);
        kycDocumentRepository.save(KycDocument.builder()
                .user(userRepository.getReferenceById(userId))
                .slot(slot)
                .filePath(filePath.toString())
                .build());
        return new KycDocumentResponse(slot, fileName);
    }

    /** Документы зарегистрированного пользователя. */
    @Transactional(readOnly = true)
    public List<KycDocumentResponse> listDocuments(Long userId) {
        return kycDocumentRepository.findByUserId(userId).stream()
                .map(document -> new KycDocumentResponse(
                        document.getSlot(), fileNameOf(document.getFilePath())))
                .toList();
    }

    /** Сохранение документа до регистрации — по телефону из токена signup. */
    public KycDocumentResponse savePendingDocument(String phone, String slot, MultipartFile file) {
        String normalizedPhone = PhoneUtil.normalize(phone);
        Path targetDir = Path.of(uploadDir, "kyc", "pending", normalizedPhone);
        String fileName = storeFile(targetDir, slot, file);
        pendingFiles.computeIfAbsent(normalizedPhone, p -> new ConcurrentHashMap<>())
                .put(slot, fileName);
        return new KycDocumentResponse(slot, fileName);
    }

    /** Уже загруженные pending-документы (для восстановления состояния UI после F5). */
    public List<KycDocumentResponse> listPendingDocuments(String phone) {
        Map<String, String> files = pendingFiles.get(PhoneUtil.normalize(phone));
        if (files == null || files.isEmpty()) {
            return List.of();
        }
        return files.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> new KycDocumentResponse(entry.getKey(), entry.getValue()))
                .toList();
    }

    /**
     * Завершение регистрации: перенос файлов из {uploadDir}/kyc/pending/{phone}/
     * в {uploadDir}/kyc/{userId}/ и создание записей KycDocument.
     */
    @Transactional
    public void finalizeSignup(String phone, Long userId) {
        String normalizedPhone = PhoneUtil.normalize(phone);
        Map<String, String> files = pendingFiles.remove(normalizedPhone);
        if (files == null || files.isEmpty()) {
            return;
        }

        Path pendingDir = Path.of(uploadDir, "kyc", "pending", normalizedPhone);
        Path targetDir = Path.of(uploadDir, "kyc", String.valueOf(userId));
        User user = userRepository.getReferenceById(userId);
        try {
            Files.createDirectories(targetDir);
        } catch (IOException e) {
            throw new BadRequestException("Не удалось создать каталог: " + e.getMessage());
        }

        for (Map.Entry<String, String> entry : files.entrySet()) {
            String slot = entry.getKey();
            String fileName = entry.getValue();
            Path source = pendingDir.resolve(fileName);
            Path target = targetDir.resolve(fileName);
            try {
                if (Files.exists(source)) {
                    Files.move(source, target, StandardCopyOption.REPLACE_EXISTING);
                }
            } catch (IOException e) {
                throw new BadRequestException("Не удалось перенести документ: " + e.getMessage());
            }
            kycDocumentRepository.save(KycDocument.builder()
                    .user(user)
                    .slot(slot)
                    .filePath(target.toString())
                    .build());
        }
        deleteEmptyDir(pendingDir);
        log.info("KYC-документы перенесены: телефон {} → пользователь {}, слотов: {}",
                normalizedPhone, userId, files.size());
    }

    /** Валидация слота и файла + запись на диск (перезапись при повторной загрузке). */
    private String storeFile(Path targetDir, String slot, MultipartFile file) {
        if (slot == null || !ALLOWED_SLOTS.contains(slot)) {
            throw new BadRequestException("Неизвестный тип документа: " + slot);
        }
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Файл не может быть пустым");
        }
        String extension = extractExtension(file.getOriginalFilename());
        if (extension == null || !ALLOWED_EXTENSIONS.contains(extension)) {
            throw new BadRequestException(
                    "Неподдерживаемый тип файла. Допустимы: jpg, jpeg, png, webp");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BadRequestException("Файл больше 8 МБ");
        }

        try {
            Files.createDirectories(targetDir);
        } catch (IOException e) {
            throw new BadRequestException("Не удалось создать каталог: " + e.getMessage());
        }
        // Повторная загрузка слота: убираем старые файлы (могло смениться расширение).
        clearSlotFiles(targetDir, slot);

        String fileName = slot + "." + extension;
        try {
            Files.copy(file.getInputStream(), targetDir.resolve(fileName),
                    StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new BadRequestException("Не удалось сохранить файл: " + e.getMessage());
        }
        return fileName;
    }

    /** Удаляет старые файлы слота (имя вида SLOT.ext) в каталоге. */
    private void clearSlotFiles(Path targetDir, String slot) {
        try (Stream<Path> paths = Files.list(targetDir)) {
            for (Path path : paths.filter(p -> p.getFileName().toString().startsWith(slot + ".")).toList()) {
                Files.deleteIfExists(path);
            }
        } catch (IOException e) {
            // Каталог пуст или недоступен — удалять нечего.
        }
    }

    /** Удаляет опустевший каталог (например, pending/{phone} после переноса). */
    private void deleteEmptyDir(Path dir) {
        try (Stream<Path> paths = Files.list(dir)) {
            if (paths.findAny().isEmpty()) {
                Files.deleteIfExists(dir);
            }
        } catch (IOException e) {
            // Каталог уже удалён или недоступен — не страшно.
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

    private String fileNameOf(String filePath) {
        int separator = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
        return separator < 0 ? filePath : filePath.substring(separator + 1);
    }
}
