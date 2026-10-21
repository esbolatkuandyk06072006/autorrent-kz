package kz.autorrent.entity.enums;

/**
 * Top-level vehicle group used by the catalog filter:
 * the user picks the group first, then a subcategory (VehicleCategory).
 */
public enum VehicleType {
    /** Легковые: эконом, комфорт, бизнес, внедорожник, электро. */
    PASSENGER,
    /** Грузовые: газель, средние, фуры, самосвалы. */
    CARGO,
    /** Спецтехника: экскаваторы, краны, бульдозеры, погрузчики, бетономешалки. */
    SPECIAL
}
