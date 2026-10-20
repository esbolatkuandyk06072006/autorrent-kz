package kz.autorrent.service;

import kz.autorrent.entity.Car;
import kz.autorrent.entity.Reservation;
import kz.autorrent.entity.User;
import kz.autorrent.entity.enums.ReservationStatus;
import kz.autorrent.service.pricing.PricingResult;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
public class ReservationFactory {

    public Reservation create(User user,
                              Car car,
                              LocalDate startDate,
                              LocalDate endDate,
                              PricingResult pricing) {
        return Reservation.builder()
                .user(user)
                .car(car)
                .startDate(startDate)
                .endDate(endDate)
                .daysCount(pricing.days())
                .pricePerDaySnapshot(pricing.pricePerDay())
                .totalPrice(pricing.totalPrice())
                .status(ReservationStatus.PENDING)
                .build();
    }
}
