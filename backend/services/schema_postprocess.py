"""Post-processing on the extracted ThesisSchema before it is returned to the client."""
import re

from schemas.thesis_schema import Section, ThesisSchema

_BIBLIOGRAPHY_TITLES = re.compile(
    r'^\s*(參考文獻|references|bibliography)\s*$', re.IGNORECASE
)


def strip_bibliography_chapter(schema: ThesisSchema) -> None:
    """Remove any chapter whose title is a bibliography heading.

    When the uploaded draft contains a dedicated bibliography chapter (e.g.
    "六、 參考文獻"), the LLM includes it in `chapters`. Since
    `build_bibliography` already renders a dedicated bibliography section,
    keeping it in `chapters` would produce a duplicate.
    """
    schema.chapters = [
        ch for ch in schema.chapters
        if not _BIBLIOGRAPHY_TITLES.match(ch.titleZh)
    ]

_TABLE_REF_RE = re.compile(r'表\s*(\d+)')
_FIGURE_REF_RE = re.compile(r'圖\s*(\d+)')


def inject_table_markers(schema: ThesisSchema) -> None:
    """Scan section content for '表N' references and append [TABLE:n] markers.

    Runs after LLM extraction so we don't rely on the model to preserve markers.
    Each table is injected at most once, immediately after the first line that
    references it.
    """
    number_to_idx = {entry.number: i for i, entry in enumerate(schema.tables)}
    injected: set[int] = set()

    def process(sec: Section) -> None:
        lines = sec.content.split("\n")
        new_lines: list[str] = []
        for line in lines:
            new_lines.append(line)
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


def inject_figure_markers(schema: ThesisSchema, parsed_text: str = "") -> None:
    """Place [FIGURE:n] markers in section content.

    Two passes:
    1. Anchor-based: use the line preceding each [FIGURE:n] in parsed_text as an
       anchor; find a section content line that CONTAINS the anchor (substring match)
       and insert the marker after it. LLM-independent.
    2. Reference-based fallback: for any figure still un-injected, scan for '圖N'
       text references and insert the marker after the first match.
    """
    injected: set[int] = set()

    # ── Pass 1: anchor-based from parsed_text ────────────────────────────────
    anchors: dict[int, str] = {}  # {figure_idx: anchor_text}
    if parsed_text:
        pt_lines = parsed_text.split("\n")
        for i, line in enumerate(pt_lines):
            stripped = line.strip()
            if stripped.startswith("[FIGURE:") and stripped.endswith("]"):
                try:
                    fig_idx = int(stripped[8:-1])
                except ValueError:
                    continue
                # Prefer the line before the marker as anchor; fall back to after
                for offset in (-1, 1):
                    j = i + offset
                    if 0 <= j < len(pt_lines):
                        candidate = pt_lines[j].strip()
                        if candidate and not candidate.startswith("["):
                            anchors[fig_idx] = candidate
                            break

    def process_anchor(sec: Section) -> None:
        lines = sec.content.split("\n")
        new_lines: list[str] = []
        for line in lines:
            new_lines.append(line)
            stripped = line.strip()
            if stripped.startswith("[FIGURE:"):
                try:
                    injected.add(int(stripped[8:-1]))
                except ValueError:
                    pass
                continue
            for fig_idx, anchor in anchors.items():
                if fig_idx not in injected and anchor in stripped:
                    new_lines.append(f"[FIGURE:{fig_idx}]")
                    injected.add(fig_idx)
        sec.content = "\n".join(new_lines)
        for sub in sec.subsections or []:
            process_anchor(sub)

    for chapter in schema.chapters:
        for sec in chapter.sections:
            process_anchor(sec)

    # ── Pass 2: reference-based fallback for any still un-injected figures ───
    number_to_idx = {entry.number: i for i, entry in enumerate(schema.figures)}

    def process_ref(sec: Section) -> None:
        lines = sec.content.split("\n")
        new_lines: list[str] = []
        for line in lines:
            new_lines.append(line)
            if line.strip().startswith("[FIGURE:"):
                continue
            for m in _FIGURE_REF_RE.finditer(line):
                fig_num = int(m.group(1))
                idx = number_to_idx.get(fig_num)
                if idx is not None and idx not in injected:
                    new_lines.append(f"[FIGURE:{idx}]")
                    injected.add(idx)
        sec.content = "\n".join(new_lines)
        for sub in sec.subsections or []:
            process_ref(sub)

    for chapter in schema.chapters:
        for sec in chapter.sections:
            process_ref(sec)
