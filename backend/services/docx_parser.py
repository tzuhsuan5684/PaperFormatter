import io
from dataclasses import dataclass, field

import mammoth
from docx import Document
from docx.oxml.ns import qn
from docx.table import Table
from docx.text.paragraph import Paragraph


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
            rows: list[list[str]] = []
            seen: set[int] = set()
            for row in tbl.rows:
                cells: list[str] = []
                for cell in row.cells:
                    cid = id(cell._tc)
                    cells.append(cell.text.strip() if cid not in seen else "")
                    seen.add(cid)
                rows.append(cells)
            raw_tables[table_counter] = rows
            text_parts.append(f"[TABLE:{table_counter}]")
            table_counter += 1

    return ParsedDoc(text="\n".join(text_parts), raw_tables=raw_tables)


def parse_docx_to_text(file_bytes: bytes) -> str:
    with io.BytesIO(file_bytes) as f:
        result = mammoth.extract_raw_text(f)
    return result.value
