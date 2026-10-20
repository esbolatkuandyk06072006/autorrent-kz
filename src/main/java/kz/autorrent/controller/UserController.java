package kz.autorrent.controller;

import jakarta.validation.Valid;
import kz.autorrent.dto.user.UpdateUserRequest;
import kz.autorrent.dto.user.UserResponse;
import kz.autorrent.security.CustomUserDetails;
import kz.autorrent.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal CustomUserDetails principal) {
        return userService.getMe(principal.getUsername());
    }

    @PutMapping("/me")
    public UserResponse updateMe(@AuthenticationPrincipal CustomUserDetails principal,
                                 @Valid @RequestBody UpdateUserRequest request) {
        return userService.updateMe(principal.getUsername(), request);
    }
}
