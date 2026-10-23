package kz.autorrent.service;

import kz.autorrent.dto.common.PageResponse;
import kz.autorrent.dto.vehicle.VehicleFilter;
import kz.autorrent.dto.vehicle.VehicleRequest;
import kz.autorrent.dto.vehicle.VehicleResponse;
import kz.autorrent.entity.Vehicle;
import kz.autorrent.entity.User;
import kz.autorrent.entity.enums.ReservationStatus;
import kz.autorrent.entity.enums.VehicleCategory;
import kz.autorrent.entity.enums.VehicleLicense;
import kz.autorrent.entity.enums.VehicleStatus;
import kz.autorrent.entity.enums.VehicleType;
import kz.autorrent.entity.enums.ReviewStatus;
import kz.autorrent.entity.enums.Role;
import kz.autorrent.exception.ConflictException;
import kz.autorrent.exception.ForbiddenException;
import kz.autorrent.exception.NotFoundException;
import kz.autorrent.mapper.DtoMapper;
import kz.autorrent.repository.UserRepository;
import kz.autorrent.repository.VehicleRepository;
import kz.autorrent.repository.ReservationRepository;
import kz.autorrent.repository.ReviewRepository;
import kz.autorrent.security.CustomUserDetails;
import kz.autorrent.service.pricing.PriceQuote;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class VehicleService {

    /** Максимум фотографий в галерее одной единицы техники. */
    private static final int MAX_IMAGES = 12;

    /** Максимум тегов умных подборок у одной единицы техники. */
    private static final int MAX_TAGS = 10;

    private final VehicleRepository vehicleRepository;
    private final ReservationRepository reservationRepository;
    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final PricingService pricingService;

    @Transactional(readOnly = true)
    public PageResponse<VehicleResponse> search(VehicleFilter filter, Pageable pageable) {
        Page<Vehicle> page = vehicleRepository.search(
                VehicleStatus.ACTIVE,
                filter.type(),
                filter.brand(),
                filter.city(),
                filter.category(),
                filter.maxPrice(),
                filter.maxCapacity(),
                filter.withOperator(),
                filter.tag(),
                pageable
        );
        return PageResponse.from(page.map(DtoMapper::toVehicleResponse));
    }

    @Transactional(readOnly = true)
    public PageResponse<VehicleResponse> searchAvailable(VehicleFilter filter,
                                                         LocalDate startDate,
                                                         LocalDate endDate,
                                                         Pageable pageable) {
        BookingRules.validateDates(startDate, endDate);
        Page<Vehicle> page = vehicleRepository.searchAvailable(
                VehicleStatus.ACTIVE,
                filter.type(),
                filter.brand(),
                filter.city(),
                filter.category(),
                filter.maxPrice(),
                filter.maxCapacity(),
                filter.withOperator(),
                filter.tag(),
                startDate,
                endDate,
                BookingRules.ACTIVE_STATUSES,
                pageable
        );
        return PageResponse.from(page.map(DtoMapper::toVehicleResponse));
    }

    /**
     * Техника владельца (роль OWNER) или вся техника (админ). Отличается от
     * каталога тем, что включает технику в любом статусе — владелец должен
     * видеть и свою архивированную технику.
     */
    @Transactional(readOnly = true)
    public PageResponse<VehicleResponse> getMy(CustomUserDetails principal, Pageable pageable) {
        if (principal.getRole() != Role.ADMIN && principal.getRole() != Role.OWNER) {
            throw new ForbiddenException("Only owners and admins can view their vehicles");
        }
        Page<Vehicle> page = principal.getRole() == Role.ADMIN
                ? vehicleRepository.findAll(pageable)
                : vehicleRepository.findByOwnerIdOrderByCreatedAtDesc(principal.getId(), pageable);
        return PageResponse.from(page.map(DtoMapper::toVehicleResponse));
    }

    @Transactional(readOnly = true)
    public VehicleResponse getById(Long id) {
        Vehicle vehicle = getVehicle(id);
        Double averageRating = reviewRepository.averageRating(id, ReviewStatus.VISIBLE);
        long reviewCount = reviewRepository.countByReservationVehicleIdAndStatus(id, ReviewStatus.VISIBLE);
        return DtoMapper.toVehicleResponse(vehicle, averageRating, reviewCount);
    }

    /**
     * Календарь занятости: список дат (ISO), которые нельзя выбрать, потому
     * что техника уже забронирована. Разворачивает диапазоны броней в дни,
     * чтобы фронт просто гасил их в календаре.
     */
    @Transactional(readOnly = true)
    public List<String> busyDates(Long vehicleId, LocalDate from, LocalDate to) {
        Vehicle vehicle = getVehicle(vehicleId);

        LocalDate start = from != null ? from : LocalDate.now();
        LocalDate end = to != null ? to : start.plusMonths(6);
        if (!end.isAfter(start)) {
            return List.of();
        }

        List<Object[]> rows = reservationRepository.findBusyRanges(
                vehicle.getId(), start, end, BookingRules.ACTIVE_STATUSES);

        Set<String> busy = new LinkedHashSet<>();
        for (Object[] row : rows) {
            LocalDate rangeStart = (LocalDate) row[0];
            LocalDate rangeEnd = (LocalDate) row[1];
            // Полуинтервал [start, end): день возврата свободен для новой выдачи.
            LocalDate day = rangeStart.isBefore(start) ? start : rangeStart;
            while (day.isBefore(rangeEnd) && !day.isAfter(end)) {
                busy.add(day.toString());
                day = day.plusDays(1);
            }
        }
        return List.copyOf(busy);
    }

    /**
     * Предпросмотр стоимости аренды на выбранные даты (или часы) без создания
     * брони. Используется календарём в карточке техники.
     */
    @Transactional(readOnly = true)
    public PriceQuote priceQuote(Long vehicleId, LocalDate startDate, LocalDate endDate,
                                 Integer hours, Boolean withOperator) {
        Vehicle vehicle = getVehicle(vehicleId);
        return pricingService.quote(vehicle, startDate, endDate, hours, withOperator);
    }

    @Transactional
    public VehicleResponse create(VehicleRequest request, CustomUserDetails principal) {
        String licensePlate = normalizePlate(request.licensePlate());
        if (vehicleRepository.existsByLicensePlateIgnoreCase(licensePlate)) {
            throw new ConflictException("Vehicle with this license plate already exists");
        }

        Vehicle vehicle = Vehicle.builder()
                .brand(request.brand().trim())
                .model(request.model().trim())
                .year(request.year())
                .licensePlate(licensePlate)
                .category(request.category())
                .type(resolveType(request))
                .transmission(request.transmission())
                .fuelType(request.fuelType())
                .seats(resolveSeats(request))
                .capacity(request.capacity())
                .requiredLicense(resolveLicense(request))
                .withOperator(Boolean.TRUE.equals(request.withOperator()))
                .operatorPricePerDay(request.operatorPricePerDay())
                .pricePerHour(request.pricePerHour())
                .pricePerDay(request.pricePerDay())
                .city(request.city().trim())
                // Владелец — текущий пользователь (OWNER); у админа техника
                // может быть без владельца — ей управляет платформа.
                .owner(resolveOwner(principal))
                .status(VehicleStatus.ACTIVE)
                .description(request.description())
                .build();

        vehicle.setTags(normalizeTags(request.tags()));
        List<String> images = normalizeImages(request);
        vehicle.setImages(images);
        // imageUrl дублирует главное фото (images[0]) для обратной совместимости.
        vehicle.setImageUrl(images.isEmpty() ? null : images.get(0));

        return DtoMapper.toVehicleResponse(vehicleRepository.save(vehicle));
    }

    @Transactional
    public VehicleResponse update(Long id, VehicleRequest request, CustomUserDetails principal) {
        Vehicle vehicle = getVehicle(id);
        checkManageAccess(vehicle, principal);
        String licensePlate = normalizePlate(request.licensePlate());
        if (vehicleRepository.existsByLicensePlateIgnoreCaseAndIdNot(licensePlate, id)) {
            throw new ConflictException("Vehicle with this license plate already exists");
        }

        vehicle.setBrand(request.brand().trim());
        vehicle.setModel(request.model().trim());
        vehicle.setYear(request.year());
        vehicle.setLicensePlate(licensePlate);
        vehicle.setCategory(request.category());
        vehicle.setType(resolveType(request));
        vehicle.setTransmission(request.transmission());
        vehicle.setFuelType(request.fuelType());
        vehicle.setSeats(resolveSeats(request));
        vehicle.setCapacity(request.capacity());
        vehicle.setRequiredLicense(resolveLicense(request));
        vehicle.setWithOperator(Boolean.TRUE.equals(request.withOperator()));
        vehicle.setOperatorPricePerDay(request.operatorPricePerDay());
        vehicle.setPricePerHour(request.pricePerHour());
        vehicle.setPricePerDay(request.pricePerDay());
        vehicle.setCity(request.city().trim());
        vehicle.setDescription(request.description());

        vehicle.setTags(normalizeTags(request.tags()));
        List<String> images = normalizeImages(request);
        vehicle.setImages(images);
        vehicle.setImageUrl(images.isEmpty() ? null : images.get(0));

        return DtoMapper.toVehicleResponse(vehicleRepository.save(vehicle));
    }

    @Transactional
    public VehicleResponse updateStatus(Long id, VehicleStatus status, CustomUserDetails principal) {
        Vehicle vehicle = getVehicle(id);
        checkManageAccess(vehicle, principal);
        if (status != VehicleStatus.ACTIVE
                && reservationRepository.existsByVehicleIdAndStatusIn(id, BookingRules.ACTIVE_STATUSES)) {
            throw new ConflictException("Vehicle has active reservations and cannot be moved to " + status);
        }
        vehicle.setStatus(status);
        return DtoMapper.toVehicleResponse(vehicleRepository.save(vehicle));
    }

    @Transactional
    public void delete(Long id, CustomUserDetails principal) {
        Vehicle vehicle = getVehicle(id);
        checkManageAccess(vehicle, principal);
        if (reservationRepository.existsByVehicleId(id)) {
            vehicle.setStatus(VehicleStatus.ARCHIVED);
            vehicleRepository.save(vehicle);
        } else {
            vehicleRepository.delete(vehicle);
        }
    }

    @Transactional(readOnly = true)
    public Vehicle getVehicle(Long id) {
        return vehicleRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Vehicle not found: " + id));
    }

    /**
     * Управление техникой: админ — любую, владелец (OWNER) — только свою.
     */
    private void checkManageAccess(Vehicle vehicle, CustomUserDetails principal) {
        if (principal == null) {
            throw new ForbiddenException("Access denied");
        }
        if (principal.getRole() == Role.ADMIN) {
            return;
        }
        if (principal.getRole() != Role.OWNER
                || vehicle.getOwner() == null
                || !vehicle.getOwner().getId().equals(principal.getId())) {
            throw new ForbiddenException("Only the vehicle owner or an admin can manage this vehicle");
        }
    }

    /** Владелец техники: у OWNER — он сам, у админа — без владельца (платформа). */
    private User resolveOwner(CustomUserDetails principal) {
        if (principal == null || principal.getRole() != Role.OWNER) {
            return null;
        }
        return userRepository.findById(principal.getId()).orElse(null);
    }

    /** Тип: из запроса, иначе выводится из категории. */
    private VehicleType resolveType(VehicleRequest request) {
        return request.type() != null ? request.type() : request.category().group();
    }

    /** Права: из запроса, иначе по умолчанию для группы. */
    private VehicleLicense resolveLicense(VehicleRequest request) {
        if (request.requiredLicense() != null) {
            return request.requiredLicense();
        }
        return switch (request.category()) {
            case LIGHT_TRUCK, MEDIUM_TRUCK -> VehicleLicense.C;
            case HEAVY_TRUCK, DUMP_TRUCK -> VehicleLicense.E;
            case EXCAVATOR, CRANE, BULLDOZER, LOADER, CONCRETE_MIXER -> VehicleLicense.SPECIAL;
            default -> VehicleLicense.B;
        };
    }

    /** Места: из запроса, иначе 5 для легковых и 2 для грузовых/спецтехники. */
    private Integer resolveSeats(VehicleRequest request) {
        if (request.seats() != null) {
            return request.seats();
        }
        return request.category().group() == VehicleType.PASSENGER ? 5 : 2;
    }

    private String normalizePlate(String plate) {
        return plate.trim().toUpperCase(Locale.ROOT);
    }

    /**
     * Собирает чистый список фото: из images запроса, а если его нет — из imageUrl.
     * Убирает пустые/дубликаты и обрезает до MAX_IMAGES. images[0] — главное фото.
     */
    private List<String> normalizeImages(VehicleRequest request) {
        List<String> source = request.images() != null && !request.images().isEmpty()
                ? request.images()
                : (request.imageUrl() == null || request.imageUrl().isBlank()
                        ? List.of()
                        : List.of(request.imageUrl()));

        List<String> result = new ArrayList<>();
        for (String raw : source) {
            if (raw == null) {
                continue;
            }
            String path = raw.trim();
            if (path.isEmpty() || result.contains(path)) {
                continue;
            }
            result.add(path);
            if (result.size() >= MAX_IMAGES) {
                break;
            }
        }
        return result;
    }

    /**
     * Нормализует теги умных подборок: приводит к нижнему регистру, убирает
     * пустые/дубликаты и обрезает до MAX_TAGS. Сохраняется порядок ввода.
     */
    private List<String> normalizeTags(List<String> tags) {
        if (tags == null || tags.isEmpty()) {
            return new ArrayList<>();
        }
        Set<String> unique = new LinkedHashSet<>();
        for (String raw : tags) {
            if (raw == null) {
                continue;
            }
            String tag = raw.trim().toLowerCase(Locale.ROOT);
            if (tag.isEmpty()) {
                continue;
            }
            unique.add(tag);
            if (unique.size() >= MAX_TAGS) {
                break;
            }
        }
        return new ArrayList<>(unique);
    }
}
