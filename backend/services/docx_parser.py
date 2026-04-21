import io
from dataclasses import dataclass, field

import mammoth
from docx import Document
from docx.oxml.ns import qn
from docx.table import Table, _Cell
from docx.text.paragraph import Paragraph


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
    raw_tables: dict = field(default_factory=dict)  # {marker_index: [[cell, ...]]}


def parse_docx(file_bytes: bytes) -> ParsedDoc:
    """Extract ordered text + table data from docx, inserting [TABLE:n] markers."""
    doc = Document(io.BytesIO(file_bytes))
    raw_tables: dict[int, list[list[str]]] = {}
    text_parts: list[str] = []
    table_counter = 0

    W_P = qn("w:p")
    W_TBL = qn("w:tbl")

    for child in doc.element.body:
        tag = child.tag

        if tag == W_P:
            para = Paragraph(child, doc)
            line = para.text.strip()
            if line:
                text_parts.append(line)

        elif tag == W_TBL:
            tbl = Table(child, doc)
            raw_tables[table_counter] = _extract_table_rows(tbl)
            text_parts.append(f"[TABLE:{table_counter}]")
            table_counter += 1

    return ParsedDoc(text="\n".join(text_parts), raw_tables=raw_tables)


def parse_docx_to_text(file_bytes: bytes) -> str:
    with io.BytesIO(file_bytes) as f:
        result = mammoth.extract_raw_text(f)
    return result.value
