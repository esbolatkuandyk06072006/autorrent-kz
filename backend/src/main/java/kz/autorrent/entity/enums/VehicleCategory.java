package kz.autorrent.entity.enums;

/**
 * Vehicle subcategory. The first five constants keep the original car classes
 * (backward compatible with existing data and the frontend), the rest extend
 * the catalogue to cargo vehicles and special machinery.
 */
public enum VehicleCategory {
    // Легковые
    ECONOMY,
    COMFORT,
    BUSINESS,
    SUV,
    ELECTRIC,
    // Грузовые
    LIGHT_TRUCK,      // ГАЗель, до 1.5 т
    MEDIUM_TRUCK,     // среднетоннажный, 1.5–5 т
    HEAVY_TRUCK,      // фура, 5+ т
    DUMP_TRUCK,       // самосвал
    // Спецтехника
    EXCAVATOR,
    CRANE,
    BULLDOZER,
    LOADER,
    CONCRETE_MIXER;

    /** Группа, в которую входит подкатегория. */
    public VehicleType group() {
        return switch (this) {
            case ECONOMY, COMFORT, BUSINESS, SUV, ELECTRIC -> VehicleType.PASSENGER;
            case LIGHT_TRUCK, MEDIUM_TRUCK, HEAVY_TRUCK, DUMP_TRUCK -> VehicleType.CARGO;
            case EXCAVATOR, CRANE, BULLDOZER, LOADER, CONCRETE_MIXER -> VehicleType.SPECIAL;
        };
    }
}
