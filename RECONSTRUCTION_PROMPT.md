# PaperFormatter 系統重現 Prompt

將以下內容完整貼給 AI，即可重現整個系統。

---

## Prompt 開始

請幫我建立一個「國立中央大學論文格式轉換系統」，名稱為 **PaperFormatter**。

這是一個全端 Web 應用，使用者上傳論文草稿（.docx），系統用 GPT-4 自動萃取結構，使用者在前端互動式編輯後，產生符合 NCU 格式規範的正式論文 .docx 檔。

---

## 系統架構

```
PaperFormatter/
├── backend/          # FastAPI + Python
│   ├── main.py
│   ├── .env          # OPENAI_API_KEY, PORT=3001
│   ├── requirements.txt
│   ├── routes/
│   │   ├── upload.py
│   │   └── generate.py
│   ├── schemas/
│   │   └── thesis_schema.py
│   └── services/
│       ├── docx_parser.py
│       ├── llm_extractor.py
│       ├── schema_postprocess.py
│       ├── template_builder.py
│       ├── front_matter_builder.py
│       ├── body_builder.py
│       └── docx_primitives.py
└── frontend/         # React 18 + TypeScript + Vite
    ├── index.html
    ├── vite.config.ts
    ├── package.json
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── api.ts
        ├── types/
        │   └── ThesisSchema.ts
        └── components/
            ├── UploadZone.tsx
            ├── SchemaPreview.tsx
            ├── DocxPreview.tsx
            └── DownloadButton.tsx
```

---

## 資料模型（Pydantic + TypeScript 同步）

### backend/schemas/thesis_schema.py

```python
from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field

class Section(BaseModel):
    id: str                          # 格式 "1-1"、"2-3-1"
    titleZh: str
    titleEn: Optional[str] = ""
    content: str                     # 純文字，含 [TABLE:n] / [FIGURE:n] marker
    subsections: Optional[list[Section]] = None

class Chapter(BaseModel):
    number: int
    titleZh: str
    titleEn: str
    sections: list[Section]

class FigureImage(BaseModel):
    imageData: str   # base64-encoded bytes
    imageExt: str    # "png", "jpeg", etc.

class FigureEntry(BaseModel):
    number: int
    title: str
    page: Optional[int] = None
    images: list[FigureImage] = Field(default_factory=list)

class TableEntry(BaseModel):
    number: int
    title: str
    page: Optional[int] = None
    rows: list[list[str]] = Field(default_factory=list)

class SymbolEntry(BaseModel):
    symbol: str
    description: str

class Appendix(BaseModel):
    label: str   # "A", "B", ...
    title: str
    content: str

class AbstractBlock(BaseModel):
    content: str
    keywords: list[str] = Field(default_factory=list)

class Cover(BaseModel):
    titleZh: str = ""
    titleEn: str = ""
    department: str = ""
    degree: Literal["博士", "碩士"] = "碩士"
    studentName: str = ""
    advisorName: str = ""
    year: str = ""    # 民國年
    month: str = ""

class ThesisSchema(BaseModel):
    cover: Cover = Field(default_factory=Cover)
    abstractZh: AbstractBlock = Field(default_factory=AbstractBlock)
    abstractEn: AbstractBlock = Field(default_factory=AbstractBlock)
    acknowledgments: str = ""
    chapters: list[Chapter] = Field(default_factory=list)
    bibliography: list[str] = Field(default_factory=list)
    appendices: Optional[list[Appendix]] = None
    figures: list[FigureEntry] = Field(default_factory=list)
    tables: list[TableEntry] = Field(default_factory=list)
    symbols: Optional[list[SymbolEntry]] = None
```

### frontend/src/types/ThesisSchema.ts

```typescript
export interface ThesisSchema {
  cover: {
    titleZh: string; titleEn: string; department: string;
    degree: '博士' | '碩士'; studentName: string;
    advisorName: string; year: string; month: string;
  };
  abstractZh: { content: string; keywords: string[] };
  abstractEn:  { content: string; keywords: string[] };
  acknowledgments: string;
  chapters: Chapter[];
  bibliography: string[];
  appendices?: Appendix[];
  figures: FigureEntry[];
  tables: TableEntry[];
  symbols?: SymbolEntry[];
}
export interface Chapter  { number: number; titleZh: string; titleEn: string; sections: Section[] }
export interface Section  { id: string; titleZh: string; titleEn?: string; content: string; subsections?: Section[] }
export interface FigureEntry { number: number; title: string; page?: number }
export interface TableEntry  { number: number; title: string; page?: number }
export interface SymbolEntry { symbol: string; description: string }
export interface Appendix    { label: string; title: string; content: string }
```

