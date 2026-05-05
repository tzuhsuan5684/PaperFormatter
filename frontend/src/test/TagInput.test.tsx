import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TagInput } from '../components/SchemaPreview';

function setup(tags: string[] = []) {
  const onChange = vi.fn();
  render(<TagInput tags={tags} onChange={onChange} />);
  const input = screen.getByPlaceholderText('輸入後按 Enter 新增');
  return { input, onChange };
}

describe('TagInput', () => {
  it('渲染已有的 tags', () => {
    render(<TagInput tags={['機器學習', 'NLP']} onChange={vi.fn()} />);
    expect(screen.getByText('機器學習')).toBeInTheDocument();
    expect(screen.getByText('NLP')).toBeInTheDocument();
  });

  it('按 Enter 新增 tag', async () => {
    const { input, onChange } = setup(['既有tag']);
    await userEvent.type(input, '新關鍵詞{Enter}');
    expect(onChange).toHaveBeenCalledWith(['既有tag', '新關鍵詞']);
  });

  it('按逗號新增 tag', async () => {
    const { input, onChange } = setup([]);
    await userEvent.type(input, '關鍵詞,');
    expect(onChange).toHaveBeenCalledWith(['關鍵詞']);
  });

  it('空白字串不新增 tag', async () => {
    const { input, onChange } = setup([]);
    await userEvent.type(input, '   {Enter}');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('輸入值前後有空白會被 trim', async () => {
    const { input, onChange } = setup([]);
    await userEvent.type(input, '  深度學習  {Enter}');
    expect(onChange).toHaveBeenCalledWith(['深度學習']);
  });

  it('按 ✕ 刪除對應 tag', async () => {
    const onChange = vi.fn();
    render(<TagInput tags={['A', 'B', 'C']} onChange={onChange} />);
    const deleteButtons = screen.getAllByRole('button');
    await userEvent.click(deleteButtons[1]); // 刪除 'B'
    expect(onChange).toHaveBeenCalledWith(['A', 'C']);
  });

  it('刪除第一個 tag', async () => {
    const onChange = vi.fn();
    render(<TagInput tags={['X', 'Y']} onChange={onChange} />);
    const deleteButtons = screen.getAllByRole('button');
    await userEvent.click(deleteButtons[0]);
    expect(onChange).toHaveBeenCalledWith(['Y']);
  });

  it('無 tags 時不顯示刪除按鈕', () => {
    render(<TagInput tags={[]} onChange={vi.fn()} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});
