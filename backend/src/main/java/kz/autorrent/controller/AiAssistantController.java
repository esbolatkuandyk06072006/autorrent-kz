package kz.autorrent.controller;

import jakarta.validation.Valid;
import kz.autorrent.dto.ai.AiChatRequest;
import kz.autorrent.dto.ai.AiChatResponse;
import kz.autorrent.service.AiAssistantService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AiAssistantController {

    private final AiAssistantService aiAssistantService;

    @PostMapping("/chat")
    public AiChatResponse chat(@Valid @RequestBody AiChatRequest request) {
        return aiAssistantService.chat(request.message());
    }
}
