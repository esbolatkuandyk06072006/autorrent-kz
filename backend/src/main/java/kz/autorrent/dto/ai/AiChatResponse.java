package kz.autorrent.dto.ai;

import kz.autorrent.dto.car.CarResponse;

import java.util.List;

public record AiChatResponse(
        String reply,
        List<String> suggestions,
        List<CarResponse> cars
) {
}
