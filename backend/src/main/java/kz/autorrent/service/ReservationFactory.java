package kz.autorrent.service;

import kz.autorrent.entity.Vehicle;
import kz.autorrent.entity.Reservation;
import kz.autorrent.entity.User;
import kz.autorrent.entity.enums.ReservationStatus;
import kz.autorrent.service.pricing.PriceQuote;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
public class ReservationFactory {

    /** Создаёт бронь из расчёта PriceQuote (суточной или почасовой, с оператором или без). */
    public Reservation create(User user,
                              Vehicle vehicle,
                              LocalDate startDate,
                              LocalDate endDate,
                              PriceQuote quote) {
        Reservation.ReservationBuilder builder = Reservation.builder()
                .user(user)
                .vehicle(vehicle)
                .startDate(startDate)
                .endDate(endDate)
                .daysCount(quote.days())
                .withOperator(quote.operatorTotal() != null && quote.operatorTotal().signum() > 0)
                .discountPercent(quote.discountPercent())
                .status(ReservationStatus.PENDING);

        if ("HOUR".equals(quote.rentalUnit())) {
            // Почасовая аренда: цена — за часы, суточная цена остаётся справочной.
            builder.hours(quote.hours())
                    .pricePerHourSnapshot(quote.pricePerHour())
                    .pricePerDaySnapshot(vehicle.getPricePerDay());
        } else {
            builder.pricePerDaySnapshot(quote.pricePerDay());
        }

        return builder.totalPrice(quote.totalPrice()).build();
    }
}
