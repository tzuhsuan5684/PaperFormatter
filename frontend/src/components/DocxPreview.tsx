import { renderAsync } from 'docx-preview';
import React, { useEffect, useRef, useState } from 'react';

interface Props {
  blob: Blob | null;
  loading: boolean;
}

export function DocxPreview({ blob, loading }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState('');

  useEffect(() => {
    if (!blob || !containerRef.current) return;
    setRenderError('');
    renderAsync(blob, containerRef.current, undefined, {
      className: 'docx-preview',
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      ignoreFonts: false,
      breakPages: true,
      useBase64URL: true,
    }).catch((e) => setRenderError(String(e)));
  }, [blob]);

  if (loading) {
    return (
      <div style={centerStyle}>
        <Spinner />
        <p style={{ marginTop: 16, color: '#555', fontSize: 14 }}>正在產生預覽...</p>
      </div>
    );
  }

  if (!blob) {
    return (
      <div style={centerStyle}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
        <p style={{ color: '#888', fontSize: 14 }}>點擊「產生預覽」查看真實 Word 輸出</p>
      </div>
    );
  }

  if (renderError) {
    return (
      <div style={centerStyle}>
        <p style={{ color: '#c00', fontSize: 14 }}>預覽失敗：{renderError}</p>
      </div>
    );
  }

  return <div ref={containerRef} style={{ width: '100%' }} />;
}

const centerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: 400,
  color: '#555',
};

function Spinner() {
  return (
    <div style={{
      width: 36, height: 36,
      border: '4px solid #e0e0e0',
      borderTop: '4px solid #1a3a6b',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
  );
}
