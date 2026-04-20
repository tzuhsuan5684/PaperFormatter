"""NCU thesis template builder using python-docx."""
import io
from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Inches, Pt, RGBColor

from schemas.thesis_schema import Appendix, Chapter, Section, SymbolEntry, ThesisSchema

FONT_ZH = "標楷體"
FONT_EN = "Times New Roman"
BODY_PT = 12


# ─── Low-level helpers ────────────────────────────────────────────────────────

def _set_font(run, latin=FONT_EN, east_asia=FONT_ZH, size_pt=BODY_PT,
              bold=False, italic=False):
    run.font.name = latin
    run.font.size = Pt(size_pt)
    run.font.bold = bold
    run.font.italic = italic
    rPr = run._r.get_or_add_rPr()
    existing = rPr.find(qn("w:rFonts"))
    if existing is None:
        rFonts = OxmlElement("w:rFonts")
        rPr.insert(0, rFonts)
        existing = rFonts
    existing.set(qn("w:ascii"), latin)
    existing.set(qn("w:hAnsi"), latin)
    existing.set(qn("w:eastAsia"), east_asia)


def _para_fmt(para, align=WD_ALIGN_PARAGRAPH.LEFT, first_indent_pt=0,
              left_indent_pt=0, hanging_pt=0,
              space_before_pt=0, space_after_pt=0):
    fmt = para.paragraph_format
    fmt.alignment = align
    fmt.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
    fmt.line_spacing = 1.5
    if first_indent_pt:
        fmt.first_line_indent = Pt(first_indent_pt)
    if left_indent_pt:
        fmt.left_indent = Pt(left_indent_pt)
    if hanging_pt:
        fmt.first_line_indent = Pt(-hanging_pt)
        fmt.left_indent = Pt(hanging_pt)
    if space_before_pt:
        fmt.space_before = Pt(space_before_pt)
    if space_after_pt:
        fmt.space_after = Pt(space_after_pt)


def _add_page_number_field(run):
    """Insert PAGE field code into a run."""
    fldChar1 = OxmlElement("w:fldChar")
    fldChar1.set(qn("w:fldCharType"), "begin")
    run._r.append(fldChar1)

    instrText = OxmlElement("w:instrText")
    instrText.set(qn("xml:space"), "preserve")
    instrText.text = " PAGE "
    run._r.append(instrText)

    fldChar2 = OxmlElement("w:fldChar")
    fldChar2.set(qn("w:fldCharType"), "end")
    run._r.append(fldChar2)


def _set_section_page_number(section, fmt="lowerRoman", start=1):
    """Set page number format on a section's sectPr XML."""
    sectPr = section._sectPr
    for existing in sectPr.findall(qn("w:pgNumType")):
        sectPr.remove(existing)
    pgNumType = OxmlElement("w:pgNumType")
    pgNumType.set(qn("w:fmt"), fmt)
    pgNumType.set(qn("w:start"), str(start))
    sectPr.append(pgNumType)


def _setup_section(section):
    """Apply A4 page size and 1-inch margins."""
    section.page_width = Cm(21)
    section.page_height = Cm(29.7)
    section.left_margin = Inches(1)
    section.right_margin = Inches(1)
    section.top_margin = Inches(1)
    section.bottom_margin = Inches(1)


def _add_footer_page_number(section):
    """Add centred page number to section footer."""
    section.footer.is_linked_to_previous = False
    para = section.footer.paragraphs[0]
    para.clear()
    _para_fmt(para, align=WD_ALIGN_PARAGRAPH.CENTER)
    run = para.add_run()
    _set_font(run, size_pt=10)
    _add_page_number_field(run)


# ─── Paragraph factories ──────────────────────────────────────────────────────

def _center(doc: Document, text: str, size_pt=BODY_PT, bold=False, italic=False,
            space_before=0, space_after=0) -> None:
    para = doc.add_paragraph()
    _para_fmt(para, align=WD_ALIGN_PARAGRAPH.CENTER,
              space_before_pt=space_before, space_after_pt=space_after)
    run = para.add_run(text)
    _set_font(run, size_pt=size_pt, bold=bold, italic=italic)


def _body(doc: Document, text: str, indent=True) -> None:
    para = doc.add_paragraph()
    _para_fmt(para, align=WD_ALIGN_PARAGRAPH.JUSTIFY,
              first_indent_pt=(BODY_PT * 2) if indent else 0)
    run = para.add_run(text)
    _set_font(run)


