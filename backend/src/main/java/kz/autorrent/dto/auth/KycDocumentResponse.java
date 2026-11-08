package kz.autorrent.dto.auth;

/**
 * Загруженный KYC-документ: слот (ID_FRONT, ID_BACK, ID_SELFIE,
 * LICENSE_FRONT, LICENSE_BACK) и имя файла.
 */
public record KycDocumentResponse(
        String slot,
        String fileName
) {
}
