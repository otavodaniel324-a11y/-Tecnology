"""
app.py — Sistema de impresión de factura con Python (Flask + ReportLab)

Flujo:
  1. La persona llena el formulario y pulsa "Impresión de Factura".
  2. Factura.js envía los datos a  POST /api/factura.
  3. Python valida, calcula, guarda la factura en SQLite y devuelve un PDF A4.
  4. El navegador abre el PDF para imprimirlo (Ctrl + P).

Ejecutar:
  pip install -r requirements.txt
  python app.py        →  http://127.0.0.1:5000
"""
import os
import re
import sqlite3
from datetime import datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape

from flask import Flask, jsonify, request, send_file, send_from_directory
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

# ───────────────────────── CONFIGURACIÓN (edita estos datos) ─────────────────────────
EMPRESA = {
    "nombre": "TECNOLOGY",
    "nit": "000.000.000-0",
    "direccion": "San Agustín, Huila",
    "telefono": "300 000 0000",
    "correo": "contacto@tecnology.com",
}
PREFIJO = "CP"                      # Prefijo del número de comprobante
IVA_INCLUIDO_EN_VALOR = False       # False: el IVA se suma al valor. True: el valor ya lo incluye.

BASE = Path(__file__).resolve().parent
DB_PATH = Path(os.environ.get("FACTURAS_DB", BASE / "facturas.db"))

# Paleta (la misma del formulario)
NAVY = colors.HexColor("#0a1426")
CIAN = colors.HexColor("#19e3ff")
TEXTO = colors.HexColor("#14202e")
GRIS = colors.HexColor("#5d7189")
LINEA = colors.HexColor("#c9d6e6")
FONDO_TABLA = colors.HexColor("#eef3f9")

app = Flask(__name__, static_folder=None)


# ───────────────────────── UTILIDADES ─────────────────────────
def esc(texto) -> str:
    """Escapa texto del usuario para que ReportLab no lo interprete como marcado."""
    return escape(str(texto or ""))


def parse_numero(valor) -> Decimal:
    """Convierte '1.500.000', '1,500,000.50', '$ 2.500,75' o '19%' en Decimal."""
    t = re.sub(r"[^\d.,]", "", str(valor or ""))
    if not t:
        return Decimal(0)
    if re.fullmatch(r"\d{1,3}(\.\d{3})+(,\d+)?", t):        # 1.500.000,50
        t = t.replace(".", "").replace(",", ".")
    elif re.fullmatch(r"\d{1,3}(,\d{3})+(\.\d+)?", t):      # 1,500,000.50
        t = t.replace(",", "")
    else:
        t = t.replace(",", ".")
    try:
        return Decimal(t)
    except InvalidOperation:
        return Decimal(0)


def dos_decimales(valor: Decimal) -> Decimal:
    return valor.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def cop(valor: Decimal) -> str:
    """Formato colombiano: $ 1.500.000 (con decimales solo si los hay)."""
    entero, decimales = f"{dos_decimales(valor):.2f}".split(".")
    texto = "$ " + f"{int(entero):,}".replace(",", ".")
    return texto if decimales == "00" else f"{texto},{decimales}"


def limpiar(valor, maximo=120) -> str:
    return str(valor or "").strip()[:maximo]


# ───────────────────────── VALIDACIÓN Y CÁLCULO ─────────────────────────
def preparar_datos(crudo: dict):
    """Devuelve (datos, error). Si hay error, datos es None."""
    d = {
        "cliente": limpiar(crudo.get("cliente")),
        "producto": limpiar(crudo.get("producto")),
        "correo": limpiar(crudo.get("correo")),
        "telefono": limpiar(crudo.get("telefono"), 30),
        "documento": limpiar(crudo.get("documento"), 30),
        "nit": limpiar(crudo.get("nit"), 30),
        "metodo": limpiar(crudo.get("metodo")),
        "banco": limpiar(crudo.get("banco")),
        "adjunto": limpiar(crudo.get("adjunto")),
    }

    obligatorios = {
        "cliente": "el nombre del cliente",
        "producto": "el producto",
        "correo": "el correo electrónico",
        "telefono": "el teléfono",
        "documento": "el documento",
        "metodo": "el medio de pago",
    }
    for campo, nombre in obligatorios.items():
        if not d[campo]:
            return None, f"Falta {nombre}."

    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", d["correo"]):
        return None, "El correo electrónico no es válido."

    valor = parse_numero(crudo.get("valor"))
    iva_pct = parse_numero(crudo.get("iva"))
    if valor <= 0:
        return None, "Escribe un valor a pagar mayor que 0."
    if not 0 <= iva_pct <= 100:
        return None, "El IVA debe estar entre 0 y 100."

    if IVA_INCLUIDO_EN_VALOR:
        total = valor
        subtotal = total / (1 + iva_pct / 100)
        iva = total - subtotal
    else:
        subtotal = valor
        iva = subtotal * iva_pct / 100
        total = subtotal + iva

    d["iva_pct"] = iva_pct.normalize() if iva_pct == iva_pct.to_integral() else iva_pct
    d["subtotal"] = dos_decimales(subtotal)
    d["iva"] = dos_decimales(iva)
    d["total"] = dos_decimales(total)
    return d, None


