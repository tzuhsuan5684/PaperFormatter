import base64
import json
import re
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File

from services.docx_parser import parse_docx
from services.llm_extractor import extract_schema
from services.schema_postprocess import inject_figure_markers, inject_table_markers

_LOG_DIR = Path(__file__).parent.parent / "logs"

router = APIRouter()

DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


@router.post("/upload")
async def upload(file: UploadFile = File(...)):
    if file.content_type != DOCX_MIME and not (file.filename or "").endswith(".docx"):
        raise HTTPException(status_code=400, detail="只接受 .docx 格式的檔案")

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="檔案為空")

    try:
        parsed = parse_docx(file_bytes)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"無法解析 .docx 檔案：{e}")

    if not parsed.text.strip():
        raise HTTPException(status_code=422, detail="無法從檔案中提取文字內容")

    run_dir = _LOG_DIR / datetime.now().strftime("%Y%m%d_%H%M%S")

    try:
        schema = await extract_schema(parsed.text, log_dir=run_dir)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 解析失敗：{e}")

    # Merge raw table rows into schema by order of appearance
    for i, entry in enumerate(schema.tables):
        if i in parsed.raw_tables:
            entry.rows = parsed.raw_tables[i]

    # Merge extracted image groups into schema by order of appearance.
    # If LLM missed a figure entry, create a placeholder so the images still render.
    from schemas.thesis_schema import FigureEntry, FigureImage

    _caption_re = re.compile(r'圖\s*(\d+)[、，,\s　]*(.*)')
    pt_lines = parsed.text.split("\n")

    def _caption_from_parsed(fig_idx: int) -> tuple[int, str]:
        """Extract figure number and title from the caption line after [FIGURE:n]."""
        for i, line in enumerate(pt_lines):
            if line.strip() == f"[FIGURE:{fig_idx}]" and i + 1 < len(pt_lines):
                m = _caption_re.match(pt_lines[i + 1].strip())
                if m:
                    return int(m.group(1)), m.group(2).strip()
        return fig_idx + 1, ""

    for i, entry in enumerate(schema.figures):
        if i in parsed.raw_figure_groups:
            entry.images = [
                FigureImage(
                    imageData=base64.b64encode(img_bytes).decode(),
                    imageExt=ext,
                )
                for img_bytes, ext in parsed.raw_figure_groups[i]
            ]

    # Add placeholder entries for any figure groups LLM missed
    existing_count = len(schema.figures)
    for i in sorted(parsed.raw_figure_groups):
        if i >= existing_count:
            num, title = _caption_from_parsed(i)
            placeholder = FigureEntry(number=num, title=title)
            placeholder.images = [
                FigureImage(
                    imageData=base64.b64encode(img_bytes).decode(),
                    imageExt=ext,
                )
                for img_bytes, ext in parsed.raw_figure_groups[i]
            ]
            schema.figures.append(placeholder)

    inject_table_markers(schema)
    inject_figure_markers(schema, parsed_text=parsed.text)

    (run_dir / "raw_tables.json").write_text(
        json.dumps(parsed.raw_tables, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (run_dir / "output.json").write_text(
        json.dumps(schema.model_dump(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    return {"schema": schema.model_dump()}
