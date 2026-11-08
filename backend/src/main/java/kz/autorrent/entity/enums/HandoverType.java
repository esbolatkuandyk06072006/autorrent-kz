package kz.autorrent.entity.enums;

/**
 * Тип акта приёма-передачи (шаг 8):
 * PICKUP — технику выдали клиенту (акт при начале аренды),
 * RETURN — технику вернули (акт при завершении).
 */
public enum HandoverType {
    PICKUP,
    RETURN
}
