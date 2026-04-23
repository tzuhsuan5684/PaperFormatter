# PaperFormatter

AI 輔助的國立中央大學論文排版系統。上傳論文草稿（.docx），透過 GPT-4 自動萃取結構、互動式編輯後，產生符合 NCU 格式規範的正式論文。

---

## 系統架構

```
PaperFormatter/
├── frontend/          # React 18 + TypeScript + Vite（port 5173）
│   ├── src/
│   │   ├── App.tsx                    # 主流程：上傳 → 審閱 → 預覽
│   │   ├── api.ts                     # Axios HTTP client
│   │   ├── types/ThesisSchema.ts      # 論文資料結構型別
│   │   └── components/
│   │       ├── UploadZone.tsx         # 拖放上傳 .docx
│   │       ├── SchemaPreview.tsx      # 互動式結構編輯器（分頁）
│   │       ├── DocxPreview.tsx        # Word 文件預覽
│   │       └── DownloadButton.tsx     # 下載按鈕
│   └── vite.config.ts                 # /api/* 代理至 localhost:3001
│
├── backend/           # FastAPI + Python + Uvicorn（port 3001）
│   ├── main.py                        # 應用程式進入點，CORS 設定
│   ├── routes/
│   │   ├── upload.py                  # POST /api/upload
│   │   └── generate.py               # POST /api/generate
│   ├── services/
│   │   ├── docx_parser.py            # mammoth 解析 .docx → 文字 + 圖表
│   │   ├── llm_extractor.py          # GPT-4 萃取論文結構（JSON mode）
│   │   ├── schema_postprocess.py     # 後處理：marker 注入、清理
│   │   ├── template_builder.py       # 整合所有 builder，產生最終 .docx
│   │   ├── front_matter_builder.py   # 封面、摘要、目錄、圖表目錄
│   │   ├── body_builder.py           # 章節內文、參考文獻、附錄
│   │   └── docx_primitives.py        # 底層 DOCX 操作（字型、樣式、頁碼）
│   ├── schemas/
│   │   └── thesis_schema.py          # Pydantic 資料模型
│   ├── logs/                          # 每次上傳的原始 LLM 輸出（gitignored）
│   ├── requirements.txt
│   └── .env                           # OPENAI_API_KEY, PORT=3001
│
├── test_paper.docx    # 測試用論文
└── test_thesis.docx   # 測試用論文
```

### 資料流

```
使用者上傳 .docx
      │
      ▼
POST /api/upload
      │
      ├─ docx_parser    → 提取純文字、圖片（base64）、表格
      ├─ llm_extractor  → GPT-4 萃取 ThesisSchema（JSON）
      └─ schema_postprocess → 合併圖表，回傳 schema
      │
      ▼
前端 SchemaPreview（互動式編輯）
      │
      ▼
POST /api/generate（送出 ThesisSchema）
      │
      ├─ front_matter_builder → 封面 / 摘要 / TOC / 圖表清單
      └─ body_builder         → 章節 / 參考文獻 / 附錄
      │
      ▼
下載 ncu_thesis.docx
```

---

## 快速啟動

### 前置需求

- Python 3.10+
- Node.js 18+
- OpenAI API Key

### 1. 後端

```bash
cd backend

# 建立虛擬環境（第一次）
python -m venv .venv
source .venv/Scripts/activate   # Windows bash
# 或 .venv\Scripts\activate.bat  # Windows cmd

# 安裝套件（第一次）
pip install -r requirements.txt

# 設定環境變數（第一次，編輯 .env）
# OPENAI_API_KEY=sk-...
# PORT=3001

# 啟動
python main.py
# 或
uvicorn main:app --host 0.0.0.0 --port 3001 --reload
```

後端啟動後：http://localhost:3001

### 2. 前端

```bash
cd frontend

# 安裝套件（第一次）
npm install

# 啟動開發伺服器
npm run dev
```

前端啟動後：http://localhost:5173

> 開發模式下，前端的 `/api/*` 請求會自動代理到 `http://localhost:3001`，不需要額外設定 CORS。

### 3. 正常使用流程

1. 打開 http://localhost:5173
2. 拖放 `.docx` 論文草稿至上傳區
3. 等待 GPT-4 萃取結構（需數秒）
4. 在 SchemaPreview 中檢視並編輯各欄位
5. 點擊「產生論文」下載格式化後的 `ncu_thesis.docx`

---

## 技術棧

| 層級 | 技術 |
|------|------|
| 前端框架 | React 18 + TypeScript 5.3 |
| 前端建置 | Vite 5.0 |
| HTTP Client | Axios 1.6 |
| DOCX 預覽 | docx-preview |
| 後端框架 | FastAPI 0.111 + Uvicorn |
| DOCX 解析 | mammoth |
| DOCX 產生 | python-docx |
| AI 萃取 | OpenAI GPT-4（gpt-4.1-nano） |
| 資料驗證 | Pydantic |

---

## API 端點

### `POST /api/upload`
- Content-Type: `multipart/form-data`
- Body: `file` (.docx)
- Response: `{ schema: ThesisSchema }`

### `POST /api/generate`
- Content-Type: `application/json`
- Body: `{ thesis: ThesisSchema }`
- Response: Binary DOCX（`ncu_thesis.docx`）

---

## 環境變數（backend/.env）

```
OPENAI_API_KEY=sk-...
PORT=3001
```
