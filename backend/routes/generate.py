from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from schemas.thesis_schema import ThesisSchema
from services.template_builder import build_thesis_docx

router = APIRouter()

DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


class GenerateRequest(BaseModel):
    thesis: ThesisSchema


@router.post("/generate")
def generate(req: GenerateRequest):
    try:
        docx_bytes = build_thesis_docx(req.thesis)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"產生論文失敗：{e}")

    return Response(
        content=docx_bytes,
        media_type=DOCX_MIME,
        headers={"Content-Disposition": 'attachment; filename="ncu_thesis.docx"'},
    )
