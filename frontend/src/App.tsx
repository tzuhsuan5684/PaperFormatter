import React, { useState } from 'react';
import { generateDocx, uploadDraft } from './api';
import { DownloadButton } from './components/DownloadButton';
import { SchemaPreview, Tab } from './components/SchemaPreview';
import { ThesisPreview } from './components/ThesisPreview';
import { UploadZone } from './components/UploadZone';
import { ThesisSchema } from './types/ThesisSchema';

type Stage = 'idle' | 'uploading' | 'reviewing' | 'generating' | 'done';

export default function App() {
  const [stage, setStage] = useState<Stage>('idle');
  const [schema, setSchema] = useState<ThesisSchema | null>(null);
  const [error, setError] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('cover');

  async function handleUpload(file: File) {
    setStage('uploading');
    setError('');
    try {
      const result = await uploadDraft(file);
      setSchema(result);
      setStage('reviewing');
    } catch (e: unknown) {
      const msg = extractError(e);
      setError(`上傳失敗：${msg}`);
      setStage('idle');
    }
  }

  async function handleGenerate() {
    if (!schema) return;
    setStage('generating');
    setError('');
    try {
      const blob = await generateDocx(schema);
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStage('done');
    } catch (e: unknown) {
      const msg = extractError(e);
      setError(`產生失敗：${msg}`);
      setStage('reviewing');
    }
  }

  function handleReset() {
    setStage('idle');
    setSchema(null);
    setError('');
    setActiveTab('cover');
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl('');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fb', fontFamily: "'Noto Sans TC', sans-serif" }}>
      <header style={{ background: '#1a3a6b', color: '#fff', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, fontSize: 18 }}>國立中央大學 論文格式轉換系統</span>
        {stage !== 'idle' && (
          <button onClick={handleReset}
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontSize: 13 }}>
            重新上傳
          </button>
        )}
      </header>

      <main
        style={{
          maxWidth: stage === 'reviewing' ? 1440 : 960,
          margin: '0 auto',
          padding: '32px 20px',
        }}
      >
        {error && (
          <div style={{ background: '#fdecea', border: '1px solid #f5c6cb', borderRadius: 8, padding: '12px 16px', marginBottom: 24, color: '#721c24' }}>
            {error}
          </div>
        )}

        {stage === 'idle' && <UploadZone onUpload={handleUpload} />}

        {stage === 'uploading' && (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <Spinner />
            <p style={{ marginTop: 24, fontSize: 16, color: '#333' }}>AI 正在解析論文草稿...</p>
            <p style={{ color: '#888', fontSize: 13 }}>這可能需要 20–60 秒，請稍候</p>
          </div>
        )}

        {stage === 'reviewing' && schema && (
          <div>
            <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, padding: '12px 16px', marginBottom: 24, color: '#2e7d32' }}>
              ✅ 解析完成！左側編輯、右側即時預覽。完成後點擊「產生論文」
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                gap: 24,
                alignItems: 'start',
              }}
            >
              {/* 左：表單 */}
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 10,
                  padding: 20,
                  maxHeight: 'calc(100vh - 180px)',
                  overflowY: 'auto',
                }}
              >
                <SchemaPreview
                  schema={schema}
                  onChange={setSchema}
                  tab={activeTab}
                  onTabChange={setActiveTab}
                />
              </div>

              {/* 右：A4 即時預覽 */}
              <div
                style={{
                  position: 'sticky',
                  top: 20,
                  background: '#e9ecf1',
                  borderRadius: 10,
                  padding: '24px 16px',
                  maxHeight: 'calc(100vh - 180px)',
                  overflowY: 'auto',
                }}
              >
                <div style={{ fontSize: 12, color: '#666', textAlign: 'center', marginBottom: 12, letterSpacing: 1 }}>
                  A4 即時預覽 · {tabLabel(activeTab)}
                </div>
                <ThesisPreview schema={schema} tab={activeTab} />
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <DownloadButton onClick={handleGenerate} loading={false} />
            </div>
          </div>
        )}

        {stage === 'generating' && (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <Spinner />
            <p style={{ marginTop: 24, fontSize: 16, color: '#333' }}>正在套用 NCU 格式並產生論文...</p>
          </div>
        )}

        {stage === 'done' && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <h2 style={{ color: '#1a3a6b', marginBottom: 8 }}>論文已成功產生！</h2>
            <p style={{ color: '#555', marginBottom: 32 }}>符合國立中央大學論文格式規範</p>
            <a
              href={downloadUrl}
              download="ncu_thesis.docx"
              style={{
                display: 'inline-block',
                background: '#1a3a6b',
                color: '#fff',
                textDecoration: 'none',
                borderRadius: 8,
                padding: '12px 32px',
                fontSize: 16,
                fontWeight: 600,
                marginBottom: 16,
              }}
            >
              ⬇ 下載 ncu_thesis.docx
            </a>
            <br />
            <button onClick={handleReset}
              style={{ background: 'none', border: '1px solid #1a3a6b', color: '#1a3a6b', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 14, marginTop: 8 }}>
              重新上傳另一份草稿
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{
      width: 48, height: 48, border: '4px solid #e0e0e0',
      borderTop: '4px solid #1a3a6b', borderRadius: '50%',
      animation: 'spin 0.8s linear infinite', margin: '0 auto',
    }} />
  );
}

function tabLabel(t: Tab): string {
  switch (t) {
    case 'cover': return '封面';
    case 'abstract': return '摘要';
    case 'acknowledgments': return '誌謝';
    case 'chapters': return '章節';
    case 'bibliography': return '參考文獻';
    case 'figures': return '圖表清單';
    case 'appendices': return '附錄';
  }
}

function extractError(e: unknown): string {
  if (e && typeof e === 'object' && 'response' in e) {
    // FastAPI uses { detail: "..." }, our routes also use that format
    const resp = (e as { response?: { data?: { detail?: string; error?: string } } }).response;
    return resp?.data?.detail ?? resp?.data?.error ?? '伺服器錯誤';
  }
  if (e instanceof Error) return e.message;
  return '未知錯誤';
}
