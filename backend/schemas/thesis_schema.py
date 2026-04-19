from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field


class Section(BaseModel):
    id: str
    titleZh: str
    titleEn: Optional[str] = ""
    content: str
    subsections: Optional[list[Section]] = None


class Chapter(BaseModel):
    number: int
    titleZh: str
    titleEn: str
    sections: list[Section]


class FigureEntry(BaseModel):
    number: int
    title: str
    page: Optional[int] = None


class TableEntry(BaseModel):
    number: int
    title: str
    page: Optional[int] = None


class SymbolEntry(BaseModel):
    symbol: str
    description: str


class Appendix(BaseModel):
    label: str
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
    year: str = ""
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
