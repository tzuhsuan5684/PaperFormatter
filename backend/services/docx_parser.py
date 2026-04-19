import io
import mammoth


def parse_docx_to_text(file_bytes: bytes) -> str:
    with io.BytesIO(file_bytes) as f:
        result = mammoth.extract_raw_text(f)
    return result.value
