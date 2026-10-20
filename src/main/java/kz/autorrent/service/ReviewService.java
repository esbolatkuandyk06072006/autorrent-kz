package kz.autorrent.service;

import kz.autorrent.dto.common.PageResponse;
import kz.autorrent.dto.review.ReviewRequest;
import kz.autorrent.dto.review.ReviewResponse;
import kz.autorrent.dto.review.ReviewUpdateRequest;
import kz.autorrent.entity.Reservation;
import kz.autorrent.entity.Review;
import kz.autorrent.entity.enums.ReservationStatus;
import kz.autorrent.entity.enums.ReviewStatus;
import kz.autorrent.entity.enums.Role;
import kz.autorrent.exception.ConflictException;
import kz.autorrent.exception.NotFoundException;
import kz.autorrent.mapper.DtoMapper;
import kz.autorrent.repository.CarRepository;
import kz.autorrent.repository.ReservationRepository;
import kz.autorrent.repository.ReviewRepository;
import kz.autorrent.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ReservationRepository reservationRepository;
    private final CarRepository carRepository;

    @Transactional
    public ReviewResponse create(String email, ReviewRequest request) {
        Reservation reservation = reservationRepository.findWithDetailsById(request.reservationId())
                .orElseThrow(() -> new NotFoundException("Reservation not found: " + request.reservationId()));

        if (!reservation.getUser().getEmail().equalsIgnoreCase(email)) {
            throw new AccessDeniedException("You can review only your own reservations");
        }
        if (reservation.getStatus() != ReservationStatus.COMPLETED) {
            throw new ConflictException("Review can be left only after a completed reservation");
        }
        if (reviewRepository.existsByReservationId(reservation.getId())) {
            throw new ConflictException("This reservation already has a review");
        }

        Review review = Review.builder()
                .reservation(reservation)
                .rating(request.rating())
                .comment(request.comment().trim())
                .status(ReviewStatus.VISIBLE)
                .build();

        return DtoMapper.toReviewResponse(reviewRepository.save(review));
    }

    @Transactional(readOnly = true)
    public PageResponse<ReviewResponse> getByCar(Long carId, Pageable pageable) {
        if (!carRepository.existsById(carId)) {
            throw new NotFoundException("Car not found: " + carId);
        }
        return PageResponse.from(reviewRepository
                .findByCarIdAndStatusWithDetails(carId, ReviewStatus.VISIBLE, pageable)
                .map(DtoMapper::toReviewResponse));
    }

    @Transactional(readOnly = true)
    public ReviewResponse getById(Long id, CustomUserDetails principal) {
        Review review = find(id);
        if (review.getStatus() == ReviewStatus.HIDDEN) {
            checkOwnerOrAdmin(review, principal, true);
        }
        return DtoMapper.toReviewResponse(review);
    }

    @Transactional
    public ReviewResponse update(Long id, CustomUserDetails principal, ReviewUpdateRequest request) {
        Review review = find(id);
        checkOwnerOrAdmin(review, principal, false);
        review.setRating(request.rating());
        review.setComment(request.comment().trim());
        return DtoMapper.toReviewResponse(reviewRepository.save(review));
    }

    @Transactional
    public void delete(Long id, CustomUserDetails principal) {
        Review review = find(id);
        checkOwnerOrAdmin(review, principal, false);
        reviewRepository.delete(review);
    }

    @Transactional(readOnly = true)
    public PageResponse<ReviewResponse> getAll(Pageable pageable) {
        return PageResponse.from(reviewRepository
                .findAllWithDetails(pageable)
                .map(DtoMapper::toReviewResponse));
    }

    @Transactional
    public ReviewResponse updateVisibility(Long id, ReviewStatus status) {
        Review review = find(id);
        review.setStatus(status);
        return DtoMapper.toReviewResponse(reviewRepository.save(review));
    }

    private Review find(Long id) {
        return reviewRepository.findWithDetailsById(id)
                .orElseThrow(() -> new NotFoundException("Review not found: " + id));
    }

    private void checkOwnerOrAdmin(Review review, CustomUserDetails principal, boolean hideAsNotFound) {
        if (principal == null) {
            if (hideAsNotFound) {
                throw new NotFoundException("Review not found");
            }
            throw new AccessDeniedException("Access denied");
        }
        if (principal.getRole() == Role.ADMIN) {
            return;
        }
        Long ownerId = review.getReservation().getUser().getId();
        if (!ownerId.equals(principal.getId())) {
            if (hideAsNotFound) {
                throw new NotFoundException("Review not found");
            }
            throw new AccessDeniedException("Access denied");
        }
    }
}
