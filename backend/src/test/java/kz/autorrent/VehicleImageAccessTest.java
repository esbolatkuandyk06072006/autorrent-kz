package kz.autorrent;

import com.fasterxml.jackson.databind.ObjectMapper;
import kz.autorrent.dto.auth.LoginRequest;
import kz.autorrent.entity.User;
import kz.autorrent.entity.Vehicle;
import kz.autorrent.entity.enums.FuelType;
import kz.autorrent.entity.enums.Role;
import kz.autorrent.entity.enums.Transmission;
import kz.autorrent.entity.enums.VehicleCategory;
import kz.autorrent.entity.enums.VehicleStatus;
import kz.autorrent.entity.enums.VehicleType;
import kz.autorrent.repository.UserRepository;
import kz.autorrent.repository.VehicleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Доступ к фотографиям техники: владелец (OWNER) управляет фото только
 * своей техники, чужое — 403; админ — любой; клиенту — отказ.
 * Заодно проверяется, что поля noDeposit / deliveryAvailable
 * проходят через создание техники и возвращаются в ответе.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class VehicleImageAccessTest {

    private static final String JPEG_BYTES = "fake-jpeg-content";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private Vehicle ownVehicle;

    @BeforeEach
    void setUp() {
        User owner = createUserIfMissing("img-owner@test.kz", "Owner123!", Role.OWNER);
        User otherOwner = createUserIfMissing("img-other@test.kz", "Owner123!", Role.OWNER);
        createUserIfMissing("img-user@test.kz", "User123!", Role.USER);
        createUserIfMissing("img-admin@test.kz", "Admin123!", Role.ADMIN);

        ownVehicle = vehicleRepository.findByLicensePlateIgnoreCase("IMGTEST1")
                .orElseGet(() -> vehicleRepository.save(Vehicle.builder()
                        .brand("Kamaz")
                        .model("6520")
                        .year(2021)
                        .licensePlate("IMGTEST1")
                        .type(VehicleType.CARGO)
                        .category(VehicleCategory.MEDIUM_TRUCK)
                        .transmission(Transmission.MANUAL)
                        .fuelType(FuelType.DIESEL)
                        .pricePerDay(new BigDecimal("45000.00"))
                        .city("Almaty")
                        .owner(owner)
                        .status(VehicleStatus.ACTIVE)
                        .build()));

        // Чужая техника того же вида — для проверки запрета владельцу чужой машины.
        vehicleRepository.findByLicensePlateIgnoreCase("IMGTEST2")
                .orElseGet(() -> vehicleRepository.save(Vehicle.builder()
                        .brand("Toyota")
                        .model("Land Cruiser")
                        .year(2023)
                        .licensePlate("IMGTEST2")
                        .type(VehicleType.PASSENGER)
                        .category(VehicleCategory.SUV)
                        .transmission(Transmission.AUTOMATIC)
                        .fuelType(FuelType.PETROL)
                        .pricePerDay(new BigDecimal("50000.00"))
                        .city("Astana")
                        .owner(otherOwner)
                        .status(VehicleStatus.ACTIVE)
                        .build()));
    }

    @Test
    void ownerUploadsPhotosToOwnVehicle() throws Exception {
        String token = login("img-owner@test.kz", "Owner123!");
        mockMvc.perform(multipart("/api/v1/vehicles/{id}/images", ownVehicle.getId())
                        .file(new MockMultipartFile("files", "main.jpg", "image/jpeg",
                                JPEG_BYTES.getBytes(StandardCharsets.UTF_8)))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.images[0]").exists())
                .andExpect(jsonPath("$.imageUrl").isNotEmpty());
    }

    @Test
    void ownerCannotUploadToOthersVehicle() throws Exception {
        String token = login("img-owner@test.kz", "Owner123!");
        Long foreignId = vehicleRepository.findByLicensePlateIgnoreCase("IMGTEST2").orElseThrow().getId();
        mockMvc.perform(multipart("/api/v1/vehicles/{id}/images", foreignId)
                        .file(new MockMultipartFile("files", "hack.jpg", "image/jpeg",
                                JPEG_BYTES.getBytes(StandardCharsets.UTF_8)))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void regularUserCannotUploadPhotos() throws Exception {
        String token = login("img-user@test.kz", "User123!");
        mockMvc.perform(multipart("/api/v1/vehicles/{id}/images", ownVehicle.getId())
                        .file(new MockMultipartFile("files", "photo.jpg", "image/jpeg",
                                JPEG_BYTES.getBytes(StandardCharsets.UTF_8)))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCanUploadToAnyVehicle() throws Exception {
        String token = login("img-admin@test.kz", "Admin123!");
        mockMvc.perform(multipart("/api/v1/vehicles/{id}/images", ownVehicle.getId())
                        .file(new MockMultipartFile("files", "admin.jpg", "image/jpeg",
                                JPEG_BYTES.getBytes(StandardCharsets.UTF_8)))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void ownerCanCreateVehicleWithNoDepositAndDelivery() throws Exception {
        String token = login("img-owner@test.kz", "Owner123!");
        String carJson = """
                {
                  "brand": "Hyundai",
                  "model": "HD78",
                  "year": 2022,
                  "licensePlate": "IMGTEST3",
                  "type": "CARGO",
                  "category": "MEDIUM_TRUCK",
                  "transmission": "MANUAL",
                  "fuelType": "DIESEL",
                  "pricePerDay": 38000.00,
                  "city": "Karaganda",
                  "noDeposit": true,
                  "deliveryAvailable": true
                }
                """;

        MvcResult result = mockMvc.perform(post("/api/v1/vehicles")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(carJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.noDeposit").value(true))
                .andExpect(jsonPath("$.deliveryAvailable").value(true))
                .andReturn();

        assertThat(result.getResponse().getContentAsString()).contains("IMGTEST3");
    }

    private String login(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(email, password))))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }

    private User createUserIfMissing(String email, String password, Role role) {
        return userRepository.findByEmailIgnoreCase(email).orElseGet(() ->
                userRepository.save(User.builder()
                        .email(email)
                        .passwordHash(passwordEncoder.encode(password))
                        .firstName("Test")
                        .lastName(role.name())
                        .role(role)
                        .enabled(true)
                        .build()));
    }
}
