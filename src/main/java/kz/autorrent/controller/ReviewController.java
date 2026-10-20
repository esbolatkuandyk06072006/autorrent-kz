package kz.autorrent.controller;

import jakarta.validation.Valid;
import kz.autorrent.dto.common.PageResponse;
import kz.autorrent.dto.review.ReviewRequest;
import kz.autorrent.dto.review.ReviewResponse;
import kz.autorrent.dto.review.ReviewUpdateRequest;
import kz.autorrent.dto.review.ReviewVisibilityRequest;
import kz.autorrent.security.CustomUserDetails;
import kz.autorrent.service.ReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @GetMapping("/cars/{carId}/reviews")
    public PageResponse<ReviewResponse> getByCar(
            @PathVariable Long carId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {
        return reviewService.getByCar(
                carId,
                PageRequestFactory.reviews(page, size, sortBy, direction)
        );
    }

    @GetMapping("/reviews/{id}")
    public ReviewResponse getById(@PathVariable Long id,
                                  @AuthenticationPrincipal CustomUserDetails principal) {
        return reviewService.getById(id, principal);
    }

    @PostMapping("/reviews")
    public ResponseEntity<ReviewResponse> create(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody ReviewRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reviewService.create(principal.getUsername(), request));
    }

    @PutMapping("/reviews/{id}")
    public ReviewResponse update(@PathVariable Long id,
                                 @AuthenticationPrincipal CustomUserDetails principal,
                                 @Valid @RequestBody ReviewUpdateRequest request) {
        return reviewService.update(id, principal, request);
    }

    @DeleteMapping("/reviews/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id,
                                       @AuthenticationPrincipal CustomUserDetails principal) {
        reviewService.delete(id, principal);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/reviews")
    @PreAuthorize("hasRole('ADMIN')")
    public PageResponse<ReviewResponse> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {
        return reviewService.getAll(
                PageRequestFactory.reviews(page, size, sortBy, direction)
        );
    }

    @PatchMapping("/reviews/{id}/visibility")
    @PreAuthorize("hasRole('ADMIN')")
    public ReviewResponse updateVisibility(@PathVariable Long id,
                                           @Valid @RequestBody ReviewVisibilityRequest request) {
        return reviewService.updateVisibility(id, request.status());
    }
}
