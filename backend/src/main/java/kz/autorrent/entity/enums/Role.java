package kz.autorrent.entity.enums;

/**
 * Роли пользователей:
 * USER — клиент, арендует технику;
 * OWNER — владелец/арендодатель: добавляет свою технику и подтверждает брони по ней;
 * ADMIN — полный доступ.
 */
public enum Role {
    USER,
    OWNER,
    ADMIN
}
