import React from 'react';

interface Props {
  onClick: () => void;
  loading: boolean;
}

export function DownloadButton({ onClick, loading }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        background: loading ? '#aaa' : '#1a3a6b',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        padding: '12px 32px',
        fontSize: 16,
        fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'background 0.2s',
      }}
    >
      {loading ? '產生中...' : '⬇ 產生並下載論文 .docx'}
    </button>
  );
}
