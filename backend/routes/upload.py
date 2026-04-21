import json
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File

from services.docx_parser import parse_docx
from services.llm_extractor import extract_schema
from services.schema_postprocess import inject_table_markers

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

    inject_table_markers(schema)

    (run_dir / "output.json").write_text(
        json.dumps(schema.model_dump(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    return {"schema": schema.model_dump()}
