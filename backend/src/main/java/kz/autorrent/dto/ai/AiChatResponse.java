package kz.autorrent.dto.ai;

import kz.autorrent.dto.vehicle.VehicleResponse;

import java.util.List;

public record AiChatResponse(
        String reply,
        List<String> suggestions,
        List<VehicleResponse> cars
) {
}
