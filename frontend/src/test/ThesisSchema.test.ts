import { describe, expect, it } from 'vitest';
import type { Appendix, Chapter, FigureEntry, Section, SymbolEntry, TableEntry, ThesisSchema } from '../types/ThesisSchema';

const validSection: Section = {
  id: '1.1',
  titleZh: '研究背景',
  titleEn: 'Background',
  content: '本研究探討...',
};

const validChapter: Chapter = {
  number: 1,
  titleZh: '緒論',
  titleEn: 'Introduction',
  sections: [validSection],
};

const validSchema: ThesisSchema = {
  cover: {
    titleZh: '論文中文題目',
    titleEn: 'Thesis Title in English',
    department: '資訊工程學系',
    degree: '碩士',
    studentName: '王小明',
    advisorName: '李教授',
    year: '113',
    month: '6',
  },
  abstractZh: { content: '本論文研究...', keywords: ['機器學習', '自然語言處理'] },
  abstractEn: { content: 'This thesis investigates...', keywords: ['machine learning', 'NLP'] },
  acknowledgments: '感謝指導教授...',
  chapters: [validChapter],
  bibliography: ['Author, A. (2023). Title. Journal.'],
  figures: [{ number: 1, title: '系統架構圖', page: 10 }],
  tables: [{ number: 1, title: '實驗結果', page: 20 }],
};

describe('ThesisSchema', () => {
  describe('cover', () => {
    it('degree 只允許碩士或博士', () => {
      const degrees: Array<'碩士' | '博士'> = ['碩士', '博士'];
      degrees.forEach(degree => {
        const schema: ThesisSchema = { ...validSchema, cover: { ...validSchema.cover, degree } };
        expect(schema.cover.degree).toBe(degree);
      });
    });

    it('包含所有必填封面欄位', () => {
      const { cover } = validSchema;
      expect(cover.titleZh).toBeTruthy();
      expect(cover.titleEn).toBeTruthy();
      expect(cover.department).toBeTruthy();
      expect(cover.studentName).toBeTruthy();
      expect(cover.advisorName).toBeTruthy();
      expect(cover.year).toBeTruthy();
      expect(cover.month).toBeTruthy();
    });
  });

  describe('abstract', () => {
    it('關鍵詞為字串陣列', () => {
      expect(Array.isArray(validSchema.abstractZh.keywords)).toBe(true);
      expect(Array.isArray(validSchema.abstractEn.keywords)).toBe(true);
      validSchema.abstractZh.keywords.forEach(kw => expect(typeof kw).toBe('string'));
    });

    it('可以有空關鍵詞陣列', () => {
      const schema: ThesisSchema = {
        ...validSchema,
        abstractZh: { content: '摘要', keywords: [] },
      };
      expect(schema.abstractZh.keywords).toHaveLength(0);
    });
  });

  describe('chapters', () => {
    it('章節包含 sections 陣列', () => {
      expect(Array.isArray(validSchema.chapters[0].sections)).toBe(true);
    });

    it('section 的 titleEn 為選填', () => {
      const sectionWithoutEn: Section = {
        id: '1.2',
        titleZh: '研究動機',
        content: '內容...',
      };
      expect(sectionWithoutEn.titleEn).toBeUndefined();
    });

    it('section 支援巢狀 subsections', () => {
      const parent: Section = {
        id: '1.1',
        titleZh: '父節',
        content: '',
        subsections: [{ id: '1.1.1', titleZh: '子節', content: '內容' }],
      };
      expect(parent.subsections).toHaveLength(1);
      expect(parent.subsections![0].id).toBe('1.1.1');
    });
  });

  describe('figures & tables', () => {
    it('page 為選填欄位', () => {
      const fig: FigureEntry = { number: 1, title: '圖一' };
      expect(fig.page).toBeUndefined();
    });

    it('page 有值時為數字', () => {
      const tbl: TableEntry = { number: 1, title: '表一', page: 5 };
      expect(typeof tbl.page).toBe('number');
    });
  });

  describe('appendices & symbols（選填）', () => {
    it('appendices 未提供時為 undefined', () => {
      const schema: ThesisSchema = { ...validSchema, appendices: undefined };
      expect(schema.appendices).toBeUndefined();
    });

    it('appendices 有值時包含正確欄位', () => {
      const ap: Appendix = { label: 'A', title: '附錄A', content: '內容' };
      const schema: ThesisSchema = { ...validSchema, appendices: [ap] };
      expect(schema.appendices![0].label).toBe('A');
    });

    it('symbols 未提供時為 undefined', () => {
      expect(validSchema.symbols).toBeUndefined();
    });

    it('symbols 有值時包含 symbol 與 description', () => {
      const sym: SymbolEntry = { symbol: 'α', description: '學習率' };
      const schema: ThesisSchema = { ...validSchema, symbols: [sym] };
      expect(schema.symbols![0].symbol).toBe('α');
      expect(schema.symbols![0].description).toBe('學習率');
    });
  });
});
