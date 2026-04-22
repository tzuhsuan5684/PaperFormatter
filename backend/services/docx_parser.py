import io
from dataclasses import dataclass, field

import mammoth
from docx import Document
from docx.oxml.ns import qn
from docx.table import Table, _Cell
from docx.text.paragraph import Paragraph

_A_BLIP = "{http://schemas.openxmlformats.org/drawingml/2006/main}blip"
_R_EMBED = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed"
_W_DRAWING = qn("w:drawing")


def _extract_table_rows(tbl: Table) -> list[list[str]]:
    """Extract cell text by walking raw XML, handling vMerge and gridSpan correctly."""
    W_TCPR = qn("w:tcPr")
    W_VMERGE = qn("w:vMerge")
    W_GRIDSPAN = qn("w:gridSpan")
    W_VAL = qn("w:val")

    rows: list[list[str]] = []
    for tr in tbl._tbl.tr_lst:
        cells: list[str] = []
        for tc in tr.tc_lst:
            tcPr = tc.find(W_TCPR)

            # vMerge with no val (or val != "restart") = continuation row of a vertical span
            is_continuation = False
            if tcPr is not None:
                vMerge = tcPr.find(W_VMERGE)
                if vMerge is not None and vMerge.get(W_VAL) != "restart":
                    is_continuation = True

            cell_text = "" if is_continuation else _Cell(tc, tbl).text.strip()

            # gridSpan > 1 means this cell spans multiple columns; pad with empty strings
            grid_span = 1
            if tcPr is not None:
                gs = tcPr.find(W_GRIDSPAN)
                if gs is not None:
                    grid_span = int(gs.get(W_VAL, "1"))

            cells.append(cell_text)
            cells.extend([""] * (grid_span - 1))

        rows.append(cells)
    return rows


@dataclass
class ParsedDoc:
    text: str
    raw_tables: dict = field(default_factory=dict)         # {index: [[cell, ...]]}
    raw_figure_groups: dict = field(default_factory=dict)  # {index: [(bytes, ext), ...]}


def _extract_image(para: Paragraph, doc: Document) -> tuple[bytes, str] | None:
    blip = para._p.find(".//" + _A_BLIP)
    if blip is None:
        return None
    r_id = blip.get(_R_EMBED)
    if not r_id:
        return None
    try:
        img_part = doc.part.related_parts[r_id]
        ext = img_part.content_type.split("/")[-1]
        return img_part.blob, ext
    except KeyError:
        return None


def parse_docx(file_bytes: bytes) -> ParsedDoc:
    """Extract ordered text + table/figure data from docx, inserting markers."""
    doc = Document(io.BytesIO(file_bytes))
    raw_tables: dict[int, list[list[str]]] = {}
    raw_figure_groups: dict[int, list[tuple[bytes, str]]] = {}
    text_parts: list[str] = []
    table_counter = 0
    figure_group_counter = 0
    pending_images: list[tuple[bytes, str]] = []

    W_P = qn("w:p")
    W_TBL = qn("w:tbl")

    def flush_images() -> None:
        nonlocal figure_group_counter
        if pending_images:
            raw_figure_groups[figure_group_counter] = pending_images.copy()
            text_parts.append(f"[FIGURE:{figure_group_counter}]")
            figure_group_counter += 1
            pending_images.clear()

    for child in doc.element.body:
        tag = child.tag

        if tag == W_P:
            para = Paragraph(child, doc)
            if para._p.find(".//" + _W_DRAWING) is not None:
                result = _extract_image(para, doc)
                if result is not None:
                    pending_images.append(result)
            else:
                line = para.text.strip()
                if line:
                    flush_images()
                    text_parts.append(line)
                # Empty paragraphs don't break image groups

        elif tag == W_TBL:
            flush_images()
            tbl = Table(child, doc)
            raw_tables[table_counter] = _extract_table_rows(tbl)
            text_parts.append(f"[TABLE:{table_counter}]")
            table_counter += 1

    flush_images()  # 處理文件末尾的圖片

    return ParsedDoc(
        text="\n".join(text_parts),
        raw_tables=raw_tables,
        raw_figure_groups=raw_figure_groups,
    )


def parse_docx_to_text(file_bytes: bytes) -> str:
    with io.BytesIO(file_bytes) as f:
        result = mammoth.extract_raw_text(f)
    return result.value
