import json
import os
from pathlib import Path

from openai import AsyncOpenAI
from schemas.thesis_schema import ThesisSchema

_LOG_DIR = Path(__file__).parent.parent / "logs"

SYSTEM_PROMPT = """你是一個學術論文結構分析專家。使用者會提供一篇論文草稿的文字內容，請你分析並提取所有資訊，填入以下 JSON Schema。

規則：
1. 只回傳合法的 JSON，不得有任何說明文字、前言、或 Markdown 符號（如 ```json）
2. 若草稿中找不到某欄位的資訊，使用空字串 "" 或空陣列 []
3. 章節編號 (Chapter.number) 從 1 開始
4. Section.id 格式為 "章-節"，例如 "1-1"、"2-3-1"
5. keywords 為陣列，每個關鍵詞為獨立字串
6. bibliography 每筆為一個字串元素
7. degree 只能是 "博士" 或 "碩士"

回傳的 JSON 結構必須完全符合以下定義：
{
  "cover": {
    "titleZh": "string",
    "titleEn": "string",
    "department": "string",
    "degree": "碩士 或 博士",
    "studentName": "string",
    "advisorName": "string",
    "year": "string（民國年）",
    "month": "string"
  },
  "abstractZh": { "content": "string", "keywords": ["string"] },
  "abstractEn": { "content": "string", "keywords": ["string"] },
  "acknowledgments": "string",
  "chapters": [
    {
      "number": 1,
      "titleZh": "string",
      "titleEn": "string",
      "sections": [
        {
          "id": "1-1",
          "titleZh": "string",
          "titleEn": "string",
          "content": "string",
          "subsections": [
            { "id": "1-1-1", "titleZh": "string", "titleEn": "string", "content": "string" }
          ]
        }
      ]
    }
  ],
  "bibliography": ["string"],
  "appendices": [{ "label": "string", "title": "string", "content": "string" }],
  "figures": [{ "number": 1, "title": "string", "page": null }],
  "tables": [{ "number": 1, "title": "string", "page": null }],
  "symbols": [{ "symbol": "string", "description": "string" }]
}"""

MAX_CHARS = 60000


async def extract_schema(draft_text: str, log_dir: Path | None = None) -> ThesisSchema:
    client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

    truncated = (
        draft_text[:MAX_CHARS] + "\n...[內容過長，已截斷]"
        if len(draft_text) > MAX_CHARS
        else draft_text
    )

    if log_dir:
        log_dir.mkdir(parents=True, exist_ok=True)
        (log_dir / "input.txt").write_text(truncated, encoding="utf-8")

    response = await client.chat.completions.create(
        model="gpt-4.1-nano",
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"以下是論文草稿內容：\n\n{truncated}"},
        ],
    )

    raw = response.choices[0].message.content or "{}"
    data = json.loads(raw)
    return ThesisSchema.model_validate(data)
