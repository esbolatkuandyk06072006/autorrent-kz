package kz.autorrent.repository;

import kz.autorrent.entity.KycDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface KycDocumentRepository extends JpaRepository<KycDocument, Long> {

    /** Все документы пользователя. */
    List<KycDocument> findByUserId(Long userId);

    /** Удаление документа слота (перед повторной загрузкой того же слота). */
    @Modifying
    @Query("delete from KycDocument d where d.user.id = :userId and d.slot = :slot")
    void deleteByUserIdAndSlot(@Param("userId") Long userId, @Param("slot") String slot);
}