---

## Backend 詳細實作

### backend/main.py

```python
import os
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(dotenv_path=Path(__file__).parent / ".env", override=True)

from routes.upload import router as upload_router
from routes.generate import router as generate_router

app = FastAPI(title="NCU Thesis Formatter")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(upload_router, prefix="/api")
app.include_router(generate_router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 3001))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
```

### backend/requirements.txt

```
fastapi==0.111.0
uvicorn[standard]
python-multipart
mammoth
python-docx
openai
pydantic
python-dotenv
```

### backend/routes/upload.py

```python
import base64, json, re
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File
from services.docx_parser import parse_docx
from services.llm_extractor import extract_schema
from services.schema_postprocess import inject_figure_markers, inject_table_markers, strip_bibliography_chapter
from schemas.thesis_schema import FigureEntry, FigureImage

_LOG_DIR = Path(__file__).parent.parent / "logs"
router = APIRouter()
DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

@router.post("/upload")
async def upload(file: UploadFile = File(...)):
    if file.content_type != DOCX_MIME and not (file.filename or "").endswith(".docx"):
        raise HTTPException(status_code=400, detail="只接受 .docx 格式的檔案")
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="檔案為空")

    try:
        parsed = parse_docx(file_bytes)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"無法解析 .docx：{e}")

    if not parsed.text.strip():
        raise HTTPException(status_code=422, detail="無法從檔案中提取文字")

    run_dir = _LOG_DIR / datetime.now().strftime("%Y%m%d_%H%M%S")
    try:
        schema = await extract_schema(parsed.text, log_dir=run_dir)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 解析失敗：{e}")

    # Merge table rows by order of appearance
    for i, entry in enumerate(schema.tables):
        if i in parsed.raw_tables:
            entry.rows = parsed.raw_tables[i]

    # Merge images; create placeholder if LLM missed a figure
    _caption_re = re.compile(r'圖\s*(\d+)[、，,\s　]*(.*)')
    pt_lines = parsed.text.split("\n")
    def _caption_from_parsed(fig_idx):
        for i, line in enumerate(pt_lines):
            if line.strip() == f"[FIGURE:{fig_idx}]" and i + 1 < len(pt_lines):
                m = _caption_re.match(pt_lines[i + 1].strip())
                if m:
                    return int(m.group(1)), m.group(2).strip()
        return fig_idx + 1, ""

    for i, entry in enumerate(schema.figures):
        if i in parsed.raw_figure_groups:
            entry.images = [
                FigureImage(imageData=base64.b64encode(b).decode(), imageExt=ext)
                for b, ext in parsed.raw_figure_groups[i]
            ]
    existing_count = len(schema.figures)
    for i in sorted(parsed.raw_figure_groups):
        if i >= existing_count:
            num, title = _caption_from_parsed(i)
            ph = FigureEntry(number=num, title=title)
            ph.images = [
                FigureImage(imageData=base64.b64encode(b).decode(), imageExt=ext)
                for b, ext in parsed.raw_figure_groups[i]
            ]
            schema.figures.append(ph)

    strip_bibliography_chapter(schema)
    inject_table_markers(schema)
    inject_figure_markers(schema, parsed_text=parsed.text)

    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "raw_tables.json").write_text(json.dumps(parsed.raw_tables, ensure_ascii=False, indent=2), encoding="utf-8")
    (run_dir / "output.json").write_text(json.dumps(schema.model_dump(), ensure_ascii=False, indent=2), encoding="utf-8")

    return {"schema": schema.model_dump()}
```

### backend/routes/generate.py

```python
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
```

### backend/services/docx_parser.py

