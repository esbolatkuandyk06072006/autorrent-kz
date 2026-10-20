package kz.autorrent.service;

import kz.autorrent.dto.car.CarFilter;
import kz.autorrent.dto.car.CarRequest;
import kz.autorrent.dto.car.CarResponse;
import kz.autorrent.dto.common.PageResponse;
import kz.autorrent.entity.Car;
import kz.autorrent.entity.enums.CarStatus;
import kz.autorrent.entity.enums.ReviewStatus;
import kz.autorrent.exception.ConflictException;
import kz.autorrent.exception.NotFoundException;
import kz.autorrent.mapper.DtoMapper;
import kz.autorrent.repository.CarRepository;
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
public class CarService {

    private final CarRepository carRepository;
    private final ReservationRepository reservationRepository;
    private final ReviewRepository reviewRepository;

    @Transactional(readOnly = true)
    public PageResponse<CarResponse> search(CarFilter filter, Pageable pageable) {
        Page<Car> page = carRepository.search(
                CarStatus.ACTIVE,
                filter.brand(),
                filter.city(),
                filter.category(),
                filter.maxPrice(),
                pageable
        );
        return PageResponse.from(page.map(DtoMapper::toCarResponse));
    }

    @Transactional(readOnly = true)
    public PageResponse<CarResponse> searchAvailable(CarFilter filter,
                                                     LocalDate startDate,
                                                     LocalDate endDate,
                                                     Pageable pageable) {
        BookingRules.validateDates(startDate, endDate);
        Page<Car> page = carRepository.searchAvailable(
                CarStatus.ACTIVE,
                filter.brand(),
                filter.city(),
                filter.category(),
                filter.maxPrice(),
                startDate,
                endDate,
                BookingRules.ACTIVE_STATUSES,
                pageable
        );
        return PageResponse.from(page.map(DtoMapper::toCarResponse));
    }

    @Transactional(readOnly = true)
    public CarResponse getById(Long id) {
        Car car = getCar(id);
        Double averageRating = reviewRepository.averageRating(id, ReviewStatus.VISIBLE);
        long reviewCount = reviewRepository.countByReservationCarIdAndStatus(id, ReviewStatus.VISIBLE);
        return DtoMapper.toCarResponse(car, averageRating, reviewCount);
    }

    @Transactional
    public CarResponse create(CarRequest request) {
        String licensePlate = normalizePlate(request.licensePlate());
        if (carRepository.existsByLicensePlateIgnoreCase(licensePlate)) {
            throw new ConflictException("Car with this license plate already exists");
        }

        Car car = Car.builder()
                .brand(request.brand().trim())
                .model(request.model().trim())
                .year(request.year())
                .licensePlate(licensePlate)
                .category(request.category())
                .transmission(request.transmission())
                .fuelType(request.fuelType())
                .seats(request.seats())
                .pricePerDay(request.pricePerDay())
                .city(request.city().trim())
                .status(CarStatus.ACTIVE)
                .description(request.description())
                .imageUrl(request.imageUrl())
                .build();

        return DtoMapper.toCarResponse(carRepository.save(car));
    }

    @Transactional
    public CarResponse update(Long id, CarRequest request) {
        Car car = getCar(id);
        String licensePlate = normalizePlate(request.licensePlate());
        if (carRepository.existsByLicensePlateIgnoreCaseAndIdNot(licensePlate, id)) {
            throw new ConflictException("Car with this license plate already exists");
        }

        car.setBrand(request.brand().trim());
        car.setModel(request.model().trim());
        car.setYear(request.year());
        car.setLicensePlate(licensePlate);
        car.setCategory(request.category());
        car.setTransmission(request.transmission());
        car.setFuelType(request.fuelType());
        car.setSeats(request.seats());
        car.setPricePerDay(request.pricePerDay());
        car.setCity(request.city().trim());
        car.setDescription(request.description());
        car.setImageUrl(request.imageUrl());

        return DtoMapper.toCarResponse(carRepository.save(car));
    }

    @Transactional
    public CarResponse updateStatus(Long id, CarStatus status) {
        Car car = getCar(id);
        if (status != CarStatus.ACTIVE
                && reservationRepository.existsByCarIdAndStatusIn(id, BookingRules.ACTIVE_STATUSES)) {
            throw new ConflictException("Car has active reservations and cannot be moved to " + status);
        }
        car.setStatus(status);
        return DtoMapper.toCarResponse(carRepository.save(car));
    }

    @Transactional
    public void delete(Long id) {
        Car car = getCar(id);
        if (reservationRepository.existsByCarId(id)) {
            car.setStatus(CarStatus.ARCHIVED);
            carRepository.save(car);
        } else {
            carRepository.delete(car);
        }
    }

    @Transactional(readOnly = true)
    public Car getCar(Long id) {
        return carRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Car not found: " + id));
    }

    private String normalizePlate(String plate) {
        return plate.trim().toUpperCase(Locale.ROOT);
    }
}
