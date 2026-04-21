"""Post-processing on the extracted ThesisSchema before it is returned to the client."""
import re

from schemas.thesis_schema import Section, ThesisSchema

_TABLE_REF_RE = re.compile(r'表\s*(\d+)')


def inject_table_markers(schema: ThesisSchema) -> None:
    """Scan section content for '表N' references and append [TABLE:n] markers.

    Runs after LLM extraction so we don't rely on the model to preserve markers.
    Each table is injected at most once, immediately after the first line that
    references it.
    """
    # Map table.number (1-based, from LLM) → 0-based index in schema.tables
    number_to_idx = {entry.number: i for i, entry in enumerate(schema.tables)}
    injected: set[int] = set()

    def process(sec: Section) -> None:
        lines = sec.content.split("\n")
        new_lines: list[str] = []
        for line in lines:
            new_lines.append(line)
            # Skip lines that are already a marker
            if line.strip().startswith("[TABLE:"):
                continue
            for m in _TABLE_REF_RE.finditer(line):
                tbl_num = int(m.group(1))
                idx = number_to_idx.get(tbl_num)
                if idx is not None and idx not in injected:
                    new_lines.append(f"[TABLE:{idx}]")
                    injected.add(idx)
        sec.content = "\n".join(new_lines)

        for sub in sec.subsections or []:
            process(sub)

    for chapter in schema.chapters:
        for sec in chapter.sections:
            process(sec)
