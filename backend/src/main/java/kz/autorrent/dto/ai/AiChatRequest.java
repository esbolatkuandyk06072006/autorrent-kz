package kz.autorrent.dto.ai;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AiChatRequest(
        @NotBlank(message = "message must not be blank")
        @Size(max = 1000, message = "message is too long")
        String message
) {
}
