package kz.autorrent.repository;

import kz.autorrent.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    /** Поиск пользователя по телефону (формат +7XXXXXXXXXX). */
    Optional<User> findByPhone(String phone);

    boolean existsByPhone(String phone);
}
