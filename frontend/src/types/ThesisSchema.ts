export interface ThesisSchema {
  cover: {
    titleZh: string;
    titleEn: string;
    department: string;
    degree: '博士' | '碩士';
    studentName: string;
    advisorName: string;
    year: string;
    month: string;
  };

  abstractZh: {
    content: string;
    keywords: string[];
  };

  abstractEn: {
    content: string;
    keywords: string[];
  };

  acknowledgments: string;
  chapters: Chapter[];
  bibliography: string[];
  appendices?: Appendix[];
  figures: FigureEntry[];
  tables: TableEntry[];
  symbols?: SymbolEntry[];
}

export interface Chapter {
  number: number;
  titleZh: string;
  titleEn: string;
  sections: Section[];
}

export interface Section {
  id: string;
  titleZh: string;
  titleEn?: string;
  content: string;
  subsections?: Section[];
}

export interface FigureEntry {
  number: number;
  title: string;
  page?: number;
}

export interface TableEntry {
  number: number;
  title: string;
  page?: number;
}

export interface SymbolEntry {
  symbol: string;
  description: string;
}

export interface Appendix {
  label: string;
  title: string;
  content: string;
}
