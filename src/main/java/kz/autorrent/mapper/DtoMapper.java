package kz.autorrent.mapper;

import kz.autorrent.dto.car.CarResponse;
import kz.autorrent.dto.reservation.ReservationResponse;
import kz.autorrent.dto.review.ReviewResponse;
import kz.autorrent.dto.user.UserResponse;
import kz.autorrent.entity.Car;
import kz.autorrent.entity.Reservation;
import kz.autorrent.entity.Review;
import kz.autorrent.entity.User;

public final class DtoMapper {

    private DtoMapper() {
    }

    public static UserResponse toUserResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getPhone(),
                user.getRole().name()
        );
    }

    public static CarResponse toCarResponse(Car car) {
        return toCarResponse(car, null, null);
    }

    public static CarResponse toCarResponse(Car car, Double averageRating, Long reviewCount) {
        return new CarResponse(
                car.getId(),
                car.getBrand(),
                car.getModel(),
                car.getYear(),
                car.getLicensePlate(),
                car.getCategory().name(),
                car.getTransmission().name(),
                car.getFuelType().name(),
                car.getSeats(),
                car.getPricePerDay(),
                car.getCity(),
                car.getStatus().name(),
                car.getDescription(),
                car.getImageUrl(),
                averageRating,
                reviewCount
        );
    }

    public static ReservationResponse toReservationResponse(Reservation reservation) {
        return new ReservationResponse(
                reservation.getId(),
                reservation.getUser().getId(),
                reservation.getUser().getEmail(),
                reservation.getCar().getId(),
                reservation.getCar().getBrand(),
                reservation.getCar().getModel(),
                reservation.getCar().getLicensePlate(),
                reservation.getCar().getCity(),
                reservation.getStartDate(),
                reservation.getEndDate(),
                reservation.getDaysCount(),
                reservation.getPricePerDaySnapshot(),
                reservation.getTotalPrice(),
                reservation.getStatus().name(),
                reservation.getCancellationReason(),
                reservation.getCreatedAt()
        );
    }

    public static ReviewResponse toReviewResponse(Review review) {
        Reservation reservation = review.getReservation();
        User user = reservation.getUser();
        Car car = reservation.getCar();
        return new ReviewResponse(
                review.getId(),
                reservation.getId(),
                car.getId(),
                car.getBrand(),
                car.getModel(),
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                review.getRating(),
                review.getComment(),
                review.getStatus().name(),
                review.getCreatedAt()
        );
    }
}