def _heading1(doc: Document, text: str) -> None:
    para = doc.add_paragraph(style="Heading 1")
    _para_fmt(para, align=WD_ALIGN_PARAGRAPH.LEFT, space_before_pt=8)
    run = para.add_run(text)
    _set_font(run, size_pt=13, bold=True)


def _heading2(doc: Document, text: str) -> None:
    para = doc.add_paragraph(style="Heading 2")
    _para_fmt(para, align=WD_ALIGN_PARAGRAPH.LEFT,
              left_indent_pt=BODY_PT, space_before_pt=4)
    run = para.add_run(text)
    _set_font(run, size_pt=BODY_PT)


def _chapter_heading(doc: Document, text: str, size_pt: int, italic: bool = False) -> None:
    """Chapter title tagged as Heading 1 so TOC picks it up, but rendered centred."""
    para = doc.add_paragraph(style="Heading 1")
    _para_fmt(para, align=WD_ALIGN_PARAGRAPH.CENTER, space_after_pt=6)
    run = para.add_run(text)
    _set_font(run, size_pt=size_pt, bold=True, italic=italic)


def _configure_toc_styles(doc: Document) -> None:
    for level in (1, 2, 3):
        try:
            style = doc.styles[f"TOC {level}"]
        except KeyError:
            continue
        font = style.font
        font.name = FONT_EN
        font.size = Pt(12)
        font.color.rgb = RGBColor(0x00, 0x00, 0x00)
        rPr = style.element.get_or_add_rPr()
        for existing in rPr.findall(qn("w:rFonts")):
            rPr.remove(existing)
        rFonts = OxmlElement("w:rFonts")
        rFonts.set(qn("w:ascii"), FONT_EN)
        rFonts.set(qn("w:hAnsi"), FONT_EN)
        rFonts.set(qn("w:eastAsia"), FONT_ZH)
        rPr.insert(0, rFonts)


def _configure_heading_styles(doc: Document) -> None:
    """Override built-in Heading styles so the downloaded file matches NCU thesis fonts."""
    specs = [
        ("Heading 1", 16, True),
        ("Heading 2", 13, True),
        ("Heading 3", BODY_PT, True),
    ]
    for name, size_pt, bold in specs:
        try:
            style = doc.styles[name]
        except KeyError:
            continue
        font = style.font
        font.name = FONT_EN
        font.size = Pt(size_pt)
        font.bold = bold
        font.color.rgb = RGBColor(0, 0, 0)
        rPr = style.element.get_or_add_rPr()
        for existing in rPr.findall(qn("w:rFonts")):
            rPr.remove(existing)
        rFonts = OxmlElement("w:rFonts")
        rFonts.set(qn("w:ascii"), FONT_EN)
        rFonts.set(qn("w:hAnsi"), FONT_EN)
        rFonts.set(qn("w:eastAsia"), FONT_ZH)
        rPr.insert(0, rFonts)


def _insert_toc_field(doc: Document, switches: str) -> None:
    """Insert a Word TOC field. Updates on first open in Word (F9 / prompt)."""
    para = doc.add_paragraph()
    _para_fmt(para)
    run = para.add_run()
    _set_font(run)

    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    run._r.append(begin)

    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = f" TOC {switches} "
    run._r.append(instr)

    sep = OxmlElement("w:fldChar")
    sep.set(qn("w:fldCharType"), "separate")
    run._r.append(sep)

    placeholder = OxmlElement("w:t")
    placeholder.text = "（請於 Word 中按 F9 更新目錄）"
    run._r.append(placeholder)

    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    run._r.append(end)


def _enable_update_fields_on_open(doc: Document) -> None:
    """Ask Word to prompt/update all fields when the document is opened."""
    settings = doc.settings.element
    for existing in settings.findall(qn("w:updateFields")):
        settings.remove(existing)
    update = OxmlElement("w:updateFields")
    update.set(qn("w:val"), "true")
    settings.append(update)


def _add_page_break(doc: Document) -> None:
    from docx.enum.text import WD_BREAK
    para = doc.add_paragraph()
    run = para.add_run()
    run.add_break(WD_BREAK.PAGE)


# ─── Chinese number utilities ─────────────────────────────────────────────────

_ZH_NUMS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"]


