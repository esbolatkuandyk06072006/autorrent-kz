package kz.autorrent.config;

import kz.autorrent.entity.Vehicle;
import kz.autorrent.entity.Reservation;
import kz.autorrent.entity.Review;
import kz.autorrent.entity.User;
import kz.autorrent.entity.enums.*;
import kz.autorrent.repository.VehicleRepository;
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
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true", matchIfMissing = true)
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
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

        List<Vehicle> vehicles = vehicleRepository.saveAll(seedVehicles());

        // Фотографии: путь /images/vehicles/{id}/N.jpg (файлы кладутся в frontend/public).
        // images[0] продублирован в imageUrl. Если файла нет — фронт покажет заглушку.
        for (Vehicle v : vehicles) {
            List<String> photos = new ArrayList<>();
            photos.add("/images/vehicles/" + v.getId() + "/1.jpg");
            if ("Camry".equals(v.getModel()) || "Tucson".equals(v.getModel())) {
                // У демо-машин — по 3 фото, чтобы показать галерею.
                photos.add("/images/vehicles/" + v.getId() + "/2.jpg");
                photos.add("/images/vehicles/" + v.getId() + "/3.jpg");
            }
            v.setImages(photos);
            v.setImageUrl(photos.get(0));
        }
        vehicleRepository.saveAll(vehicles);

        // Demo reservation on the first vehicle (Camry) with a review, and a
        // confirmed future reservation on the second (Tucson) — kept identical
        // to the previous seed so existing demos/tests still behave the same.
        Vehicle camry = vehicles.get(0);
        Vehicle tucson = vehicles.get(1);

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

        log.info("Demo data created ({} vehicles). ADMIN: admin@autorrent.kz / Admin123! ; USER: user@autorrent.kz / User123! ; admin id={}",
                vehicles.size(), admin.getId());
    }

    /**
     * Каталог: по 3 единицы в каждой из 14 подкатегорий
     * (легковые / грузовые / спецтехника), распределённые по 5 городам КЗ.
     * Порядок важен: индекс 0 — Toyota Camry, 1 — Hyundai Tucson (демо-брони).
     */
    private List<Vehicle> seedVehicles() {
        List<Vehicle> list = new ArrayList<>();

        // --- Легковые: Эконом (3) ---
        list.add(passenger("Toyota", "Camry", 2023, "123ABC01", VehicleCategory.COMFORT,
                Transmission.AUTOMATIC, FuelType.PETROL, 5, "25000.00", "Almaty",
                "Комфортный седан для городских и трассовых поездок."));
        list.add(passenger("Hyundai", "Tucson", 2022, "456DEF02", VehicleCategory.SUV,
                Transmission.AUTOMATIC, FuelType.PETROL, 5, "30000.00", "Astana",
                "Просторный кроссовер с большим багажником."));
        list.add(passenger("Kia", "Rio", 2021, "789GHI03", VehicleCategory.ECONOMY,
                Transmission.MANUAL, FuelType.PETROL, 5, "15000.00", "Shymkent",
                "Экономичный городской автомобиль с низким расходом."));
        list.add(passenger("BMW", "5 Series", 2023, "321JKL04", VehicleCategory.BUSINESS,
                Transmission.AUTOMATIC, FuelType.DIESEL, 5, "45000.00", "Almaty",
                "Седан бизнес-класса для комфортных поездок."));
        list.add(passenger("Tesla", "Model 3", 2023, "654MNO05", VehicleCategory.ELECTRIC,
                Transmission.AUTOMATIC, FuelType.ELECTRIC, 5, "40000.00", "Astana",
                "Тихий электромобиль с большим запасом хода."));
        list.add(passenger("Toyota", "Land Cruiser", 2022, "987PQR06", VehicleCategory.SUV,
                Transmission.AUTOMATIC, FuelType.DIESEL, 7, "55000.00", "Almaty",
                "Семиместный внедорожник для семьи и бездорожья."));

        // --- Легковые: Эконом / Комфорт добор (3 по подкатегориям) ---
        list.add(passenger("Lada", "Vesta", 2022, "101ECA07", VehicleCategory.ECONOMY,
                Transmission.MANUAL, FuelType.PETROL, 5, "12000.00", "Karaganda",
                "Доступный городской седан для экономной поездки."));
        list.add(passenger("Hyundai", "Solaris", 2023, "102ECB08", VehicleCategory.ECONOMY,
                Transmission.AUTOMATIC, FuelType.PETROL, 5, "14000.00", "Aktau",
                "Надёжный компактный седан с автоматом."));
        list.add(passenger("Renault", "Logan", 2021, "103ECC09", VehicleCategory.ECONOMY,
                Transmission.MANUAL, FuelType.PETROL, 5, "11000.00", "Shymkent",
                "Простой и дешёвый вариант для города."));
        list.add(passenger("Toyota", "Corolla", 2023, "201CFA10", VehicleCategory.COMFORT,
                Transmission.AUTOMATIC, FuelType.PETROL, 5, "22000.00", "Astana",
                "Популярный седан комфорта с автоматом."));
        list.add(passenger("Nissan", "Qashqai", 2022, "202CFB11", VehicleCategory.COMFORT,
                Transmission.AUTOMATIC, FuelType.PETROL, 5, "24000.00", "Karaganda",
                "Кроссовер комфорта для города и дачи."));
        list.add(passenger("Kia", "K5", 2023, "203CFC12", VehicleCategory.COMFORT,
                Transmission.AUTOMATIC, FuelType.PETROL, 5, "26000.00", "Aktau",
                "Современный седан с просторным салоном."));

        // --- Легковые: Бизнес / Электро / Внедорожник добор (3+) ---
        list.add(passenger("Mercedes-Benz", "E 200", 2023, "301BSA13", VehicleCategory.BUSINESS,
                Transmission.AUTOMATIC, FuelType.PETROL, 5, "50000.00", "Astana",
                "Представительский седан для деловых поездок."));
        list.add(passenger("Audi", "A6", 2023, "302BSB14", VehicleCategory.BUSINESS,
                Transmission.AUTOMATIC, FuelType.DIESEL, 5, "48000.00", "Almaty",
                "Бизнес-седан с полным приводом."));
        list.add(passenger("Lexus", "ES 350", 2022, "303BSC15", VehicleCategory.BUSINESS,
                Transmission.AUTOMATIC, FuelType.PETROL, 5, "52000.00", "Shymkent",
                "Премиальный седан повышенного комфорта."));
        list.add(passenger("Hyundai", "Ioniq 5", 2023, "401ELA16", VehicleCategory.ELECTRIC,
                Transmission.AUTOMATIC, FuelType.ELECTRIC, 5, "42000.00", "Almaty",
                "Просторный электрокроссовер."));
        list.add(passenger("BMW", "i4", 2023, "402ELB17", VehicleCategory.ELECTRIC,
                Transmission.AUTOMATIC, FuelType.ELECTRIC, 4, "46000.00", "Astana",
                "Электроседан с динамичным разгоном."));
        list.add(passenger("Zeekr", "001", 2024, "403ELC18", VehicleCategory.ELECTRIC,
                Transmission.AUTOMATIC, FuelType.ELECTRIC, 5, "44000.00", "Shymkent",
                "Современный электромобиль с большим пробегом."));
        list.add(passenger("Kia", "Sportage", 2023, "501SUA19", VehicleCategory.SUV,
                Transmission.AUTOMATIC, FuelType.PETROL, 5, "28000.00", "Karaganda",
                "Кроссовер для города и лёгкого бездорожья."));
        list.add(passenger("Chery", "Tiggo 7 Pro", 2023, "502SUB20", VehicleCategory.SUV,
                Transmission.AUTOMATIC, FuelType.PETROL, 5, "20000.00", "Aktau",
                "Бюджетный кроссовер с богатым оснащением."));
        list.add(passenger("Land Rover", "Defender", 2023, "503SUC21", VehicleCategory.SUV,
                Transmission.AUTOMATIC, FuelType.DIESEL, 7, "60000.00", "Almaty",
                "Полноприводный внедорожник для экспедиций."));

        // --- Грузовые: Газель / средние / фуры / самосвалы (12) ---
        list.add(cargo("GAZ", "Next", 2022, "601LTA22", VehicleCategory.LIGHT_TRUCK,
                Transmission.MANUAL, FuelType.DIESEL, "1.50", "18000.00", "Almaty",
                "Лёгкий грузовик «Газель» до 1.5 т для городских доставок."));
        list.add(cargo("GAZ", "Sadko", 2021, "602LTB23", VehicleCategory.LIGHT_TRUCK,
                Transmission.MANUAL, FuelType.DIESEL, "1.50", "17000.00", "Shymkent",
                "Компактный бортовой грузовик."));
        list.add(cargo("Ford", "Transit", 2022, "603LTC24", VehicleCategory.LIGHT_TRUCK,
                Transmission.MANUAL, FuelType.DIESEL, "1.40", "19000.00", "Astana",
                "Фургон-газель для перевозки грузов до 1.4 т."));
        list.add(cargo("Isuzu", "Elf", 2022, "701MTA25", VehicleCategory.MEDIUM_TRUCK,
                Transmission.MANUAL, FuelType.DIESEL, "3.00", "26000.00", "Karaganda",
                "Среднетоннажный грузовик до 3 т."));
        list.add(cargo("Hyundai", "HD78", 2021, "702MTB26", VehicleCategory.MEDIUM_TRUCK,
                Transmission.MANUAL, FuelType.DIESEL, "3.50", "27000.00", "Almaty",
                "Средний грузовик с закрытым кузовом."));
        list.add(cargo("Kia", "Bongo", 2022, "703MTC27", VehicleCategory.MEDIUM_TRUCK,
                Transmission.MANUAL, FuelType.DIESEL, "2.50", "24000.00", "Aktau",
                "Лёгкий среднетоннажный бортовой."));
        list.add(cargo("Volvo", "FH16", 2023, "801HTA28", VehicleCategory.HEAVY_TRUCK,
                Transmission.AUTOMATIC, FuelType.DIESEL, "24.00", "55000.00", "Almaty",
                "Магистральная фура для дальних перевозок.", true, "80000.00"));
        list.add(cargo("Scania", "R440", 2022, "802HTB29", VehicleCategory.HEAVY_TRUCK,
                Transmission.AUTOMATIC, FuelType.DIESEL, "22.00", "53000.00", "Astana",
                "Тяжёлая фура с рефрижератором.", true, "78000.00"));
        list.add(cargo("MAN", "TGX", 2023, "803HTC30", VehicleCategory.HEAVY_TRUCK,
                Transmission.AUTOMATIC, FuelType.DIESEL, "24.00", "56000.00", "Shymkent",
                "Магистральный тягач для длинных маршрутов.", true, "82000.00"));
        list.add(cargo("KamAZ", "65115", 2022, "901DTA31", VehicleCategory.DUMP_TRUCK,
                Transmission.MANUAL, FuelType.DIESEL, "2.00", "35000.00", "Karaganda",
                "Самосвал для строительных грузов и сыпучих.", true, "50000.00"));
        list.add(cargo("Mercedes-Benz", "Arocs", 2023, "902DTB32", VehicleCategory.DUMP_TRUCK,
                Transmission.AUTOMATIC, FuelType.DIESEL, "2.00", "38000.00", "Almaty",
                "Строительный самосвал повышенной грузоподъёмности.", true, "55000.00"));
        list.add(cargo("Shacman", "F3000", 2021, "903DTC33", VehicleCategory.DUMP_TRUCK,
                Transmission.MANUAL, FuelType.DIESEL, "2.00", "33000.00", "Aktau",
                "Самосвал для карьерных и дорожных работ.", true, "48000.00"));

        // --- Спецтехника: экскаваторы / краны / бульдозеры / погрузчики / бетономешалки (12+) ---
        list.add(special("Caterpillar", "320", 2022, "A01EXA34", VehicleCategory.EXCAVATOR,
                "20.00", "60000.00", "6000.00", "Almaty",
                "Гусеничный экскаватор для земляных работ."));
        list.add(special("Komatsu", "PC200", 2021, "A02EXB35", VehicleCategory.EXCAVATOR,
                "20.00", "58000.00", "5800.00", "Karaganda",
                "Универсальный экскаватор с ковшом 0.8 м³."));
        list.add(special("Hitachi", "ZX200", 2023, "A03EXC36", VehicleCategory.EXCAVATOR,
                "21.00", "62000.00", "6200.00", "Astana",
                "Экскаватор для строительства и демонтажа."));
        list.add(special("Liebherr", "LTM 1050", 2022, "B01CRA37", VehicleCategory.CRANE,
                "50.00", "80000.00", "9000.00", "Almaty",
                "Автокран грузоподъёмностью 50 тонн.", true, "110000.00"));
        list.add(special("Kobelco", "CK2500", 2021, "B02CRB38", VehicleCategory.CRANE,
                "25.00", "70000.00", "8000.00", "Shymkent",
                "Колёсный кран для монтажных работ.", true, "95000.00"));
        list.add(special("Tadano", "GR-250", 2023, "B03CRC39", VehicleCategory.CRANE,
                "25.00", "72000.00", "8200.00", "Aktau",
                "Автокран для подъёма стройматериалов.", true, "96000.00"));
        list.add(special("Caterpillar", "D6", 2022, "C01BDA40", VehicleCategory.BULLDOZER,
                "20.00", "65000.00", "7000.00", "Karaganda",
                "Бульдозер для планировки и перемещения грунта."));
        list.add(special("Komatsu", "D65", 2021, "C02BDB41", VehicleCategory.BULLDOZER,
                "22.00", "67000.00", "7200.00", "Almaty",
                "Мощный бульдозер для дорожных работ."));
        list.add(special("Shantui", "SD16", 2023, "C03BDC42", VehicleCategory.BULLDOZER,
                "19.00", "61000.00", "6800.00", "Astana",
                "Бульдозер для строительных площадок."));
        list.add(special("Caterpillar", "950M", 2022, "D01LDA43", VehicleCategory.LOADER,
                "18.00", "55000.00", "6500.00", "Shymkent",
                "Колёсный погрузчик для сыпучих грузов."));
        list.add(special("Komatsu", "WA380", 2021, "D02LDB44", VehicleCategory.LOADER,
                "18.00", "54000.00", "6400.00", "Aktau",
                "Погрузчик для складов и карьеров."));
        list.add(special("Volvo", "L120H", 2023, "D03LDC45", VehicleCategory.LOADER,
                "19.00", "57000.00", "6600.00", "Almaty",
                "Универсальный фронтальный погрузчик."));
        list.add(special("SANY", "SY5110", 2022, "E01CMA46", VehicleCategory.CONCRETE_MIXER,
                "8.00", "45000.00", "5500.00", "Astana",
                "Автобетономешалка объёмом 8 м³.", true, "65000.00"));
        list.add(special("CIFA", "K38L", 2021, "E02CMB47", VehicleCategory.CONCRETE_MIXER,
                "7.00", "43000.00", "5300.00", "Karaganda",
                "Бетономешалка для доставки бетона на объект."));
        list.add(special("Sinotruk", "HOWO", 2023, "E03CMC48", VehicleCategory.CONCRETE_MIXER,
                "9.00", "47000.00", "5700.00", "Almaty",
                "Автобетоносмеситель повышенной ёмкости.", true, "68000.00"));

        return list;
    }

    /** Легковая машина: места, без грузоподъёмности, права B, без оператора. */
    private Vehicle passenger(String brand, String model, int year, String plate,
                              VehicleCategory category, Transmission transmission, FuelType fuelType,
                              int seats, String pricePerDay, String city, String description) {
        return base(brand, model, year, plate, category, VehicleType.PASSENGER, transmission,
                fuelType, seats, null, VehicleLicense.B, false, null, null,
                pricePerDay, null, city, description);
    }

    /** Грузовик: грузоподъёмность в тоннах, права C/E, опционально с оператором. */
    private Vehicle cargo(String brand, String model, int year, String plate,
                          VehicleCategory category, Transmission transmission, FuelType fuelType,
                          String capacity, String pricePerDay, String city, String description) {
        return cargo(brand, model, year, plate, category, transmission, fuelType,
                capacity, pricePerDay, city, description, false, null);
    }

    private Vehicle cargo(String brand, String model, int year, String plate,
                          VehicleCategory category, Transmission transmission, FuelType fuelType,
                          String capacity, String pricePerDay, String city, String description,
                          boolean withOperator, String operatorPrice) {
        VehicleLicense license = (category == VehicleCategory.HEAVY_TRUCK
                || category == VehicleCategory.DUMP_TRUCK) ? VehicleLicense.E : VehicleLicense.C;
        return base(brand, model, year, plate, category, VehicleType.CARGO, transmission,
                fuelType, 2, capacity, license, withOperator, operatorPrice, null,
                pricePerDay, null, city, description);
    }

    /** Спецтехника: оператор + почасовая цена + суточная, спецудостоверение. */
    private Vehicle special(String brand, String model, int year, String plate,
                            VehicleCategory category, String capacity, String pricePerDay,
                            String pricePerHour, String city, String description) {
        return special(brand, model, year, plate, category, capacity, pricePerDay,
                pricePerHour, city, description, false, null);
    }

    private Vehicle special(String brand, String model, int year, String plate,
                            VehicleCategory category, String capacity, String pricePerDay,
                            String pricePerHour, String city, String description,
                            boolean withOperator, String operatorPrice) {
        return base(brand, model, year, plate, category, VehicleType.SPECIAL,
                Transmission.AUTOMATIC, FuelType.DIESEL, 2, capacity, VehicleLicense.SPECIAL,
                withOperator, operatorPrice, pricePerHour, pricePerDay, null, city, description);
    }

    private Vehicle base(String brand, String model, int year, String plate,
                         VehicleCategory category, VehicleType type, Transmission transmission,
                         FuelType fuelType, Integer seats, String capacity, VehicleLicense license,
                         boolean withOperator, String operatorPrice, String pricePerHour,
                         String pricePerDay, String imageUrl, String city, String description) {
        Vehicle.VehicleBuilder b = Vehicle.builder()
                .brand(brand)
                .model(model)
                .year(year)
                .licensePlate(plate)
                .category(category)
                .type(type)
                .transmission(transmission)
                .fuelType(fuelType)
                .seats(seats)
                .capacity(capacity == null ? null : new BigDecimal(capacity))
                .requiredLicense(license)
                .withOperator(withOperator)
                .operatorPricePerDay(operatorPrice == null ? null : new BigDecimal(operatorPrice))
                .pricePerHour(pricePerHour == null ? null : new BigDecimal(pricePerHour))
                .pricePerDay(new BigDecimal(pricePerDay))
                .city(city)
                .status(VehicleStatus.ACTIVE)
                .description(description)
                .imageUrl(imageUrl);
        return b.build();
    }
}