邏輯：走訪 `doc.element.body` 的每個子元素（`w:p` 或 `w:tbl`）：
- `w:p` 含 `w:drawing` → 提取圖片 blob + ext，加入 `pending_images`
- `w:p` 無圖且有文字 → flush 先前積累的圖片群組（寫入 `raw_figure_groups[n]`，插入 `[FIGURE:n]` marker），再記錄文字
- `w:tbl` → flush 圖片，提取表格（處理 vMerge、gridSpan），插入 `[TABLE:n]` marker

```python
import io
from dataclasses import dataclass, field
import mammoth
from docx import Document
from docx.oxml.ns import qn
from docx.table import Table, _Cell
from docx.text.paragraph import Paragraph

_A_BLIP  = "{http://schemas.openxmlformats.org/drawingml/2006/main}blip"
_R_EMBED = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed"
_W_DRAWING = qn("w:drawing")

def _extract_table_rows(tbl: Table) -> list[list[str]]:
    W_TCPR = qn("w:tcPr"); W_VMERGE = qn("w:vMerge")
    W_GRIDSPAN = qn("w:gridSpan"); W_VAL = qn("w:val")
    rows = []
    for tr in tbl._tbl.tr_lst:
        cells = []
        for tc in tr.tc_lst:
            tcPr = tc.find(W_TCPR)
            is_continuation = False
            if tcPr is not None:
                vMerge = tcPr.find(W_VMERGE)
                if vMerge is not None and vMerge.get(W_VAL) != "restart":
                    is_continuation = True
            cell_text = "" if is_continuation else _Cell(tc, tbl).text.strip()
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
    raw_tables: dict = field(default_factory=dict)
    raw_figure_groups: dict = field(default_factory=dict)

def _extract_image(para: Paragraph, doc: Document):
    blip = para._p.find(".//" + _A_BLIP)
    if blip is None: return None
    r_id = blip.get(_R_EMBED)
    if not r_id: return None
    try:
        img_part = doc.part.related_parts[r_id]
        ext = img_part.content_type.split("/")[-1]
        return img_part.blob, ext
    except KeyError:
        return None

def parse_docx(file_bytes: bytes) -> ParsedDoc:
    doc = Document(io.BytesIO(file_bytes))
    raw_tables, raw_figure_groups = {}, {}
    text_parts = []
    table_counter = figure_group_counter = 0
    pending_images = []
    W_P = qn("w:p"); W_TBL = qn("w:tbl")

    def flush_images():
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
                if result: pending_images.append(result)
            else:
                line = para.text.strip()
                if line:
                    flush_images()
                    text_parts.append(line)
        elif tag == W_TBL:
            flush_images()
            tbl = Table(child, doc)
            raw_tables[table_counter] = _extract_table_rows(tbl)
            text_parts.append(f"[TABLE:{table_counter}]")
            table_counter += 1

    flush_images()
    return ParsedDoc(text="\n".join(text_parts), raw_tables=raw_tables, raw_figure_groups=raw_figure_groups)
```

### backend/services/llm_extractor.py

使用 `gpt-4.1-nano`，`temperature=0`，`response_format={"type":"json_object"}`。

System prompt 要求 AI 只回傳合法 JSON，填入以下結構（不得有 markdown 包裝）：
- `cover`：titleZh、titleEn、department、degree（只能 "博士"/"碩士"）、studentName、advisorName、year（民國年）、month
- `abstractZh`/`abstractEn`：content、keywords（陣列）
- `acknowledgments`：字串
- `chapters`：陣列，每項含 number（從 1）、titleZh、titleEn、sections（含 id 格式 "1-1"/"1-1-1"、titleZh、titleEn、content、subsections）
- `bibliography`：每筆一個字串
- `appendices`：label、title、content
- `figures`：number、title、page（null）
- `tables`：number、title、page（null）
- `symbols`：symbol、description

草稿內容超過 60000 字元時截斷並附加截斷提示。每次呼叫在 `logs/<timestamp>/input.txt` 記錄輸入。

