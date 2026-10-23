package kz.autorrent.entity.enums;

/**
 * Required driving licence / certificate for a vehicle group.
 */
public enum VehicleLicense {
    B,               // легковые
    C,               // лёгкие/средние грузовые
    E,               // тяжёлые грузовые, автопоезда
    SPECIAL;         // спецудостоверение на спецтехнику

    /**
     * Проверка соответствия водительского удостоверения требованиям техники.
     * Правила (упрощённые, соответствуют реальному порядку категорий):
     * - любая категория допускает вождение легковых машин (B);
     * - грузовые с правами C доступны владельцам C и E;
     * - тяжёлые/автопоезда (E) — только с правами E;
     * - спецтехника — только со спецудостоверением (SPECIAL).
     */
    public boolean allows(VehicleLicense required) {
        if (required == null) {
            return true;
        }
        return switch (required) {
            case B -> true;
            case C -> this == C || this == E;
            case E -> this == E;
            case SPECIAL -> this == SPECIAL;
        };
    }
}
