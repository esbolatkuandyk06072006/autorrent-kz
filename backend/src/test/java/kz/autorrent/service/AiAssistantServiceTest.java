package kz.autorrent.service;

import kz.autorrent.dto.ai.AiChatResponse;
import kz.autorrent.entity.Vehicle;
import kz.autorrent.entity.enums.VehicleCategory;
import kz.autorrent.entity.enums.VehicleStatus;
import kz.autorrent.entity.enums.VehicleType;
import kz.autorrent.entity.enums.ReviewStatus;
import kz.autorrent.entity.enums.Transmission;
import kz.autorrent.entity.enums.FuelType;
import kz.autorrent.repository.VehicleRepository;
import kz.autorrent.repository.ReviewRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiAssistantServiceTest {

    @Mock
    private VehicleRepository vehicleRepository;

    @Mock
    private ReviewRepository reviewRepository;

    private AiAssistantService service;

    @BeforeEach
    void setUp() {
        service = new AiAssistantService(vehicleRepository, reviewRepository);
    }

    private Vehicle vehicle(Long id, String brand, String model, String city, VehicleCategory category) {
        return Vehicle.builder()
                .id(id)
                .brand(brand)
                .model(model)
                .year(2024)
                .licensePlate("A" + id + "BC02")
                .category(category)
                .type(category.group())
                .transmission(Transmission.AUTOMATIC)
                .fuelType(FuelType.PETROL)
                .seats(5)
                .pricePerDay(new BigDecimal("25000"))
                .city(city)
                .status(VehicleStatus.ACTIVE)
                .build();
    }

    @Test
    void findsCarsByBudgetAndCity() {
        Page<Vehicle> page = new PageImpl<>(List.of(
                vehicle(1L, "Toyota", "Camry", "Almaty", VehicleCategory.COMFORT)));
        when(vehicleRepository.search(eq(VehicleStatus.ACTIVE), isNull(), isNull(), eq("Almaty"),
                eq(VehicleCategory.COMFORT), any(), isNull(), isNull(), isNull(), any(Pageable.class))).thenReturn(page);
        when(reviewRepository.averageRating(1L, ReviewStatus.VISIBLE)).thenReturn(4.8);
        when(reviewRepository.countByReservationVehicleIdAndStatus(1L, ReviewStatus.VISIBLE)).thenReturn(5L);

        AiChatResponse response = service.chat("комфорт до 30000 тенге в Алматы");

        assertThat(response.cars()).hasSize(1);
        assertThat(response.cars().get(0).brand()).isEqualTo("Toyota");
        assertThat(response.reply()).contains("Алматы").contains("Toyota");
        assertThat(response.suggestions()).isNotEmpty();
    }

    @Test
    void explainsDiscountWithoutCatalogSearch() {
        AiChatResponse response = service.chat("как работает скидка?");

        assertThat(response.reply()).contains("10%").contains("7 дней");
        assertThat(response.cars()).isEmpty();
    }

    @Test
    void greetsAndAsksForCriteriaWhenMessageIsGeneric() {
        AiChatResponse response = service.chat("расскажи что умеешь");

        assertThat(response.reply()).contains("бюджет");
        assertThat(response.cars()).isEmpty();
    }

    @Test
    void asksForCriteriaWhenNoSearchWordsButGreets() {
        when(vehicleRepository.search(eq(VehicleStatus.ACTIVE), isNull(), isNull(), isNull(),
                isNull(), isNull(), isNull(), isNull(), isNull(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        AiChatResponse response = service.chat("привет");

        assertThat(response.reply()).contains("не нашлось");
    }

    @Test
    void reportsEmptyResultWithHelpfulHint() {
        when(vehicleRepository.search(eq(VehicleStatus.ACTIVE), isNull(), isNull(), eq("Astana"),
                eq(VehicleCategory.SUV), any(), isNull(), isNull(), isNull(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        AiChatResponse response = service.chat("внедорожник до 5000 в Астане");

        assertThat(response.cars()).isEmpty();
        assertThat(response.reply()).contains("не нашлось");
    }
}
