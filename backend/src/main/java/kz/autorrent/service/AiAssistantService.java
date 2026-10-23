package kz.autorrent.service;

import kz.autorrent.dto.ai.AiChatResponse;
import kz.autorrent.dto.vehicle.VehicleResponse;
import kz.autorrent.entity.enums.VehicleCategory;
import kz.autorrent.entity.enums.VehicleStatus;
import kz.autorrent.mapper.DtoMapper;
import kz.autorrent.repository.VehicleRepository;
import kz.autorrent.repository.ReviewRepository;
import kz.autorrent.entity.enums.ReviewStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Rule-based AI assistant ("AI-консультант") for the car rental SPA.
 *
 * It understands Russian/Kazakh/English phrases about budget, city,
 * car class and rental rules, then answers with real cars from the
 * catalogue and explains business rules (discount, documents, payment).
 * No external LLM is required, so the feature works offline and in CI.
 */
@Service
@RequiredArgsConstructor
public class AiAssistantService {

    private static final Pattern BUDGET_PATTERN =
            Pattern.compile("(\\d{3,9})\\s*(тенге|₸|тг|kzt)?", Pattern.CASE_INSENSITIVE);
    private static final Pattern DATE_RANGE_PATTERN = Pattern.compile(
            "(\\d{4}-\\d{2}-\\d{2})\\s*(?:до|по|–|-|—)\\s*(\\d{4}-\\d{2}-\\d{2})");

    private static final Map<String, String> CITY_KEYWORDS = new LinkedHashMap<>();
    private static final Map<String, VehicleCategory> CATEGORY_KEYWORDS = new LinkedHashMap<>();

    static {
        CITY_KEYWORDS.put("алмат", "Almaty");
        CITY_KEYWORDS.put("almaty", "Almaty");
        CITY_KEYWORDS.put("астан", "Astana");
        CITY_KEYWORDS.put("astana", "Astana");
        CITY_KEYWORDS.put("нур-султан", "Astana");
        CITY_KEYWORDS.put("шымкент", "Shymkent");
        CITY_KEYWORDS.put("shymkent", "Shymkent");
        CITY_KEYWORDS.put("караганда", "Karaganda");
        CITY_KEYWORDS.put("karaganda", "Karaganda");
        CITY_KEYWORDS.put("актау", "Aktau");
        CITY_KEYWORDS.put("aktau", "Aktau");

        CATEGORY_KEYWORDS.put("внедорожник", VehicleCategory.SUV);
        CATEGORY_KEYWORDS.put("джип", VehicleCategory.SUV);
        CATEGORY_KEYWORDS.put("suv", VehicleCategory.SUV);
        CATEGORY_KEYWORDS.put("бизнес", VehicleCategory.BUSINESS);
        CATEGORY_KEYWORDS.put("business", VehicleCategory.BUSINESS);
        CATEGORY_KEYWORDS.put("премиум", VehicleCategory.BUSINESS);
        CATEGORY_KEYWORDS.put("электро", VehicleCategory.ELECTRIC);
        CATEGORY_KEYWORDS.put("электрич", VehicleCategory.ELECTRIC);
        CATEGORY_KEYWORDS.put("electric", VehicleCategory.ELECTRIC);
        CATEGORY_KEYWORDS.put("эконом", VehicleCategory.ECONOMY);
        CATEGORY_KEYWORDS.put("дешев", VehicleCategory.ECONOMY);
        CATEGORY_KEYWORDS.put("комфорт", VehicleCategory.COMFORT);
        // Грузовая техника
        CATEGORY_KEYWORDS.put("газель", VehicleCategory.LIGHT_TRUCK);
        CATEGORY_KEYWORDS.put("грузовик", VehicleCategory.MEDIUM_TRUCK);
        CATEGORY_KEYWORDS.put("фур", VehicleCategory.HEAVY_TRUCK);
        CATEGORY_KEYWORDS.put("самосвал", VehicleCategory.DUMP_TRUCK);
        // Спецтехника
        CATEGORY_KEYWORDS.put("экскаватор", VehicleCategory.EXCAVATOR);
        CATEGORY_KEYWORDS.put("кран", VehicleCategory.CRANE);
        CATEGORY_KEYWORDS.put("бульдозер", VehicleCategory.BULLDOZER);
        CATEGORY_KEYWORDS.put("погрузчик", VehicleCategory.LOADER);
        CATEGORY_KEYWORDS.put("бетономешал", VehicleCategory.CONCRETE_MIXER);
    }