# ───────────────────────── BASE DE DATOS (consecutivo) ─────────────────────────
def registrar_factura(d: dict) -> str:
    """Guarda la factura y devuelve su número consecutivo (CP-000001...)."""
    con = sqlite3.connect(DB_PATH)
    try:
        with con:
            con.execute(
                """CREATE TABLE IF NOT EXISTS facturas (
                       id        INTEGER PRIMARY KEY AUTOINCREMENT,
                       fecha     TEXT NOT NULL,
                       cliente   TEXT NOT NULL,
                       documento TEXT NOT NULL,
                       producto  TEXT NOT NULL,
                       subtotal  TEXT NOT NULL,
                       iva       TEXT NOT NULL,
                       total     TEXT NOT NULL,
                       metodo    TEXT NOT NULL
                   )"""
            )
            cur = con.execute(
                """INSERT INTO facturas
                   (fecha, cliente, documento, producto, subtotal, iva, total, metodo)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    datetime.now().isoformat(timespec="seconds"),
                    d["cliente"], d["documento"], d["producto"],
                    str(d["subtotal"]), str(d["iva"]), str(d["total"]), d["metodo"],
                ),
            )
            numero = cur.lastrowid
    finally:
        con.close()
    return f"{PREFIJO}-{numero:06d}"


# ───────────────────────── GENERACIÓN DEL PDF ─────────────────────────
def construir_pdf(d: dict, numero: str) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=14 * mm, rightMargin=14 * mm, topMargin=14 * mm, bottomMargin=14 * mm,
        title=f"{numero} - Comprobante de pago", author=EMPRESA["nombre"],
    )
    ancho = doc.width

    base = ParagraphStyle("base", fontName="Helvetica", fontSize=10, leading=14, textColor=TEXTO)
    etiqueta = ParagraphStyle("etiqueta", parent=base, fontSize=8, leading=10, textColor=GRIS)
    valor = ParagraphStyle("valor", parent=base, fontName="Helvetica-Bold")
    titulo_seccion = ParagraphStyle("seccion", parent=base, fontName="Helvetica-Bold", fontSize=11.5)
    derecha = ParagraphStyle("derecha", parent=base, alignment=TA_RIGHT)
    centro = ParagraphStyle("centro", parent=base, fontSize=9, alignment=TA_CENTER)
    aviso = ParagraphStyle("aviso", parent=base, fontSize=8.5, leading=11, textColor=GRIS)

    fecha = datetime.now().strftime("%d/%m/%Y %H:%M")
    historia = []

    # ── Encabezado ──
    izquierda = Paragraph(
        f'<font size="20" color="white"><b>{esc(EMPRESA["nombre"])}</b></font><br/>'
        f'<font size="9" color="#b7c8e0">NIT {esc(EMPRESA["nit"])}<br/>'
        f'{esc(EMPRESA["direccion"])}<br/>'
        f'{esc(EMPRESA["telefono"])} · {esc(EMPRESA["correo"])}</font>',
        ParagraphStyle("cab_izq", parent=base, leading=14),
    )
    lado_derecho = Paragraph(
        f'<font size="11" color="#19e3ff"><b>COMPROBANTE DE PAGO</b></font><br/>'
        f'<font size="18" color="white"><b>{esc(numero)}</b></font><br/>'
        f'<font size="9" color="#b7c8e0">{esc(fecha)}</font>',
        ParagraphStyle("cab_der", parent=derecha, leading=16),
    )
    cabecera = Table([[izquierda, lado_derecho]], colWidths=[ancho * 0.58, ancho * 0.42])
    cabecera.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
        ("LINEBELOW", (0, 0), (-1, -1), 3, CIAN),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
    ]))
    historia += [cabecera, Spacer(1, 14)]

    # ── Bloques de datos en dos columnas ──
    def seccion(titulo, items):
        items = [(e, v) for e, v in items if v]
        celdas = [[Paragraph(esc(e), etiqueta), Paragraph(esc(v), valor)] for e, v in items]
        if len(celdas) % 2:
            celdas.append("")
        filas = [celdas[i:i + 2] for i in range(0, len(celdas), 2)]
        tabla = Table(filas, colWidths=[ancho / 2, ancho / 2])
        tabla.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
        ]))
        titulo_t = Table([[Paragraph(esc(titulo), titulo_seccion)]], colWidths=[ancho])
        titulo_t.setStyle(TableStyle([
            ("LINEBELOW", (0, 0), (-1, -1), 0.8, LINEA),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        return [titulo_t, Spacer(1, 6), tabla, Spacer(1, 8)]

    historia += seccion("Datos del cliente", [
        ("Cliente", d["cliente"]),
        ("Documento", d["documento"]),
        ("Nit / Empresa", d["nit"]),
        ("Teléfono / WhatsApp", d["telefono"]),
        ("Correo electrónico", d["correo"]),
    ])

    # ── Detalle ──
    pct = f'{d["iva_pct"]}%'
    detalle = Table(
        [
            ["Producto", "Subtotal", f"IVA ({pct})", "Total"],
            [Paragraph(esc(d["producto"]), base), cop(d["subtotal"]), cop(d["iva"]), cop(d["total"])],
        ],
        colWidths=[ancho * 0.40, ancho * 0.20, ancho * 0.20, ancho * 0.20],
    )
    detalle.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("TEXTCOLOR", (0, 0), (-1, -1), TEXTO),
        ("BACKGROUND", (0, 0), (-1, 0), FONDO_TABLA),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, LINEA),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    titulo_detalle = Table([[Paragraph("Detalle", titulo_seccion)]], colWidths=[ancho])
    titulo_detalle.setStyle(TableStyle([
        ("LINEBELOW", (0, 0), (-1, -1), 0.8, LINEA),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    historia += [titulo_detalle, Spacer(1, 6), detalle, Spacer(1, 10)]

    # ── Totales ──
    totales = Table(
        [
            ["Subtotal", cop(d["subtotal"])],
            [f"IVA ({pct})", cop(d["iva"])],
            ["TOTAL A PAGAR", cop(d["total"])],
        ],
        colWidths=[ancho * 0.26, ancho * 0.26],
        hAlign="RIGHT",
    )
    totales.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (-1, -2), TEXTO),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("BACKGROUND", (0, -1), (-1, -1), NAVY),
        ("TEXTCOLOR", (0, -1), (-1, -1), colors.white),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, -1), (-1, -1), 12),
        ("TOPPADDING", (0, -1), (-1, -1), 9),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 9),
    ]))
    historia += [totales, Spacer(1, 16)]

    # ── Medio de pago ──
    historia += seccion("Medio de pago", [
        ("Método", d["metodo"]),
        ("Banco", d["banco"]),
        ("Comprobante adjunto", d["adjunto"]),
    ])

    # ── Firmas ──
    firmas = Table(
        [["Firma del cliente", "", f'Firma y sello de {EMPRESA["nombre"]}']],
        colWidths=[ancho * 0.44, ancho * 0.12, ancho * 0.44],
    )
    firmas.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("LINEABOVE", (0, 0), (0, 0), 0.8, TEXTO),
        ("LINEABOVE", (2, 0), (2, 0), 0.8, TEXTO),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
    ]))
    historia += [Spacer(1, 40), firmas, Spacer(1, 24)]

    # ── Aviso ──
    nota = Table(
        [[Paragraph(
            "Este documento es un comprobante de pago informativo. No reemplaza la factura "
            "electrónica de venta validada por la DIAN.", aviso)]],
        colWidths=[ancho],
    )
    nota.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.6, LINEA, None, (3, 3)),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    historia.append(nota)

    doc.build(historia)
    return buffer.getvalue()


# ───────────────────────── RUTAS ─────────────────────────
ARCHIVOS_PUBLICOS = {"Pago.css", "Pago.js", "Factura.js"}


@app.get("/")
def inicio():
    return send_from_directory(BASE, "pago-opciones-carrito.html")


@app.get("/Imagenes/<path:archivo>")
def imagenes(archivo):
    return send_from_directory(BASE / "Imagenes", archivo)


@app.get("/<nombre>")
def publicos(nombre):
    if nombre not in ARCHIVOS_PUBLICOS:
        return jsonify(error="No encontrado"), 404
    return send_from_directory(BASE, nombre)


@app.post("/api/factura")
def api_factura():
    crudo = request.get_json(silent=True) or {}
    datos, error = preparar_datos(crudo)
    if error:
        return jsonify(error=error), 400

    numero = registrar_factura(datos)
    pdf = construir_pdf(datos, numero)
    return send_file(
        BytesIO(pdf),
        mimetype="application/pdf",
        download_name=f"{numero}.pdf",
        as_attachment=False,
    )


if __name__ == "__main__":
    # debug=False: el modo debug permite ejecutar código desde el navegador
    app.run(host="127.0.0.1", port=5000, debug=False)