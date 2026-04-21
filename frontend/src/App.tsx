import { useState } from 'react';
import { generateDocx, uploadDraft } from './api';
import { DocxPreview } from './components/DocxPreview';
import { SchemaPreview, Tab } from './components/SchemaPreview';
import { UploadZone } from './components/UploadZone';
import { ThesisSchema } from './types/ThesisSchema';

type Stage = 'idle' | 'uploading' | 'reviewing';

export default function App() {
  const [stage, setStage] = useState<Stage>('idle');
  const [schema, setSchema] = useState<ThesisSchema | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('cover');
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewing, setPreviewing] = useState(false);

  async function handleUpload(file: File) {
    setStage('uploading');
    setError('');
    try {
      const result = await uploadDraft(file);
      setSchema(result);
      setStage('reviewing');
    } catch (e: unknown) {
      setError(`上傳失敗：${extractError(e)}`);
      setStage('idle');
    }
  }

  async function handlePreview() {
    if (!schema) return;
    setPreviewing(true);
    setError('');
    try {
      const blob = await generateDocx(schema);
      setPreviewBlob(blob);
    } catch (e: unknown) {
      setError(`產生失敗：${extractError(e)}`);
    } finally {
      setPreviewing(false);
    }
  }

  function handleDownload() {
    if (!previewBlob) return;
    const url = URL.createObjectURL(previewBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ncu_thesis.docx';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  function handleReset() {
    setStage('idle');
    setSchema(null);
    setError('');
    setActiveTab('cover');
    setPreviewBlob(null);
    setPreviewing(false);
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

      <main style={{ maxWidth: stage === 'reviewing' ? 1440 : 960, margin: '0 auto', padding: '32px 20px' }}>
        {error && (
          <div style={{ background: '#fdecea', border: '1px solid #f5c6cb', borderRadius: 8, padding: '12px 16px', marginBottom: 24, color: '#721c24' }}>
            {error}
          </div>
        )}

        {stage === 'idle' && <UploadZone onUpload={handleUpload} />}

        {stage === 'uploading' && (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <Spinner size={48} />
            <p style={{ marginTop: 24, fontSize: 16, color: '#333' }}>AI 正在解析論文草稿...</p>
            <p style={{ color: '#888', fontSize: 13 }}>這可能需要 20–60 秒，請稍候</p>
          </div>
        )}

        {stage === 'reviewing' && schema && (
          <div>
            <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, padding: '12px 16px', marginBottom: 24, color: '#2e7d32' }}>
              ✅ 解析完成！左側編輯資料，完成後點擊「產生預覽」查看真實 Word 輸出，再下載。
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
              {/* 左：表單 */}
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 20, maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
                <SchemaPreview
                  schema={schema}
                  onChange={setSchema}
                  tab={activeTab}
                  onTabChange={setActiveTab}
                />
              </div>

              {/* 右：Word 預覽 */}
              <div style={{ position: 'sticky', top: 20, background: '#e9ecf1', borderRadius: 10, padding: '24px 16px', maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#666', letterSpacing: 1 }}>Word 預覽</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={handlePreview}
                      disabled={previewing}
                      style={{ background: previewing ? '#aaa' : '#1a3a6b', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: previewing ? 'not-allowed' : 'pointer' }}
                    >
                      {previewing ? '產生中...' : '產生預覽'}
                    </button>
                    {previewBlob && !previewing && (
                      <button
                        onClick={handleDownload}
                        style={{ background: '#2e7d32', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                      >
                        ⬇ 下載 .docx
                      </button>
                    )}
                  </div>
                </div>
                <DocxPreview blob={previewBlob} loading={previewing} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Spinner({ size = 48 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size,
      border: '4px solid #e0e0e0',
      borderTop: '4px solid #1a3a6b',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
      margin: '0 auto',
    }} />
  );
}

function extractError(e: unknown): string {
  if (e && typeof e === 'object' && 'response' in e) {
    const resp = (e as { response?: { data?: { detail?: string; error?: string } } }).response;
    return resp?.data?.detail ?? resp?.data?.error ?? '伺服器錯誤';
  }
  if (e instanceof Error) return e.message;
  return '未知錯誤';
}