```python
import json, os
from pathlib import Path
from openai import AsyncOpenAI
from schemas.thesis_schema import ThesisSchema

SYSTEM_PROMPT = """你是一個學術論文結構分析專家。...(同上述規則)..."""
MAX_CHARS = 60000

async def extract_schema(draft_text: str, log_dir=None) -> ThesisSchema:
    client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    truncated = draft_text[:MAX_CHARS] + "\n...[內容過長，已截斷]" if len(draft_text) > MAX_CHARS else draft_text
    if log_dir:
        log_dir.mkdir(parents=True, exist_ok=True)
        (log_dir / "input.txt").write_text(truncated, encoding="utf-8")
    response = await client.chat.completions.create(
        model="gpt-4.1-nano", temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"以下是論文草稿內容：\n\n{truncated}"},
        ],
    )
    raw = response.choices[0].message.content or "{}"
    return ThesisSchema.model_validate(json.loads(raw))
```

### backend/services/schema_postprocess.py

三個函式：

**`strip_bibliography_chapter(schema)`**：移除 chapters 中 titleZh 符合 `^(參考文獻|references|bibliography)$`（不分大小寫）的章節，避免與 `build_bibliography` 重複。

**`inject_table_markers(schema)`**：掃描所有 section.content，找到「表N」參考（regex `表\s*(\d+)`），在該行後插入 `[TABLE:{idx}]`（依 tables 陣列順序，每個只注入一次）。

**`inject_figure_markers(schema, parsed_text)`**：兩階段：
1. 從 parsed_text 的 `[FIGURE:n]` marker 前後一行取 anchor 文字，在 section content 中找包含 anchor 的行後插入 marker。
2. fallback：對還未注入的圖，掃描「圖N」參考（regex `圖\s*(\d+)`），在第一次出現後插入。

### backend/services/docx_primitives.py

常數：`FONT_ZH = "標楷體"`、`FONT_EN = "Times New Roman"`、`BODY_PT = 12`

函式：
- `_set_font(run, latin, east_asia, size_pt, bold, italic)`：同時設 run.font 和 XML rFonts（w:ascii、w:hAnsi、w:eastAsia）
- `_para_fmt(para, align, first_indent_pt, left_indent_pt, hanging_pt, space_before_pt, space_after_pt)`：行距 1.5 倍（WD_LINE_SPACING.MULTIPLE）
- `_setup_section(section)`：A4（21×29.7cm），四邊 1 inch margin
- `_set_section_page_number(section, fmt, start)`：透過 XML pgNumType 設定頁碼格式（"lowerRoman" / "decimal"）
- `_add_footer_page_number(section)`：置中頁碼，字體 10pt，插入 PAGE 欄位
- `_add_page_break(doc)`：加一個含 WD_BREAK.PAGE 的 run
- `_center(doc, text, size_pt, bold, italic, space_before, space_after, style)`
- `_body(doc, text, indent=True)`：justify 對齊，首行縮排 2em（BODY_PT*2）
- `_heading1(doc, text)`：Heading 1 樣式，左對齊，space_before=8pt
- `_heading2(doc, text)`：Heading 2 樣式，left_indent=BODY_PT，space_before=4pt
- `_chapter_heading(doc, text, size_pt, italic)`：Heading 1 樣式但 space_after=6pt
- `_to_zh(n)`：數字轉中文（0-20 用中文字，其餘直接字串）
- `_to_roman(n)`：數字轉羅馬字母
- `_add_page_number_field(run)`：插入 `{ PAGE }` 欄位 XML

### backend/services/front_matter_builder.py

**`build_cover(doc, schema)`**：
```
（空行×2）
國立中央大學（18pt bold）
{department}（16pt bold）
（空行）
{degree}論文（16pt bold）
{degree_en}（14pt bold）
（空行×2）
{titleZh}（18pt bold）
{titleEn}（14pt bold italic）
（空行×3）
研 究 生：{studentName}（14pt）
指導教授：{advisorName}（14pt）
（空行×3）
中華民國 {year} 年 {month} 月（14pt）
```

**`build_placeholder(doc, title)`**：換頁後置中顯示「【{title}】」和「（請貼附正式文件）」

**`build_abstract_zh(doc, schema)`**：換頁，「摘要」標題（FMTitle style），內文，「關鍵詞：」+ 以「、」分隔的關鍵詞

**`build_abstract_en(doc, schema)`**：換頁，英文標題（italic）、"Abstract"，內文，"Keywords: " + 以 ", " 分隔的關鍵詞

**`build_acknowledgments(doc, schema)`**：換頁，「誌謝」，按 `\n` 分段輸出

