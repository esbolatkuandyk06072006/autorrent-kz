package kz.autorrent.mapper;

import kz.autorrent.dto.vehicle.VehicleResponse;
import kz.autorrent.dto.reservation.ReservationResponse;
import kz.autorrent.dto.review.ReviewResponse;
import kz.autorrent.dto.user.UserResponse;
import kz.autorrent.entity.Vehicle;
import kz.autorrent.entity.Reservation;
import kz.autorrent.entity.Review;
import kz.autorrent.entity.User;

import java.util.List;

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
                user.getRole().name(),
                user.getDrivingLicense() == null ? null : user.getDrivingLicense().name()
        );
    }

    public static VehicleResponse toVehicleResponse(Vehicle vehicle) {
        return toVehicleResponse(vehicle, null, null);
    }

    public static VehicleResponse toVehicleResponse(Vehicle vehicle, Double averageRating, Long reviewCount) {
        return new VehicleResponse(
                vehicle.getId(),
                vehicle.getBrand(),
                vehicle.getModel(),
                vehicle.getYear(),
                vehicle.getLicensePlate(),
                vehicle.getType() == null ? null : vehicle.getType().name(),
                vehicle.getCategory().name(),
                vehicle.getTransmission().name(),
                vehicle.getFuelType().name(),
                vehicle.getSeats(),
                vehicle.getCapacity(),
                vehicle.getRequiredLicense() == null ? null : vehicle.getRequiredLicense().name(),
                vehicle.getWithOperator(),
                vehicle.getOperatorPricePerDay(),
                vehicle.getPricePerHour(),
                vehicle.getPricePerDay(),
                vehicle.getCity(),
                vehicle.getStatus().name(),
                vehicle.getDescription(),
                vehicle.getImageUrl(),
                vehicle.getImages() == null ? null : List.copyOf(vehicle.getImages()),
                averageRating,
                reviewCount,
                vehicle.getTags() == null ? null : List.copyOf(vehicle.getTags()),
                vehicle.getOwner() == null ? null : vehicle.getOwner().getId(),
                vehicle.getOwner() == null ? null
                        : vehicle.getOwner().getFirstName() + " " + vehicle.getOwner().getLastName()
        );
    }

    public static ReservationResponse toReservationResponse(Reservation reservation) {
        return new ReservationResponse(
                reservation.getId(),
                reservation.getUser().getId(),
                reservation.getUser().getEmail(),
                reservation.getVehicle().getId(),
                reservation.getVehicle().getBrand(),
                reservation.getVehicle().getModel(),
                reservation.getVehicle().getLicensePlate(),
                reservation.getVehicle().getCity(),
                reservation.getStartDate(),
                reservation.getEndDate(),
                reservation.getDaysCount(),
                reservation.getPricePerDaySnapshot(),
                reservation.getTotalPrice(),
                reservation.getStatus().name(),
                reservation.getCancellationReason(),
                reservation.getCreatedAt(),
                reservation.getHours(),
                reservation.getWithOperator(),
                reservation.getDiscountPercent(),
                reservation.getBusinessOrder() == null ? null : reservation.getBusinessOrder().getId()
        );
    }

    public static ReviewResponse toReviewResponse(Review review) {
        Reservation reservation = review.getReservation();
        User user = reservation.getUser();
        Vehicle vehicle = reservation.getVehicle();
        return new ReviewResponse(
                review.getId(),
                reservation.getId(),
                vehicle.getId(),
                vehicle.getBrand(),
                vehicle.getModel(),
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
