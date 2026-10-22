package kz.autorrent.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;

/**
 * Отдача фотографий техники.
 *
 * Путь /images/vehicles/{id}/{file} резолвится в двух местах (в порядке приоритета):
 * 1) внешний каталог загрузок (app.upload.dir) — сюда сохраняются фото,
 *    загруженные через админку во время работы приложения;
 * 2) classpath:/static/images/vehicles/ — фото из frontend/public, попадающие
 *    в сборку (seed-пути вида /images/vehicles/{id}/1.jpg).
 *
 * Поэтому ручное размещение файлов в frontend/public и загрузка через форму
 * отдают одинаковый URL и не мешают друг другу.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String uploadLocation = Path.of(uploadDir, "vehicles").toUri().toString();
        registry.addResourceHandler("/images/vehicles/**")
                .addResourceLocations(uploadLocation, "classpath:/static/images/vehicles/");
    }
}
