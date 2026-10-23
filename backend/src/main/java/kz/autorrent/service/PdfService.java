package kz.autorrent.service;

import kz.autorrent.dto.business.BusinessOrderResponse;
import kz.autorrent.dto.reservation.ReservationResponse;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * Генерация PDF-документов (Apache PDFBox): подтверждение брони и счёт для
 * юрлица (режим «Для бизнеса»). Шрифт DejaVuSans с кириллицей лежит в
 * resources/fonts, чтобы казахский/русский текст отображался корректно.
 */
@Service
@Slf4j
public class PdfService {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final float MARGIN = 50f;
    private static final float LINE = 18f;

    /** Загружает шрифт из resources/fonts; при отсутствии откатывается на стандартный. */
    private PDFont loadFont(PDDocument document, String path, boolean bold) {
        try (InputStream in = new ClassPathResource(path).getInputStream()) {
            return PDType0Font.load(document, in);
        } catch (IOException | RuntimeException e) {
            log.warn("Font {} not available ({}), falling back to Helvetica", path, e.getMessage());
            return new PDType1Font(bold
                    ? Standard14Fonts.FontName.HELVETICA_BOLD
                    : Standard14Fonts.FontName.HELVETICA);
        }
    }

    /** Подтверждение одной брони (PDF на A4). */
    public byte[] reservationPdf(ReservationResponse reservation) {
        try (PDDocument document = new PDDocument()) {
            PDFont font = loadFont(document, "fonts/DejaVuSans.ttf", false);
            PDFont bold = loadFont(document, "fonts/DejaVuSans-Bold.ttf", true);

            document.addPage(new PDPage(PDRectangle.A4));

            try (PDPageContentStream cs = new PDPageContentStream(
                    document, document.getPage(0), PDPageContentStream.AppendMode.OVERWRITE, true)) {
                float y = drawHeader(cs, bold, "AutoRent KZ — подтверждение брони #" + reservation.id());
                y = drawLine(cs, font, y, "Клиент: " + safe(reservation.userEmail()));
                y = drawLine(cs, font, y, "Техника: " + safe(reservation.carBrand()) + " "
                        + safe(reservation.carModel()) + " (" + safe(reservation.carLicensePlate()) + ")");
                y = drawLine(cs, font, y, "Город: " + safe(reservation.city()));
                y = drawLine(cs, font, y, "Период: " + date(reservation.startDate()) + " — "
                        + date(reservation.endDate()));
                if (reservation.hours() != null) {
                    y = drawLine(cs, font, y, "Почасовая аренда: " + reservation.hours() + " ч");
                }
                y = drawLine(cs, font, y, "Срок: " + reservation.daysCount() + " дн.");
                y = drawLine(cs, font, y, "С оператором: "
                        + (Boolean.TRUE.equals(reservation.withOperator()) ? "да" : "нет"));
                y = drawLine(cs, font, y, "Цена за сутки: " + money(reservation.pricePerDay()));
                if (reservation.discountPercent() != null
                        && reservation.discountPercent().compareTo(BigDecimal.ZERO) > 0) {
                    y = drawLine(cs, font, y, "Скидка: " + reservation.discountPercent() + "%");
                }
                y = drawLine(cs, font, y, "Статус: " + safe(reservation.status()));
                y = drawLine(cs, bold, y, "Итого: " + money(reservation.totalPrice()));
                drawFooter(cs, font, y);
            }

            return toBytes(document);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to generate reservation PDF", e);
        }
    }

    /** Счёт на юрлицо: реквизиты компании (название + БИН) и список позиций. */
    public byte[] businessOrderPdf(BusinessOrderResponse order) {
        try (PDDocument document = new PDDocument()) {
            PDFont font = loadFont(document, "fonts/DejaVuSans.ttf", false);
            PDFont bold = loadFont(document, "fonts/DejaVuSans-Bold.ttf", true);

            document.addPage(new PDPage(PDRectangle.A4));

            try (PDPageContentStream cs = new PDPageContentStream(
                    document, document.getPage(0), PDPageContentStream.AppendMode.OVERWRITE, true)) {
                float y = drawHeader(cs, bold, "AutoRent KZ — счёт на юрлицо #" + order.id());
                y = drawLine(cs, font, y, "Компания: " + safe(order.companyName()));
                y = drawLine(cs, font, y, "БИН: " + safe(order.bin()));
                y = drawLine(cs, font, y, "Заказчик (аккаунт): " + safe(order.userEmail()));
                y += 10f;

                y = drawLine(cs, bold, y, "Позиции:");
                for (BusinessOrderResponse.ReservationSummary item : order.items()) {
                    y = drawLine(cs, font, y, "  • " + safe(item.carBrand()) + " " + safe(item.carModel())
                            + " (" + safe(item.carLicensePlate()) + "), " + date(item.startDate())
                            + " — " + date(item.endDate())
                            + (item.hours() != null
                                    ? ", " + item.hours() + " ч"
                                    : ", " + item.daysCount() + " дн.")
                            + " — " + money(item.totalPrice()));
                }
                y += 10f;
                y = drawLine(cs, bold, y, "Итого по счёту: " + money(order.totalPrice()));
                drawFooter(cs, font, y);
            }

            return toBytes(document);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to generate business order PDF", e);
        }
    }

    private float drawHeader(PDPageContentStream cs, PDFont titleFont, String title) throws IOException {
        float y = PDRectangle.A4.getHeight() - MARGIN;
        cs.beginText();
        cs.setFont(titleFont, 16);
        cs.newLineAtOffset(MARGIN, y);
        cs.showText(title);
        cs.endText();
        return y - 2 * LINE;
    }

    private float drawLine(PDPageContentStream cs, PDFont font, float y, String text) throws IOException {
        cs.beginText();
        cs.setFont(font, 11);
        cs.newLineAtOffset(MARGIN, y);
        cs.showText(text == null ? "" : text);
        cs.endText();
        return y - LINE;
    }

    private void drawFooter(PDPageContentStream cs, PDFont font, float y) throws IOException {
        cs.beginText();
        cs.setFont(font, 9);
        cs.newLineAtOffset(MARGIN, Math.max(y - LINE, MARGIN));
        cs.showText("Документ сформирован " + LocalDate.now().format(DATE)
                + " на autorrent.kz. Оплата производится после подтверждения брони.");
        cs.endText();
    }

    private byte[] toBytes(PDDocument document) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        document.save(out);
        return out.toByteArray();
    }

    private String date(LocalDate value) {
        return value == null ? "—" : value.format(DATE);
    }

    private String money(BigDecimal value) {
        return value == null ? "—" : value.stripTrailingZeros().toPlainString() + " ₸";
    }

    private String safe(String value) {
        return value == null ? "—" : value;
    }
}
