package kz.autorrent.service;

import kz.autorrent.dto.ai.AiChatResponse;
import kz.autorrent.entity.Car;
import kz.autorrent.entity.enums.CarCategory;
import kz.autorrent.entity.enums.CarStatus;
import kz.autorrent.entity.enums.ReviewStatus;
import kz.autorrent.entity.enums.Transmission;
import kz.autorrent.entity.enums.FuelType;
import kz.autorrent.repository.CarRepository;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiAssistantServiceTest {

    @Mock
    private CarRepository carRepository;

    @Mock
    private ReviewRepository reviewRepository;

    private AiAssistantService service;

    @BeforeEach
    void setUp() {
        service = new AiAssistantService(carRepository, reviewRepository);
    }

    private Car car(Long id, String brand, String model, String city, CarCategory category) {
        return Car.builder()
                .id(id)
                .brand(brand)
                .model(model)
                .year(2024)
                .licensePlate("A" + id + "BC02")
                .category(category)
                .transmission(Transmission.AUTOMATIC)
                .fuelType(FuelType.PETROL)
                .seats(5)
                .pricePerDay(new BigDecimal("25000"))
                .city(city)
                .status(CarStatus.ACTIVE)
                .build();
    }

    @Test
    void findsCarsByBudgetAndCity() {
        Page<Car> page = new PageImpl<>(List.of(
                car(1L, "Toyota", "Camry", "Almaty", CarCategory.COMFORT)));
        when(carRepository.search(eq(CarStatus.ACTIVE), isNull(), eq("Almaty"),
                eq(CarCategory.COMFORT), any(), any(Pageable.class))).thenReturn(page);
        when(reviewRepository.averageRating(1L, ReviewStatus.VISIBLE)).thenReturn(4.8);
        when(reviewRepository.countByReservationCarIdAndStatus(1L, ReviewStatus.VISIBLE)).thenReturn(5L);

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
        when(carRepository.search(eq(CarStatus.ACTIVE), isNull(), isNull(), isNull(), isNull(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        AiChatResponse response = service.chat("привет");

        assertThat(response.reply()).contains("не нашлось");
    }

    @Test
    void reportsEmptyResultWithHelpfulHint() {
        when(carRepository.search(eq(CarStatus.ACTIVE), isNull(), eq("Astana"),
                eq(CarCategory.SUV), any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        AiChatResponse response = service.chat("внедорожник до 5000 в Астане");

        assertThat(response.cars()).isEmpty();
        assertThat(response.reply()).contains("не нашлось");
    }
}