    private final VehicleRepository vehicleRepository;
    private final ReviewRepository reviewRepository;

    @Transactional(readOnly = true)
    public AiChatResponse chat(String message) {
        String text = message == null ? "" : message.trim();
        String normalized = text.toLowerCase(Locale.ROOT);

        // 1. Rental rules questions (answered without touching the catalogue)
        String rules = answerRules(normalized);
        if (rules != null) {
            return new AiChatResponse(rules, defaultSuggestions(), List.of());
        }

        // 2. Parse search criteria: budget, city, category, date range
        BigDecimal budget = extractBudget(normalized);
        String city = extractCity(normalized);
        VehicleCategory category = extractCategory(normalized);
        Matcher dates = DATE_RANGE_PATTERN.matcher(normalized);

        boolean greeting = containsAny(normalized, "привет", "здравств", "салам", "сәлем", "hello");

        if (budget == null && city == null && category == null && !dates.find() && !greeting) {
            return new AiChatResponse(
                    "Я понимаю запросы вроде: «комфорт до 30000 тенге в Алматы», "
                            + "«внедорожник в Астане» или «эконом на 2026-11-10 до 2026-11-14». "
                            + "Напишите бюджет, город или класс — и я подберу машины.",
                    defaultSuggestions(),
                    List.of());
        }

        // 3. Search the catalogue with the parsed criteria
        List<VehicleResponse> cars = searchVehicles(budget, city, category);
        String reply = buildReply(cars, budget, city, category, greeting);
        return new AiChatResponse(reply, defaultSuggestions(), cars);
    }

    private List<VehicleResponse> searchVehicles(BigDecimal budget, String city, VehicleCategory category) {
        Page<kz.autorrent.entity.Vehicle> page = vehicleRepository.search(
                VehicleStatus.ACTIVE, null, null, city, category, budget, null, null, null,
                PageRequest.of(0, 3, Sort.by("pricePerDay").ascending()));

        List<VehicleResponse> result = new ArrayList<>();
        for (kz.autorrent.entity.Vehicle vehicle : page.getContent()) {
            Double rating = reviewRepository.averageRating(vehicle.getId(), ReviewStatus.VISIBLE);
            long reviewCount = reviewRepository.countByReservationVehicleIdAndStatus(vehicle.getId(), ReviewStatus.VISIBLE);
            result.add(DtoMapper.toVehicleResponse(vehicle, rating, reviewCount));
        }
        return result;
    }

    private String buildReply(List<VehicleResponse> cars, BigDecimal budget,
                              String city, VehicleCategory category, boolean greeting) {
        StringBuilder sb = new StringBuilder();
        if (greeting) {
            sb.append("Сәлем! Я AI-консультант AutoRent KZ. ");
        }
        if (cars.isEmpty()) {
            sb.append("Подходящих машин сейчас не нашлось");
            if (budget != null) sb.append(" (бюджет до ").append(budget).append(" ₸)");
            if (city != null) sb.append(" в городе ").append(russianCity(city));
            sb.append(". Попробуйте увеличить бюджет или выбрать другой город.");
            return sb.toString();
        }
        sb.append("Нашёл ").append(cars.size())
                .append(cars.size() == 1 ? " вариант" : cars.size() < 5 ? " варианта" : " вариантов");
        if (category != null) sb.append(" — класс ").append(category.name());
        if (city != null) sb.append(", ").append(russianCity(city));
        if (budget != null) sb.append(", до ").append(budget).append(" ₸/день");
        sb.append(". Вот лучшие:\n");
        for (int i = 0; i < cars.size(); i++) {
            VehicleResponse c = cars.get(i);
            sb.append(i + 1).append(") ").append(c.brand()).append(' ').append(c.model())
                    .append(" (").append(c.year()).append(") — ").append(c.pricePerDay()).append(" ₸/день");
            if (c.averageRating() != null) {
                sb.append(", ⭐ ").append(String.format(Locale.ROOT, "%.1f", c.averageRating()));
            }
            sb.append('\n');
        }
        sb.append("Откройте карточку машины и нажмите «Забронировать» — скидка 10% применится автоматически от 7 дней.");
        return sb.toString();
    }