def _to_zh(n: int) -> str:
    if n <= 10:
        return _ZH_NUMS[n]
    if n < 20:
        return f"十{_ZH_NUMS[n - 10]}"
    return str(n)


_ROMAN_VALS = [1000,900,500,400,100,90,50,40,10,9,5,4,1]
_ROMAN_SYMS = ["M","CM","D","CD","C","XC","L","XL","X","IX","V","IV","I"]


def _to_roman(n: int) -> str:
    result = ""
    for v, s in zip(_ROMAN_VALS, _ROMAN_SYMS):
        while n >= v:
            result += s
            n -= v
    return result


# ─── Section builders ─────────────────────────────────────────────────────────

def _build_cover(doc: Document, schema: ThesisSchema) -> None:
    c = schema.cover
    degree_zh = f"{c.degree}論文"
    degree_en = "Doctoral Dissertation" if c.degree == "博士" else "Master's Thesis"

    for _ in range(2):
        doc.add_paragraph()

    _center(doc, "國立中央大學", size_pt=18, bold=True)
    _center(doc, c.department, size_pt=16, bold=True)
    doc.add_paragraph()
    _center(doc, degree_zh, size_pt=16, bold=True)
    _center(doc, degree_en, size_pt=14, bold=True)
    for _ in range(2):
        doc.add_paragraph()
    _center(doc, c.titleZh, size_pt=18, bold=True)
    _center(doc, c.titleEn, size_pt=14, bold=True, italic=True)
    for _ in range(3):
        doc.add_paragraph()
    _center(doc, f"研 究 生：{c.studentName}", size_pt=14)
    _center(doc, f"指導教授：{c.advisorName}", size_pt=14)
    for _ in range(3):
        doc.add_paragraph()
    _center(doc, f"中華民國 {c.year} 年 {c.month} 月", size_pt=14)


def _build_placeholder(doc: Document, title: str) -> None:
    _add_page_break(doc)
    for _ in range(8):
        doc.add_paragraph()
    _center(doc, f"【{title}】", size_pt=16, bold=True)
    doc.add_paragraph()
    _center(doc, "（請貼附正式文件）", size_pt=12)


def _build_abstract_zh(doc: Document, schema: ThesisSchema) -> None:
    _add_page_break(doc)
    _center(doc, "摘要", size_pt=16, bold=True, space_after=8)
    _body(doc, schema.abstractZh.content)
    doc.add_paragraph()
    para = doc.add_paragraph()
    _para_fmt(para, first_indent_pt=BODY_PT * 2)
    r1 = para.add_run("關鍵詞：")
    _set_font(r1, bold=True)
    r2 = para.add_run("、".join(schema.abstractZh.keywords))
    _set_font(r2)


def _build_abstract_en(doc: Document, schema: ThesisSchema) -> None:
    _add_page_break(doc)
    _center(doc, schema.cover.titleEn, size_pt=14, bold=True, italic=True, space_after=4)
    _center(doc, "Abstract", size_pt=14, bold=True, space_after=8)
    _body(doc, schema.abstractEn.content)
    doc.add_paragraph()
    para = doc.add_paragraph()
    _para_fmt(para, first_indent_pt=BODY_PT * 2)
    r1 = para.add_run("Keywords: ")
    _set_font(r1, bold=True)
    r2 = para.add_run(", ".join(schema.abstractEn.keywords))
    _set_font(r2)


def _build_acknowledgments(doc: Document, schema: ThesisSchema) -> None:
    _add_page_break(doc)
    _center(doc, "誌謝", size_pt=16, bold=True, space_after=8)
    for para_text in schema.acknowledgments.split("\n"):
        if para_text.strip():
            _body(doc, para_text)


def _build_toc(doc: Document) -> None:
    _add_page_break(doc)
    _center(doc, "目錄", size_pt=16, bold=True, space_after=8)
    _insert_toc_field(doc, r'\o "1-3" \h \z \u')


def _build_figure_list(doc: Document) -> None:
    _add_page_break(doc)
    _center(doc, "圖目錄", size_pt=16, bold=True, space_after=8)
    _insert_toc_field(doc, r'\h \z \c "圖"')


def _build_table_list(doc: Document) -> None:
    _add_page_break(doc)
    _center(doc, "表目錄", size_pt=16, bold=True, space_after=8)
    _insert_toc_field(doc, r'\h \z \c "表"')


