from fastapi import APIRouter, HTTPException, UploadFile, File

from services.docx_parser import parse_docx_to_text
from services.llm_extractor import extract_schema

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
        text = parse_docx_to_text(file_bytes)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"無法解析 .docx 檔案：{e}")

    if not text.strip():
        raise HTTPException(status_code=422, detail="無法從檔案中提取文字內容")

    try:
        schema = await extract_schema(text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 解析失敗：{e}")

    return {"schema": schema.model_dump()}
