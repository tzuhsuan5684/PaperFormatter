import React from 'react';
import { ThesisSchema } from '../types/ThesisSchema';

export type PreviewTab =
  | 'cover'
  | 'abstract'
  | 'acknowledgments'
  | 'chapters'
  | 'bibliography'
  | 'figures'
  | 'appendices';

interface Props {
  schema: ThesisSchema;
  tab: PreviewTab;
}

// A4: 210mm x 297mm → 使用 CSS aspect-ratio 固定比例
// 字型：標楷體 (DFKai-SB / BiauKai) fallback 新細明體 (PMingLiU)
// 英文自動走 Times New Roman，中文走標楷體 / 新細明體
const CJK_SERIF = '"Times New Roman", "DFKai-SB", "BiauKai", "標楷體", "PMingLiU", "新細明體", serif';
const EN_SERIF = '"Times New Roman", Times, serif';

const PAGE_WIDTH = 620;
const PAGE_HEIGHT = Math.round((PAGE_WIDTH * 297) / 210);

const pageStyle: React.CSSProperties = {
  width: PAGE_WIDTH,
  height: PAGE_HEIGHT,
  background: '#fff',
  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
  padding: '60px 56px',
  boxSizing: 'border-box',
  fontFamily: CJK_SERIF,
  fontSize: 13,
  lineHeight: 1.9,
  color: '#111',
  overflow: 'hidden',
  position: 'relative',
  marginBottom: 20,
};

const stackStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

export function ThesisPreview({ schema, tab }: Props) {
  return (
    <div style={stackStyle}>
      {tab === 'cover' && <CoverPage schema={schema} />}
      {tab === 'abstract' && <AbstractPages schema={schema} />}
      {tab === 'acknowledgments' && <AcknowledgmentsPage schema={schema} />}
      {tab === 'chapters' && <ChaptersPages schema={schema} />}
      {tab === 'bibliography' && <BibliographyPage schema={schema} />}
      {tab === 'figures' && <FiguresPages schema={schema} />}
      {tab === 'appendices' && <AppendicesPages schema={schema} />}
    </div>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return <div style={pageStyle}>{children}</div>;
}

// ─── Cover ────────────────────────────────────────────────────────────────────
function CoverPage({ schema }: { schema: ThesisSchema }) {
  const c = schema.cover;
  return (
    <div style={pageStyle}>
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          justifyContent: 'space-between',
          paddingTop: 40,
          paddingBottom: 40,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 4 }}>
          國&nbsp;立&nbsp;中&nbsp;央&nbsp;大&nbsp;學
        </div>

        <div>
          <div style={{ fontSize: 16, letterSpacing: 2, marginBottom: 8 }}>
            {c.department || '（系所名稱）'}
          </div>
          <div style={{ fontSize: 16, letterSpacing: 2 }}>
            {c.degree || '碩士'}論文
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.6, marginBottom: 16 }}>
            {c.titleZh || '（中文論文題目）'}
          </div>
          <div style={{ fontSize: 14, fontStyle: 'italic', lineHeight: 1.6, color: '#333', fontFamily: EN_SERIF }}>
            {c.titleEn || '(English Title)'}
          </div>
        </div>

        <div style={{ fontSize: 14, lineHeight: 2 }}>
          <div>
            <span style={{ display: 'inline-block', width: 90, textAlign: 'justify' }}>研 究 生</span>
            ：{c.studentName || '　　　　'}
          </div>
          <div>
            <span style={{ display: 'inline-block', width: 90, textAlign: 'justify' }}>指導教授</span>
            ：{c.advisorName || '　　　　'}
          </div>
        </div>

        <div style={{ fontSize: 14, letterSpacing: 2 }}>
          中 華 民 國 &nbsp;{c.year || '○○○'}&nbsp; 年 &nbsp;{c.month || '○'}&nbsp; 月
        </div>
      </div>
    </div>
  );
}

// ─── Abstract（中/英各一張）──────────────────────────────────────────────────
function AbstractPages({ schema }: { schema: ThesisSchema }) {
  return (
    <>
      <PageShell>
        <h2 style={{ textAlign: 'center', fontSize: 18, letterSpacing: 4, marginBottom: 28 }}>摘&nbsp;&nbsp;要</h2>
        <p style={{ textIndent: '2em', textAlign: 'justify', whiteSpace: 'pre-wrap' }}>
          {schema.abstractZh.content || '（中文摘要內容）'}
        </p>
        {schema.abstractZh.keywords.length > 0 && (
          <p style={{ marginTop: 28, textIndent: 0 }}>
            <strong>關鍵詞：</strong>
            {schema.abstractZh.keywords.join('、')}
          </p>
        )}
      </PageShell>

      <PageShell>
        <h2 style={{ textAlign: 'center', fontSize: 18, letterSpacing: 2, marginBottom: 28, fontFamily: EN_SERIF }}>
          Abstract
        </h2>
        <p style={{ textIndent: '2em', textAlign: 'justify', whiteSpace: 'pre-wrap', fontFamily: EN_SERIF }}>
          {schema.abstractEn.content || '(English abstract content)'}
        </p>
        {schema.abstractEn.keywords.length > 0 && (
          <p style={{ marginTop: 28, textIndent: 0, fontFamily: EN_SERIF }}>
            <strong>Keywords: </strong>
            {schema.abstractEn.keywords.join(', ')}
          </p>
        )}
      </PageShell>
    </>
  );
}