**`build_toc(doc)`**：換頁，「目錄」，插入 Word TOC 欄位 `\t "FMTitle,1" \o "1-3" \h \z`

**`build_figure_list(doc)`**：換頁，「圖目錄」，TOC `\t "FigCaption,1" \h \z`

**`build_table_list(doc)`**：換頁，「表目錄」，TOC `\t "TblCaption,1" \h \z`

**`build_symbols(doc, symbols)`**：換頁，「符號說明」，每列 `{symbol}\t{description}`

### backend/services/body_builder.py

**`render_figure(doc, figures, marker_idx)`**：
- 解碼 base64 圖片，每張圖 width=5 inches，置中段落
- 圖說段落：style="FigCaption"，置中，`圖 {number}　{title}`（bold）

**`render_table(doc, tables, marker_idx)`**：
- 先輸出表標題段落（style="TblCaption"，置中，`表 {number}　{title}`）
- 建立 Table Grid 樣式的表格，每格 11pt 置中文字

**`build_section(doc, sec, depth, tables, figures)`**：
- depth=1 → `_heading1`（格式：`{sec.id}　{titleZh}`）
- depth=2 → `_heading2`
- depth=3 → Heading 3，left_indent=BODY_PT*2
- 解析 content 逐行：`[TABLE:n]` → `render_table`，`[FIGURE:n]` → `render_figure`，其餘 → `_body`
- 遞迴處理 subsections（depth+1）

**`build_chapters(doc, chapters, tables, figures)`**：
- 每章換頁
- 章標題：`{_to_zh(number)}、　{titleZh}`（16pt，Heading 1 style）
- 英文標題：`Chapter {_to_roman(number)}: {titleEn}`（14pt bold italic，置中）
- 逐節呼叫 `build_section`

**`build_bibliography(doc, bibliography, chapter_number)`**：
- 換頁，`{_to_zh(chapter_number)}、　參考文獻`（16pt）
- 每筆 hanging indent=BODY_PT*2，justify，space_after=4pt

**`build_appendices(doc, appendices)`**：
- 每個附錄換頁，`附錄{label}　{title}`（16pt bold）
- 內文按 `\n` 分段

### backend/services/template_builder.py

**`build_thesis_docx(schema) -> bytes`**：

```
doc = Document()
設定 heading styles（H1=16pt, H2=13pt, H3=12pt，字體 Times New Roman + 標楷體）
設定 caption styles（FigCaption, TblCaption, FMTitle，12pt bold）
設定 TOC styles（TOC 1/2/3，12pt）
啟用 updateFields（開啟 Word 時自動更新欄位）
清除預設空白段落

Section 1（前文）：lowerRoman 頁碼從 i 開始
  build_cover（×2，NCU 規定）
  _add_page_break
  build_placeholder("授權書")
  build_placeholder("指導教授推薦書")
  build_placeholder("口試委員審定書")
  build_abstract_zh
  build_abstract_en
  build_acknowledgments
  build_toc
  build_figure_list
  build_table_list
  build_symbols（若有）

Section 2（本文）：decimal 頁碼從 1 開始（NEW_PAGE section break）
  build_chapters
  build_bibliography（章號 = len(chapters)+1）
  build_appendices（若有）

return bytes
```

---

## Frontend 詳細實作

### frontend/package.json（關鍵依賴）

```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "docx-preview": "latest",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

### frontend/vite.config.ts

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
```

### frontend/src/api.ts

```typescript
import axios from 'axios';
import { ThesisSchema } from './types/ThesisSchema';

export async function uploadDraft(file: File): Promise<ThesisSchema> {
  const form = new FormData();
  form.append('file', file);
  // 不手動設 Content-Type，讓瀏覽器自動加 multipart boundary
  const res = await axios.post<{ schema: ThesisSchema }>('/api/upload', form);
  return res.data.schema;
}

export async function generateDocx(schema: ThesisSchema): Promise<Blob> {
  const res = await axios.post('/api/generate', { thesis: schema }, { responseType: 'blob' });
  return res.data as Blob;
}
```

### frontend/src/App.tsx

三個 stage：`idle` → `uploading` → `reviewing`

