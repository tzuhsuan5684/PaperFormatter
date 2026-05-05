import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateDocx, uploadDraft } from '../api';
import type { ThesisSchema } from '../types/ThesisSchema';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const minimalSchema: ThesisSchema = {
  cover: {
    titleZh: '測試論文',
    titleEn: 'Test Thesis',
    department: '資工系',
    degree: '碩士',
    studentName: '測試生',
    advisorName: '測試授',
    year: '113',
    month: '6',
  },
  abstractZh: { content: '摘要', keywords: [] },
  abstractEn: { content: 'Abstract', keywords: [] },
  acknowledgments: '',
  chapters: [],
  bibliography: [],
  figures: [],
  tables: [],
};

describe('uploadDraft', () => {
  beforeEach(() => vi.clearAllMocks());

  it('POST 到 /api/upload 並回傳 schema', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { schema: minimalSchema } });
    const file = new File(['content'], 'thesis.docx');
    const result = await uploadDraft(file);
    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const [url, body] = mockedAxios.post.mock.calls[0];
    expect(url).toBe('/api/upload');
    expect(body).toBeInstanceOf(FormData);
    expect(result).toEqual(minimalSchema);
  });

  it('FormData 包含 file 欄位', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { schema: minimalSchema } });
    const file = new File(['content'], 'thesis.docx');
    await uploadDraft(file);
    const formData = mockedAxios.post.mock.calls[0][1] as FormData;
    expect(formData.get('file')).toBe(file);
  });

  it('axios 拋出錯誤時向上傳遞', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Network Error'));
    const file = new File(['content'], 'thesis.docx');
    await expect(uploadDraft(file)).rejects.toThrow('Network Error');
  });
});

describe('generateDocx', () => {
  beforeEach(() => vi.clearAllMocks());

  it('POST 到 /api/generate 並回傳 Blob', async () => {
    const blob = new Blob(['docx content'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    mockedAxios.post.mockResolvedValueOnce({ data: blob });
    const result = await generateDocx(minimalSchema);
    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const [url, body, config] = mockedAxios.post.mock.calls[0];
    expect(url).toBe('/api/generate');
    expect(body).toEqual({ thesis: minimalSchema });
    expect(config).toMatchObject({ responseType: 'blob' });
    expect(result).toBe(blob);
  });

  it('schema 以 { thesis } 包裝傳送', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: new Blob() });
    await generateDocx(minimalSchema);
    const body = mockedAxios.post.mock.calls[0][1];
    expect(body).toHaveProperty('thesis');
    expect((body as { thesis: ThesisSchema }).thesis).toEqual(minimalSchema);
  });

  it('axios 拋出錯誤時向上傳遞', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('500 Internal Server Error'));
    await expect(generateDocx(minimalSchema)).rejects.toThrow('500 Internal Server Error');
  });
});
