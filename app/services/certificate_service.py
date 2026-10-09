"""
Generates a real PDF certificate (not a placeholder) using reportlab,
styled to match the product's ink-navy / honors-gold design language.
"""
import os

from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

from app.core.config import settings

INK = colors.HexColor("#16213E")
GOLD = colors.HexColor("#C9974A")
MUTED = colors.HexColor("#6B7280")


def generate_certificate_pdf(student_name: str, course_title: str, certificate_number: str, issued_at) -> str:
    subdir = "certificates"
    target_dir = os.path.join(settings.UPLOAD_DIR, subdir)
    os.makedirs(target_dir, exist_ok=True)

    filename = f"{certificate_number}.pdf"
    full_path = os.path.join(target_dir, filename)

    page_size = landscape(letter)
    width, height = page_size
    c = canvas.Canvas(full_path, pagesize=page_size)

    # Border
    c.setStrokeColor(INK)
    c.setLineWidth(3)
    c.rect(0.4 * inch, 0.4 * inch, width - 0.8 * inch, height - 0.8 * inch)
    c.setStrokeColor(GOLD)
    c.setLineWidth(1)
    c.rect(0.52 * inch, 0.52 * inch, width - 1.04 * inch, height - 1.04 * inch)

    # Seal (circle motif — the product's signature element)
    seal_x, seal_y = width - 1.7 * inch, 1.6 * inch
    c.setFillColor(GOLD)
    c.circle(seal_x, seal_y, 0.55 * inch, fill=1, stroke=0)
    c.setFillColor(INK)
    c.circle(seal_x, seal_y, 0.4 * inch, fill=1, stroke=0)
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(seal_x, seal_y + 3, "EDUSPHERE")
    c.drawCentredString(seal_x, seal_y - 9, "PRO")

    # Header
    c.setFillColor(INK)
    c.setFont("Helvetica", 14)
    c.drawCentredString(width / 2, height - 1.3 * inch, "EDUSPHERE PRO")
    c.setFont("Helvetica-Bold", 34)
    c.drawCentredString(width / 2, height - 1.9 * inch, "Certificate of Completion")

    c.setStrokeColor(GOLD)
    c.setLineWidth(2)
    c.line(width / 2 - 1.5 * inch, height - 2.15 * inch, width / 2 + 1.5 * inch, height - 2.15 * inch)

    # Body
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 13)
    c.drawCentredString(width / 2, height - 2.8 * inch, "This certifies that")

    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 28)
    c.drawCentredString(width / 2, height - 3.4 * inch, student_name)

    c.setFillColor(MUTED)
    c.setFont("Helvetica", 13)
    c.drawCentredString(width / 2, height - 3.95 * inch, "has successfully completed the course")

    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 20)
    c.drawCentredString(width / 2, height - 4.5 * inch, course_title)

    # Footer
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 10)
    c.drawString(1 * inch, 1.1 * inch, f"Issued: {issued_at.strftime('%B %d, %Y')}")
    c.drawString(1 * inch, 0.9 * inch, f"Certificate No: {certificate_number}")
    c.drawString(1 * inch, 0.7 * inch, f"Verify at: {settings.FRONTEND_URL}/verify/{certificate_number}")

    c.showPage()
    c.save()

    return f"/uploads/{subdir}/{filename}"