    private String answerRules(String normalized) {
        if (containsAny(normalized, "скидк", "discount", "дешевле", "промокод")) {
            return "Скидка 10% действует автоматически при аренде от 7 дней — её видно в расчёте цены "
                    + "на странице машины. Отдельный промокод не нужен.";
        }
        if (containsAny(normalized, "документ", "права", "водительск", "удостоверен", "паспорт", "passport")) {
            return "Для аренды нужны: паспорт и действительное водительское удостоверение (стаж от 2 лет). "
                    + "Оригиналы покажете при получении машины.";
        }
        if (containsAny(normalized, "оплат", "карт", "наличн", "kaspi", "каспи", "payment", "pay")) {
            return "Оплата: Kaspi, банковская карта или наличные при получении. "
                    + "Бронь бесплатна — деньги списываются только после подтверждения администратором.";
        }
        if (containsAny(normalized, "отмен", "вернул", "refund", "cancel")) {
            return "Отменить бронь можно бесплатно в разделе «Мои брони» — даты сразу освободятся. "
                    + "Причина отмены необязательна.";
        }
        if (containsAny(normalized, "страхов", "каско", "осаго", "insurance")) {
            return "КАСКО и ОСАГО включены в стоимость аренды — платить за страховку отдельно не нужно.";
        }
        if (containsAny(normalized, "возраст", "стаж", "сколько лет")) {
            return "Минимальный возраст арендатора — 21 год, водительский стаж — от 2 лет.";
        }
        if (containsAny(normalized, "как забронир", "как аренд", "how to book", "порядок")) {
            return "Как забронировать: 1) выберите машину в каталоге, 2) укажите даты, "
                    + "3) нажмите «Забронировать», 4) дождитесь подтверждения в «Мои брони». "
                    + "Цена фиксируется сразу со скидкой, если срок ≥ 7 дней.";
        }
        return null;
    }

    private static boolean containsAny(String text, String... words) {
        for (String word : words) {
            if (text.contains(word)) {
                return true;
            }
        }
        return false;
    }

    private static String russianCity(String city) {
        return switch (city) {
            case "Almaty" -> "Алматы";
            case "Astana" -> "Астана";
            case "Shymkent" -> "Шымкент";
            case "Karaganda" -> "Караганда";
            case "Aktau" -> "Актау";
            default -> city;
        };
    }

    private BigDecimal extractBudget(String normalized) {
        Matcher matcher = BUDGET_PATTERN.matcher(normalized);
        BigDecimal best = null;
        while (matcher.find()) {
            String suffix = matcher.group(2);
            // Accept only amounts that look like money (with currency hint or >= 1000)
            long value;
            try {
                value = Long.parseLong(matcher.group(1));
            } catch (NumberFormatException e) {
                continue;
            }
            if (suffix != null || value >= 1000) {
                if (value >= 100 && value <= 1_000_000_000L) {
                    BigDecimal candidate = BigDecimal.valueOf(value);
                    if (best == null || candidate.compareTo(best) > 0) {
                        best = candidate;
                    }
                }
            }
        }
        return best;
    }

    private String extractCity(String normalized) {
        for (Map.Entry<String, String> entry : CITY_KEYWORDS.entrySet()) {
            if (normalized.contains(entry.getKey())) {
                return entry.getValue();
            }
        }
        return null;
    }

    private VehicleCategory extractCategory(String normalized) {
        for (Map.Entry<String, VehicleCategory> entry : CATEGORY_KEYWORDS.entrySet()) {
            if (normalized.contains(entry.getKey())) {
                return entry.getValue();
            }
        }
        return null;
    }

    private List<String> defaultSuggestions() {
        return List.of(
                "Подбери машину до 25000 тенге в Алматы",
                "Внедорожник в Астане",
                "Как работает скидка?",
                "Какие документы нужны?"
        );
    }
}
