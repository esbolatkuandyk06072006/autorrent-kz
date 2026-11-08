package kz.autorrent.repository;

import kz.autorrent.entity.HandoverReport;
import kz.autorrent.entity.enums.HandoverType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface HandoverReportRepository extends JpaRepository<HandoverReport, Long> {

    /** Оба акта брони (выдача и возврат) — по времени создания. */
    List<HandoverReport> findByReservationIdOrderByCreatedAtAsc(Long reservationId);

    /** Один акт (уникальность пары reservation_id + type). */
    Optional<HandoverReport> findByReservationIdAndType(Long reservationId, HandoverType type);
}