UI 佈局：
- `idle`：置中顯示 `UploadZone`
- `uploading`：全頁 Spinner + 提示文字（"AI 正在解析論文草稿..."）
- `reviewing`：左右兩欄 grid（各 50%），左邊 `SchemaPreview`，右邊 `DocxPreview` + 「產生預覽」按鈕 + 「⬇ 下載 .docx」按鈕

Header：深藍色（#1a3a6b），右側有「重新上傳」按鈕（非 idle 時顯示）

**handleUpload**：call uploadDraft → setSchema → stage='reviewing'
**handlePreview**：call generateDocx(schema) → setPreviewBlob
**handleDownload**：createObjectURL → 觸發 `<a>` 下載 → revokeObjectURL

錯誤顯示：紅底提示框

**Spinner 元件**：純 CSS 旋轉動畫（border-top: 1a3a6b）

### frontend/src/components/UploadZone.tsx

拖放 + 點擊上傳區塊：
- 接受 `.docx` 檔案
- 拖曳 over 時邊框變藍色
- 點擊觸發隱藏的 `<input type="file" accept=".docx">`
- 選擇/拖放後呼叫 `onUpload(file)`

### frontend/src/components/SchemaPreview.tsx

分頁標籤式表單編輯器，Tab 型別：`'cover' | 'abstract' | 'acknowledgments' | 'chapters' | 'bibliography' | 'figures' | 'appendices'`

標籤列：`['cover','封面'] ['abstract','摘要'] ['acknowledgments','誌謝'] ['chapters','章節'] ['bibliography','參考文獻'] ['figures','圖表清單'] ['appendices','附錄']`

各分頁 UI：
- **cover**：8 個 input 欄位（titleZh、titleEn、department、degree select、studentName、advisorName、year、month）
- **abstract**：中文 textarea + 關鍵詞 TagInput；英文 textarea + 關鍵詞 TagInput
- **acknowledgments**：單一 textarea
- **chapters**：列出每個章節的標題，展開後可編輯 sections 的 titleZh 和 content textarea；支援增刪章節和 section
- **bibliography**：每筆一行 textarea，加入/刪除按鈕
- **figures**：列出圖號和標題的可編輯清單
- **appendices**：列出附錄 label、title、content textarea

`TagInput` 元件：已輸入的關鍵詞顯示為藍底標籤 + ✕，輸入框按 Enter 或逗號新增

### frontend/src/components/DocxPreview.tsx

```typescript
// 使用 docx-preview 函式庫 renderAsync
import { renderAsync } from 'docx-preview';

// 當 blob 變更時呼叫 renderAsync(blob, containerRef.current, null, options)
// options: { className: 'docx-wrapper', ignoreWidth: false, ignoreHeight: false }
// loading 時顯示「產生中...」
// blob 為 null 時顯示佔位提示文字
```

---

## 啟動方式

### 後端

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate   # Windows bash
pip install -r requirements.txt
# 編輯 .env：填入 OPENAI_API_KEY
python main.py
```

後端運行於 http://localhost:3001

### 前端

```bash
cd frontend
npm install
npm run dev
```

前端運行於 http://localhost:5173

---

## 關鍵設計決策

1. **marker 機制**：parser 在文字流中插入 `[TABLE:n]` / `[FIGURE:n]`，讓 LLM 在 content 欄位中保留這些 marker，builder 讀取時在原位插入實際圖表，確保圖表位置正確。

2. **LLM 不處理圖片**：圖片由 parser 直接從 .docx XML 提取（base64），以索引順序合併進 schema.figures，不經過 GPT。

3. **兩段頁碼**：前文（封面到符號說明）用羅馬小寫，正文重新從 1 計（透過 Word XML sectPr/pgNumType 實作）。

4. **樣式名稱綁定 TOC**：`FMTitle`/`FigCaption`/`TblCaption` 是自訂段落樣式，TOC 欄位用 `\t "StyleName,1"` 語法抓取這些標題，讓目錄/圖目錄/表目錄能自動更新（F9）。

5. **封面重複**：NCU 規定封面輸出兩次（`build_cover` 呼叫兩次）。

6. **參考文獻去重**：若 LLM 將「參考文獻」列為章節，`strip_bibliography_chapter` 會移除，避免 `build_bibliography` 重複產生。

## Prompt 結束

---

*此檔由 Claude Code 自動生成，用於系統重現。*
