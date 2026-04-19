import os
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Use absolute path so .env is found regardless of working directory,
# and override=True ensures .env values win over any system env vars.
load_dotenv(dotenv_path=Path(__file__).parent / ".env", override=True)

_key = os.environ.get("OPENAI_API_KEY", "")
print(f"[startup] OPENAI_API_KEY loaded: {_key[:8]}...{_key[-4:] if len(_key) > 12 else '(too short)'}")

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
