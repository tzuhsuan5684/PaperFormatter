import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SectionEditor } from '../components/SchemaPreview';
import type { Section } from '../types/ThesisSchema';

const baseSection: Section = {
  id: '1.1',
  titleZh: '研究背景',
  titleEn: 'Background',
  content: '本研究探討...',
};

function setup(sec: Section = baseSection) {
  const onChange = vi.fn();
  render(<SectionEditor sec={sec} onChange={onChange} />);
  return { onChange };
}

describe('SectionEditor', () => {
  it('初始值正確顯示在各欄位', () => {
    setup();
    expect(screen.getByDisplayValue('1.1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('研究背景')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Background')).toBeInTheDocument();
    expect(screen.getByDisplayValue('本研究探討...')).toBeInTheDocument();
  });

  it('修改節編號時呼叫 onChange 並帶入新值', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByDisplayValue('1.1'), { target: { value: '1.2' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ id: '1.2' }));
  });

  it('修改中文標題時其他欄位不變', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByDisplayValue('研究背景'), { target: { value: '研究動機' } });
    const result = onChange.mock.calls[0][0] as Section;
    expect(result.titleZh).toBe('研究動機');
    expect(result.id).toBe('1.1');
    expect(result.content).toBe('本研究探討...');
  });

  it('修改英文標題時正確更新', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByDisplayValue('Background'), { target: { value: 'Motivation' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ titleEn: 'Motivation' }));
  });

  it('修改內容時正確更新', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByDisplayValue('本研究探討...'), { target: { value: '新內容' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ content: '新內容' }));
  });

  it('titleEn 為 undefined 時英文標題欄位顯示空字串', () => {
    const sec: Section = { id: '2.1', titleZh: '方法', content: '內容' };
    setup(sec);
    const inputs = screen.getAllByRole('textbox');
    const enInput = inputs.find(el => (el as HTMLInputElement).value === '');
    expect(enInput).toBeInTheDocument();
  });
});
