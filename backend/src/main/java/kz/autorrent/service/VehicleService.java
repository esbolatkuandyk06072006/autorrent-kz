package kz.autorrent.service;

import kz.autorrent.dto.common.PageResponse;
import kz.autorrent.dto.vehicle.VehicleFilter;
import kz.autorrent.dto.vehicle.VehicleRequest;
import kz.autorrent.dto.vehicle.VehicleResponse;
import kz.autorrent.entity.Vehicle;
import kz.autorrent.entity.enums.VehicleCategory;
import kz.autorrent.entity.enums.VehicleLicense;
import kz.autorrent.entity.enums.VehicleStatus;
import kz.autorrent.entity.enums.VehicleType;
import kz.autorrent.entity.enums.ReviewStatus;
import kz.autorrent.exception.ConflictException;
import kz.autorrent.exception.NotFoundException;
import kz.autorrent.mapper.DtoMapper;
import kz.autorrent.repository.VehicleRepository;
import kz.autorrent.repository.ReservationRepository;
import kz.autorrent.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class VehicleService {

    private final VehicleRepository vehicleRepository;
    private final ReservationRepository reservationRepository;
    private final ReviewRepository reviewRepository;

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
                startDate,
                endDate,
                BookingRules.ACTIVE_STATUSES,
                pageable
        );
        return PageResponse.from(page.map(DtoMapper::toVehicleResponse));
    }

    @Transactional(readOnly = true)
    public VehicleResponse getById(Long id) {
        Vehicle vehicle = getVehicle(id);
        Double averageRating = reviewRepository.averageRating(id, ReviewStatus.VISIBLE);
        long reviewCount = reviewRepository.countByReservationVehicleIdAndStatus(id, ReviewStatus.VISIBLE);
        return DtoMapper.toVehicleResponse(vehicle, averageRating, reviewCount);
    }

    @Transactional
    public VehicleResponse create(VehicleRequest request) {
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
                .status(VehicleStatus.ACTIVE)
                .description(request.description())
                .imageUrl(request.imageUrl())
                .build();

        return DtoMapper.toVehicleResponse(vehicleRepository.save(vehicle));
    }

    @Transactional
    public VehicleResponse update(Long id, VehicleRequest request) {
        Vehicle vehicle = getVehicle(id);
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
        vehicle.setImageUrl(request.imageUrl());

        return DtoMapper.toVehicleResponse(vehicleRepository.save(vehicle));
    }

    @Transactional
    public VehicleResponse updateStatus(Long id, VehicleStatus status) {
        Vehicle vehicle = getVehicle(id);
        if (status != VehicleStatus.ACTIVE
                && reservationRepository.existsByVehicleIdAndStatusIn(id, BookingRules.ACTIVE_STATUSES)) {
            throw new ConflictException("Vehicle has active reservations and cannot be moved to " + status);
        }
        vehicle.setStatus(status);
        return DtoMapper.toVehicleResponse(vehicleRepository.save(vehicle));
    }

    @Transactional
    public void delete(Long id) {
        Vehicle vehicle = getVehicle(id);
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
}
