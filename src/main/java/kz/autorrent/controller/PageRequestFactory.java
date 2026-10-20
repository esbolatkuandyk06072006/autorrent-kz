package kz.autorrent.controller;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.Set;

public final class PageRequestFactory {

    private static final Set<String> CAR_SORT_FIELDS =
            Set.of("id", "brand", "model", "year", "pricePerDay", "city", "createdAt");
    private static final Set<String> RESERVATION_SORT_FIELDS =
            Set.of("id", "startDate", "endDate", "totalPrice", "status", "createdAt");
    private static final Set<String> REVIEW_SORT_FIELDS =
            Set.of("id", "rating", "createdAt");

    private PageRequestFactory() {
    }

    public static Pageable cars(int page, int size, String sortBy, String direction) {
        return of(page, size, sortBy, direction, CAR_SORT_FIELDS, "id");
    }

    public static Pageable reservations(int page, int size, String sortBy, String direction) {
        return of(page, size, sortBy, direction, RESERVATION_SORT_FIELDS, "createdAt");
    }

    public static Pageable reviews(int page, int size, String sortBy, String direction) {
        return of(page, size, sortBy, direction, REVIEW_SORT_FIELDS, "createdAt");
    }

    private static Pageable of(int page,
                               int size,
                               String sortBy,
                               String direction,
                               Set<String> allowedSortFields,
                               String defaultSort) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 50);
        String property = allowedSortFields.contains(sortBy) ? sortBy : defaultSort;
        Sort.Direction sortDirection = "desc".equalsIgnoreCase(direction)
                ? Sort.Direction.DESC
                : Sort.Direction.ASC;
        return PageRequest.of(safePage, safeSize, Sort.by(sortDirection, property));
    }
}
