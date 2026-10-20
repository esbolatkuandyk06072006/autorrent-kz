package kz.autorrent.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * SPA fallback for client-side routing (react-router).
 * Only the real SPA routes are forwarded to index.html so that static
 * files under /assets and the API under /api are served as usual.
 */
@Controller
public class SpaForwardController {

    @GetMapping({
            "/",
            "/cars",
            "/cars/{id:\\d+}",
            "/login",
            "/register",
            "/my-reservations",
            "/profile",
            "/admin",
            "/admin/{path:[a-z\\-]+}"
    })
    public String forward() {
        return "forward:/index.html";
    }
}
