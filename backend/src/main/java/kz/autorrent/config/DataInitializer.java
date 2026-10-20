package kz.autorrent.config;

import kz.autorrent.entity.Car;
import kz.autorrent.entity.Reservation;
import kz.autorrent.entity.Review;
import kz.autorrent.entity.User;
import kz.autorrent.entity.enums.*;
import kz.autorrent.repository.CarRepository;
import kz.autorrent.repository.ReservationRepository;
import kz.autorrent.repository.ReviewRepository;
import kz.autorrent.repository.UserRepository;
import kz.autorrent.service.ReservationFactory;
import kz.autorrent.service.pricing.PricingResult;
import kz.autorrent.service.pricing.PricingStrategyResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true", matchIfMissing = true)
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final CarRepository carRepository;
    private final ReservationRepository reservationRepository;
    private final ReviewRepository reviewRepository;
    private final PasswordEncoder passwordEncoder;
    private final PricingStrategyResolver pricingStrategyResolver;
    private final ReservationFactory reservationFactory;

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.count() > 0) {
            log.info("Database already contains users; demo seed skipped");
            return;
        }

        User admin = userRepository.save(User.builder()
                .email("admin@autorrent.kz")
                .passwordHash(passwordEncoder.encode("Admin123!"))
                .firstName("Admin")
                .lastName("AutoRent")
                .phone("+77000000001")
                .role(Role.ADMIN)
                .enabled(true)
                .build());

        User demoUser = userRepository.save(User.builder()
                .email("user@autorrent.kz")
                .passwordHash(passwordEncoder.encode("User123!"))
                .firstName("Demo")
                .lastName("User")
                .phone("+77000000002")
                .role(Role.USER)
                .enabled(true)
                .build());

        List<Car> cars = carRepository.saveAll(List.of(
                car("Toyota", "Camry", 2023, "123ABC01", CarCategory.COMFORT,
                        Transmission.AUTOMATIC, FuelType.PETROL, 5, "25000.00", "Almaty",
                        "Comfortable sedan for city and highway trips."),
                car("Hyundai", "Tucson", 2022, "456DEF02", CarCategory.SUV,
                        Transmission.AUTOMATIC, FuelType.PETROL, 5, "30000.00", "Astana",
                        "Spacious crossover with a large trunk."),
                car("Kia", "Rio", 2021, "789GHI03", CarCategory.ECONOMY,
                        Transmission.MANUAL, FuelType.PETROL, 5, "15000.00", "Shymkent",
                        "Economical city car with low fuel consumption."),
                car("BMW", "5 Series", 2023, "321JKL04", CarCategory.BUSINESS,
                        Transmission.AUTOMATIC, FuelType.DIESEL, 5, "45000.00", "Almaty",
                        "Business class sedan for comfortable trips."),
                car("Tesla", "Model 3", 2023, "654MNO05", CarCategory.ELECTRIC,
                        Transmission.AUTOMATIC, FuelType.ELECTRIC, 5, "40000.00", "Astana",
                        "Quiet electric sedan with long range."),
                car("Toyota", "Land Cruiser", 2022, "987PQR06", CarCategory.SUV,
                        Transmission.AUTOMATIC, FuelType.DIESEL, 7, "55000.00", "Almaty",
                        "Seven-seat SUV for family trips and off-road.")
        ));

        Car camry = cars.get(0);
        Car tucson = cars.get(1);

        LocalDate completedStart = LocalDate.now().minusDays(12);
        LocalDate completedEnd = completedStart.plusDays(4);
        PricingResult completedPricing = pricingStrategyResolver.resolve(4)
                .calculate(camry.getPricePerDay(), 4);
        Reservation completed = reservationFactory.create(
                demoUser, camry, completedStart, completedEnd, completedPricing);
        completed.setStatus(ReservationStatus.COMPLETED);
        reservationRepository.save(completed);

        reviewRepository.save(Review.builder()
                .reservation(completed)
                .rating(5)
                .comment("Көлік таза, қызмет жақсы. Брондау тез өңделді.")
                .status(ReviewStatus.VISIBLE)
                .build());

        LocalDate confirmedStart = LocalDate.now().plusDays(5);
        LocalDate confirmedEnd = confirmedStart.plusDays(3);
        PricingResult confirmedPricing = pricingStrategyResolver.resolve(3)
                .calculate(tucson.getPricePerDay(), 3);
        Reservation confirmed = reservationFactory.create(
                demoUser, tucson, confirmedStart, confirmedEnd, confirmedPricing);
        confirmed.setStatus(ReservationStatus.CONFIRMED);
        reservationRepository.save(confirmed);

        log.info("Demo data created. ADMIN: admin@autorrent.kz / Admin123! ; USER: user@autorrent.kz / User123! ; admin id={}",
                admin.getId());
    }

    private Car car(String brand,
                    String model,
                    int year,
                    String licensePlate,
                    CarCategory category,
                    Transmission transmission,
                    FuelType fuelType,
                    int seats,
                    String pricePerDay,
                    String city,
                    String description) {
        return Car.builder()
                .brand(brand)
                .model(model)
                .year(year)
                .licensePlate(licensePlate)
                .category(category)
                .transmission(transmission)
                .fuelType(fuelType)
                .seats(seats)
                .pricePerDay(new BigDecimal(pricePerDay))
                .city(city)
                .status(CarStatus.ACTIVE)
                .description(description)
                .imageUrl("https://placehold.co/600x400?text=" + brand.replace(" ", "+") + "+" + model.replace(" ", "+"))
                .build();
    }
}
