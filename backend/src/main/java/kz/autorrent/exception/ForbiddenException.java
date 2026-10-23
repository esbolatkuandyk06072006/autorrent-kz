package kz.autorrent.exception;

/** Нет прав на действие (403): чужая техника, чужая бронь, недоступная роль. */
public class ForbiddenException extends RuntimeException {

    public ForbiddenException(String message) {
        super(message);
    }
}
