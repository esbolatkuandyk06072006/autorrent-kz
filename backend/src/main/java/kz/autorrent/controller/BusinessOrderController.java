package kz.autorrent.controller;

import jakarta.validation.Valid;
import kz.autorrent.dto.business.BusinessOrderItemRequest;
import kz.autorrent.dto.business.BusinessOrderResponse;
import kz.autorrent.security.CustomUserDetails;
import kz.autorrent.service.BusinessOrderService;
import kz.autorrent.service.PdfService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Режим «Для бизнеса»: заявка на несколько единиц техники для юрлица
 * (название компании + БИН) и экспорт счёта в PDF.
 */
@RestController
@RequestMapping("/api/v1/business/orders")
@RequiredArgsConstructor
public class BusinessOrderController {

    private final BusinessOrderService businessOrderService;
    private final PdfService pdfService;

    public record BusinessOrderCreateRequest(
            @jakarta.validation.constraints.NotBlank
            @jakarta.validation.constraints.Size(max = 200) String companyName,
            @jakarta.validation.constraints.NotBlank
            @jakarta.validation.constraints.Pattern(regexp = "\\d{12}",
                    message = "BIN must be 12 digits") String bin,
            @jakarta.validation.Valid
            @jakarta.validation.constraints.NotEmpty
            List<BusinessOrderItemRequest> items) {
    }

    @PostMapping
    public ResponseEntity<BusinessOrderResponse> create(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody BusinessOrderCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(businessOrderService.create(
                        principal.getUsername(), request.companyName(), request.bin(), request.items()));
    }

    @GetMapping("/my")
    public List<BusinessOrderResponse> myOrders(
            @AuthenticationPrincipal CustomUserDetails principal) {
        return businessOrderService.getMy(principal.getUsername());
    }

    @GetMapping("/{id}")
    public BusinessOrderResponse getById(@PathVariable Long id,
                                         @AuthenticationPrincipal CustomUserDetails principal) {
        return businessOrderService.getById(id, principal);
    }

    /** Счёт на юрлицо в PDF: реквизиты компании, позиции и итог. */
    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> exportPdf(@PathVariable Long id,
                                            @AuthenticationPrincipal CustomUserDetails principal) {
        BusinessOrderResponse order = businessOrderService.getById(id, principal);
        byte[] pdf = pdfService.businessOrderPdf(order);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"invoice-" + id + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}
