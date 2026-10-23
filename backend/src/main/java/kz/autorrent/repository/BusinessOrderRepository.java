package kz.autorrent.repository;

import kz.autorrent.entity.BusinessOrder;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BusinessOrderRepository extends JpaRepository<BusinessOrder, Long> {
}