// ─── Acknowledgments ──────────────────────────────────────────────────────────
function AcknowledgmentsPage({ schema }: { schema: ThesisSchema }) {
  return (
    <PageShell>
      <h2 style={{ textAlign: 'center', fontSize: 18, letterSpacing: 4, marginBottom: 28 }}>誌&nbsp;&nbsp;謝</h2>
      <p style={{ textIndent: '2em', textAlign: 'justify', whiteSpace: 'pre-wrap' }}>
        {schema.acknowledgments || '（誌謝內容）'}
      </p>
    </PageShell>
  );
}

// ─── Chapters（每章一張）─────────────────────────────────────────────────────
function ChaptersPages({ schema }: { schema: ThesisSchema }) {
  if (schema.chapters.length === 0) {
    return <PageShell><p style={{ color: '#888' }}>（無章節）</p></PageShell>;
  }
  return (
    <>
      {schema.chapters.map((ch, ci) => (
        <PageShell key={ci}>
          <h2 style={{ textAlign: 'center', fontSize: 18, marginBottom: 8, letterSpacing: 2 }}>
            第 {ch.number} 章　{ch.titleZh || '（章名）'}
          </h2>
          {ch.titleEn && (
            <p style={{ textAlign: 'center', fontStyle: 'italic', color: '#555', marginBottom: 20, fontFamily: EN_SERIF }}>
              {ch.titleEn}
            </p>
          )}
          {ch.sections.map((sec, si) => (
            <div key={si} style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
                {sec.id}　{sec.titleZh}
              </h3>
              <p style={{ textIndent: '2em', textAlign: 'justify', whiteSpace: 'pre-wrap', margin: 0 }}>
                {sec.content || '（內容）'}
              </p>
            </div>
          ))}
        </PageShell>
      ))}
    </>
  );
}

// ─── Bibliography ─────────────────────────────────────────────────────────────
function BibliographyPage({ schema }: { schema: ThesisSchema }) {
  const entries = schema.bibliography.filter(s => s.trim());
  return (
    <PageShell>
      <h2 style={{ textAlign: 'center', fontSize: 18, letterSpacing: 2, marginBottom: 28 }}>參 考 文 獻</h2>
      <ol style={{ paddingLeft: 24, margin: 0 }}>
        {entries.length === 0 && <li style={{ listStyle: 'none', color: '#888' }}>（尚無參考文獻）</li>}
        {entries.map((b, i) => (
          <li key={i} style={{ marginBottom: 10, textAlign: 'justify', lineHeight: 1.8 }}>
            {b}
          </li>
        ))}
      </ol>
    </PageShell>
  );
}

// ─── 圖目錄 + 表目錄（各一張）────────────────────────────────────────────────
function FiguresPages({ schema }: { schema: ThesisSchema }) {
  return (
    <>
      <PageShell>
        <h2 style={{ textAlign: 'center', fontSize: 18, letterSpacing: 2, marginBottom: 24 }}>圖 目 錄</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {schema.figures.length === 0 && (
              <tr><td style={{ color: '#888', padding: 6 }}>（無圖）</td></tr>
            )}
            {schema.figures.map((f, i) => (
              <tr key={i}>
                <td style={{ padding: '4px 8px', whiteSpace: 'nowrap' }}>圖 {f.number}</td>
                <td style={{ padding: '4px 8px', width: '100%' }}>{f.title || '（未命名）'}</td>
                <td style={{ padding: '4px 8px', textAlign: 'right' }}>{f.page ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PageShell>

      <PageShell>
        <h2 style={{ textAlign: 'center', fontSize: 18, letterSpacing: 2, marginBottom: 24 }}>表 目 錄</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {schema.tables.length === 0 && (
              <tr><td style={{ color: '#888', padding: 6 }}>（無表）</td></tr>
            )}
            {schema.tables.map((t, i) => (
              <tr key={i}>
                <td style={{ padding: '4px 8px', whiteSpace: 'nowrap' }}>表 {t.number}</td>
                <td style={{ padding: '4px 8px', width: '100%' }}>{t.title || '（未命名）'}</td>
                <td style={{ padding: '4px 8px', textAlign: 'right' }}>{t.page ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PageShell>
    </>
  );
}

// ─── Appendices（每篇一張）───────────────────────────────────────────────────
function AppendicesPages({ schema }: { schema: ThesisSchema }) {
  const apps = schema.appendices ?? [];
  if (apps.length === 0) {
    return <PageShell><p style={{ textAlign: 'center', color: '#888', marginTop: 60 }}>（無附錄）</p></PageShell>;
  }
  return (
    <>
      {apps.map((ap, i) => (
        <PageShell key={i}>
          <h2 style={{ textAlign: 'center', fontSize: 18, letterSpacing: 2, marginBottom: 16 }}>
            附錄 {ap.label}　{ap.title}
          </h2>
          <p style={{ textIndent: '2em', textAlign: 'justify', whiteSpace: 'pre-wrap' }}>
            {ap.content || '（內容）'}
          </p>
        </PageShell>
      ))}
    </>
  );
}
