package kz.autorrent;

import com.fasterxml.jackson.databind.ObjectMapper;
import kz.autorrent.dto.auth.LoginRequest;
import kz.autorrent.entity.User;
import kz.autorrent.entity.enums.Role;
import kz.autorrent.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthAndCarIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void createUsers() {
        createUserIfMissing("admin@test.kz", "Admin123!", Role.ADMIN);
        createUserIfMissing("user@test.kz", "User123!", Role.USER);
    }

    @Test
    void adminCanCreateCarAndPublicCanListIt() throws Exception {
        String token = login("admin@test.kz", "Admin123!");
        String carJson = """
                {
                  "brand": "Toyota",
                  "model": "Camry",
                  "year": 2023,
                  "licensePlate": "TEST123",
                  "category": "COMFORT",
                  "transmission": "AUTOMATIC",
                  "fuelType": "PETROL",
                  "seats": 5,
                  "pricePerDay": 25000.00,
                  "city": "Almaty",
                  "description": "Integration test car"
                }
                """;

        mockMvc.perform(post("/api/v1/cars")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(carJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.brand").value("Toyota"))
                .andExpect(jsonPath("$.id").exists());

        mockMvc.perform(get("/api/v1/cars"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].brand").value("Toyota"));
    }

    @Test
    void regularUserCannotCreateCar() throws Exception {
        String token = login("user@test.kz", "User123!");
        String carJson = """
                {
                  "brand": "Kia",
                  "model": "Rio",
                  "year": 2022,
                  "licensePlate": "USER123",
                  "category": "ECONOMY",
                  "transmission": "MANUAL",
                  "fuelType": "PETROL",
                  "seats": 5,
                  "pricePerDay": 15000.00,
                  "city": "Shymkent"
                }
                """;

        mockMvc.perform(post("/api/v1/cars")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(carJson))
                .andExpect(status().isForbidden());
    }

    private String login(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(email, password))))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }

    private void createUserIfMissing(String email, String password, Role role) {
        if (userRepository.existsByEmailIgnoreCase(email)) {
            return;
        }
        userRepository.save(User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .firstName("Test")
                .lastName(role.name())
                .role(role)
                .enabled(true)
                .build());
    }
}
