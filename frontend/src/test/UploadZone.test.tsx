import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UploadZone } from '../components/UploadZone';

const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function makeFile(name: string, type: string) {
  return new File(['content'], name, { type });
}

function setup() {
  const onUpload = vi.fn();
  render(<UploadZone onUpload={onUpload} />);
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  return { onUpload, input };
}

function uploadFile(input: HTMLInputElement, file: File) {
  fireEvent.change(input, { target: { files: [file] } });
}

describe('UploadZone', () => {
  it('渲染標題與說明文字', () => {
    setup();
    expect(screen.getByText('NCU 論文格式轉換系統')).toBeInTheDocument();
    expect(screen.getByText(/拖曳 .docx 檔案/)).toBeInTheDocument();
  });

  it('選擇合法 .docx 檔案後呼叫 onUpload', () => {
    const { onUpload, input } = setup();
    const file = makeFile('thesis.docx', DOCX_TYPE);
    uploadFile(input, file);
    expect(onUpload).toHaveBeenCalledOnce();
    expect(onUpload).toHaveBeenCalledWith(file);
  });

  it('選擇非 .docx 檔案時不呼叫 onUpload 並顯示錯誤', () => {
    const { onUpload, input } = setup();
    uploadFile(input, makeFile('report.pdf', 'application/pdf'));
    expect(onUpload).not.toHaveBeenCalled();
    expect(screen.getByText('請上傳 .docx 格式的 Word 文件')).toBeInTheDocument();
  });

  it('上傳合法檔案後清除先前的錯誤訊息', () => {
    const { onUpload, input } = setup();
    uploadFile(input, makeFile('bad.pdf', 'application/pdf'));
    expect(screen.getByText('請上傳 .docx 格式的 Word 文件')).toBeInTheDocument();

    uploadFile(input, makeFile('good.docx', DOCX_TYPE));
    expect(screen.queryByText('請上傳 .docx 格式的 Word 文件')).not.toBeInTheDocument();
    expect(onUpload).toHaveBeenCalledOnce();
  });

  // jsdom 未實作 DataTransfer API，拖曳測試需在真實瀏覽器環境（e.g. Playwright）執行
  it.skip('拖曳合法 .docx 檔案後呼叫 onUpload', () => {});

  // jsdom 的 DataTransfer.files getter 對無效 MIME 類型行為不穩定，
  // 無效類型的驗證已由 file input 的測試案例覆蓋
  it.skip('拖曳非 .docx 檔案後顯示錯誤', () => {});

  it('初始狀態不顯示錯誤訊息', () => {
    setup();
    expect(screen.queryByText('請上傳 .docx 格式的 Word 文件')).not.toBeInTheDocument();
  });
});
