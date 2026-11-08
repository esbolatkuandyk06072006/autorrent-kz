package kz.autorrent.service;

import kz.autorrent.entity.enums.VehicleLicense;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Категории прав: B допускает любую технику, C — только грузовые,
 * E — тяжёлые, SPECIAL — только спецтехника.
 */
class VehicleLicenseTest {

    @Test
    void anyLicenseAllowsPassengerVehicles() {
        assertThat(VehicleLicense.B.allows(VehicleLicense.B)).isTrue();
        assertThat(VehicleLicense.C.allows(VehicleLicense.B)).isTrue();
        assertThat(VehicleLicense.E.allows(VehicleLicense.B)).isTrue();
        assertThat(VehicleLicense.SPECIAL.allows(VehicleLicense.B)).isTrue();
    }

    @Test
    void cargoRequiresCOrE() {
        assertThat(VehicleLicense.C.allows(VehicleLicense.C)).isTrue();
        assertThat(VehicleLicense.E.allows(VehicleLicense.C)).isTrue();

        assertThat(VehicleLicense.B.allows(VehicleLicense.C)).isFalse();
        assertThat(VehicleLicense.SPECIAL.allows(VehicleLicense.C)).isFalse();
    }

    @Test
    void heavyVehiclesRequireE() {
        assertThat(VehicleLicense.E.allows(VehicleLicense.E)).isTrue();

        assertThat(VehicleLicense.B.allows(VehicleLicense.E)).isFalse();
        assertThat(VehicleLicense.C.allows(VehicleLicense.E)).isFalse();
        assertThat(VehicleLicense.SPECIAL.allows(VehicleLicense.E)).isFalse();
    }

    @Test
    void specialEquipmentRequiresSpecialCertificate() {
        assertThat(VehicleLicense.SPECIAL.allows(VehicleLicense.SPECIAL)).isTrue();

        assertThat(VehicleLicense.B.allows(VehicleLicense.SPECIAL)).isFalse();
        assertThat(VehicleLicense.C.allows(VehicleLicense.SPECIAL)).isFalse();
        assertThat(VehicleLicense.E.allows(VehicleLicense.SPECIAL)).isFalse();
    }

    @Test
    void nullRequirementAllowsEverything() {
        assertThat(VehicleLicense.B.allows(null)).isTrue();
        assertThat(VehicleLicense.SPECIAL.allows(null)).isTrue();
    }
}
