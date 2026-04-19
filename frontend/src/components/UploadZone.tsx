import React, { useRef, useState } from 'react';

interface Props {
  onUpload: (file: File) => void;
}

export function UploadZone({ onUpload }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  function validate(file: File): boolean {
    if (
      file.type !==
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      setError('請上傳 .docx 格式的 Word 文件');
      return false;
    }
    setError('');
    return true;
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (validate(file)) onUpload(file);
  }

  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8, color: '#1a3a6b' }}>
        NCU 論文格式轉換系統
      </h1>
      <p style={{ color: '#555', marginBottom: 32 }}>
        上傳論文草稿（.docx），AI 自動解析並套用國立中央大學論文格式
      </p>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        style={{
          border: `2px dashed ${dragging ? '#1a3a6b' : '#aaa'}`,
          borderRadius: 12,
          padding: '60px 40px',
          cursor: 'pointer',
          background: dragging ? '#eef2ff' : '#fafafa',
          transition: 'all 0.2s',
          maxWidth: 480,
          margin: '0 auto',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
        <p style={{ fontSize: 16, color: '#333', margin: 0 }}>
          拖曳 .docx 檔案到這裡，或點擊選擇檔案
        </p>
        <p style={{ fontSize: 13, color: '#888', marginTop: 8 }}>
          僅支援 Word (.docx) 格式
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        style={{ display: 'none' }}
        onChange={e => handleFiles(e.target.files)}
      />

      {error && (
        <p style={{ color: '#c0392b', marginTop: 16, fontWeight: 500 }}>{error}</p>
      )}
    </div>
  );
}