def _build_symbols(doc: Document, symbols: list[SymbolEntry]) -> None:
    _add_page_break(doc)
    _center(doc, "符號說明", size_pt=16, bold=True, space_after=8)
    for s in symbols:
        para = doc.add_paragraph()
        _para_fmt(para)
        r1 = para.add_run(f"{s.symbol}\t")
        _set_font(r1)
        r2 = para.add_run(s.description)
        _set_font(r2)


def _build_section(doc: Document, sec: Section, depth: int) -> None:
    label = f"{sec.id}　{sec.titleZh}"
    if depth == 1:
        _heading1(doc, label)
    elif depth == 2:
        _heading2(doc, label)
    else:
        para = doc.add_paragraph(style="Heading 3")
        _para_fmt(para, align=WD_ALIGN_PARAGRAPH.LEFT,
                  left_indent_pt=BODY_PT * 2, space_before_pt=4)
        run = para.add_run(label)
        _set_font(run, size_pt=BODY_PT, bold=True)

    for para_text in sec.content.split("\n"):
        if para_text.strip():
            _body(doc, para_text)

    if sec.subsections:
        for sub in sec.subsections:
            _build_section(doc, sub, depth + 1)


def _build_chapters(doc: Document, chapters: list[Chapter]) -> None:
    for ch in chapters:
        _add_page_break(doc)
        ch_title = f"第{_to_zh(ch.number)}章　{ch.titleZh}"
        _chapter_heading(doc, ch_title, size_pt=16)
        if ch.titleEn:
            en_title = f"Chapter {_to_roman(ch.number)}: {ch.titleEn}"
            _center(doc, en_title, size_pt=14, bold=True, italic=True, space_after=8)
        for sec in ch.sections:
            _build_section(doc, sec, 1)


def _build_bibliography(doc: Document, bibliography: list[str]) -> None:
    _add_page_break(doc)
    _center(doc, "參考文獻", size_pt=16, bold=True, space_after=8)
    for ref in bibliography:
        if ref.strip():
            para = doc.add_paragraph()
            _para_fmt(para, align=WD_ALIGN_PARAGRAPH.JUSTIFY,
                      hanging_pt=BODY_PT * 2, space_after_pt=4)
            run = para.add_run(ref)
            _set_font(run)


def _build_appendices(doc: Document, appendices: list[Appendix]) -> None:
    for ap in appendices:
        _add_page_break(doc)
        _center(doc, f"附錄{ap.label}　{ap.title}", size_pt=16, bold=True, space_after=8)
        for para_text in ap.content.split("\n"):
            if para_text.strip():
                _body(doc, para_text)


# ─── Main entry ───────────────────────────────────────────────────────────────

def build_thesis_docx(schema: ThesisSchema) -> bytes:
    doc = Document()
    _configure_heading_styles(doc)
    _enable_update_fields_on_open(doc)
    _configure_toc_styles(doc)

    # Remove default empty paragraph
    for p in doc.paragraphs:
        p._element.getparent().remove(p._element)

    # ── Section 1: front matter (roman numerals) ──
    sec1 = doc.sections[0]
    _setup_section(sec1)
    _set_section_page_number(sec1, fmt="lowerRoman", start=1)
    _add_footer_page_number(sec1)

    _build_cover(doc, schema)
    _add_page_break(doc)
    _build_cover(doc, schema)  # duplicate cover
    _build_placeholder(doc, "授權書")
    _build_placeholder(doc, "指導教授推薦書")
    _build_placeholder(doc, "口試委員審定書")
    _build_abstract_zh(doc, schema)
    _build_abstract_en(doc, schema)
    _build_acknowledgments(doc, schema)
    _build_toc(doc)
    _build_figure_list(doc)
    _build_table_list(doc)
    if schema.symbols:
        _build_symbols(doc, schema.symbols)

    # ── Section 2: body (arabic numerals, restart from 1) ──
    sec2 = doc.add_section(WD_SECTION.NEW_PAGE)
    _setup_section(sec2)
    _set_section_page_number(sec2, fmt="decimal", start=1)
    _add_footer_page_number(sec2)

    _build_chapters(doc, schema.chapters)
    _build_bibliography(doc, schema.bibliography)
    if schema.appendices:
        _build_appendices(doc, schema.appendices)

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()
