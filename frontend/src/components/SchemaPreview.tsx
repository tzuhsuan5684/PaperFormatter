import React, { useState } from 'react';
import {
  Appendix,
  Chapter,
  FigureEntry,
  Section,
  SymbolEntry,
  TableEntry,
  ThesisSchema,
} from '../types/ThesisSchema';

interface Props {
  schema: ThesisSchema;
  onChange: (updated: ThesisSchema) => void;
}

type Tab = 'cover' | 'abstract' | 'acknowledgments' | 'chapters' | 'bibliography' | 'figures' | 'appendices';

const TAB_LABELS: [Tab, string][] = [
  ['cover', '封面'],
  ['abstract', '摘要'],
  ['acknowledgments', '誌謝'],
  ['chapters', '章節'],
  ['bibliography', '參考文獻'],
  ['figures', '圖表清單'],
  ['appendices', '附錄'],
];

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: '8px 18px',
  border: 'none',
  borderBottom: active ? '3px solid #1a3a6b' : '3px solid transparent',
  background: 'none',
  cursor: 'pointer',
  fontWeight: active ? 700 : 400,
  color: active ? '#1a3a6b' : '#555',
  fontSize: 14,
});

const field: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  marginBottom: 16,
};

const label: React.CSSProperties = {
  fontSize: 12,
  color: '#666',
  marginBottom: 4,
  fontWeight: 600,
};

const input: React.CSSProperties = {
  border: '1px solid #ccc',
  borderRadius: 6,
  padding: '8px 10px',
  fontSize: 14,
  fontFamily: 'inherit',
};

const textarea = (rows = 4): React.CSSProperties => ({
  ...input,
  resize: 'vertical',
  minHeight: rows * 24,
});

// ─── Tag input ────────────────────────────────────────────────────────────────
function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [val, setVal] = useState('');
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, border: '1px solid #ccc', borderRadius: 6, padding: 6 }}>
      {tags.map((t, i) => (
        <span key={i} style={{ background: '#e8edf8', borderRadius: 4, padding: '2px 8px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
          {t}
          <button onClick={() => onChange(tags.filter((_, j) => j !== i))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 12, padding: 0 }}>✕</button>
        </span>
      ))}
      <input
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => {
          if ((e.key === 'Enter' || e.key === ',') && val.trim()) {
            e.preventDefault();
            onChange([...tags, val.trim()]);
            setVal('');
          }
        }}
        placeholder="輸入後按 Enter 新增"
        style={{ border: 'none', outline: 'none', minWidth: 120, fontSize: 13, fontFamily: 'inherit' }}
      />
    </div>
  );
}

// ─── Section editor ───────────────────────────────────────────────────────────
function SectionEditor({
  sec,
  onChange,
}: {
  sec: Section;
  onChange: (s: Section) => void;
}) {
  return (
    <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 12, marginBottom: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div style={field}>
          <span style={label}>節編號</span>
          <input style={input} value={sec.id} onChange={e => onChange({ ...sec, id: e.target.value })} />
        </div>
        <div style={field}>
          <span style={label}>中文標題</span>
          <input style={input} value={sec.titleZh} onChange={e => onChange({ ...sec, titleZh: e.target.value })} />
        </div>
        <div style={field}>
          <span style={label}>英文標題</span>
          <input style={input} value={sec.titleEn ?? ''} onChange={e => onChange({ ...sec, titleEn: e.target.value })} />
        </div>
      </div>
      <div style={field}>
        <span style={label}>內容</span>
        <textarea style={textarea(6)} value={sec.content}
          onChange={e => onChange({ ...sec, content: e.target.value })} />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function SchemaPreview({ schema, onChange }: Props) {
  const [tab, setTab] = useState<Tab>('cover');

  function set<K extends keyof ThesisSchema>(key: K, value: ThesisSchema[K]) {
    onChange({ ...schema, [key]: value });
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #ddd', marginBottom: 24, overflowX: 'auto' }}>
        {TAB_LABELS.map(([key, lbl]) => (
          <button key={key} style={tabStyle(tab === key)} onClick={() => setTab(key)}>{lbl}</button>
        ))}
      </div>

      {/* Cover */}
      {tab === 'cover' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {([
            ['titleZh', '中文論文題目'],
            ['titleEn', '英文論文題目'],
            ['department', '系所名稱'],
            ['studentName', '研究生姓名'],
            ['advisorName', '指導教授姓名'],
            ['year', '民國年'],
            ['month', '月份'],
          ] as [keyof ThesisSchema['cover'], string][]).map(([k, lbl]) => (
            <div key={k} style={field}>
              <span style={label}>{lbl}</span>
              <input style={input} value={schema.cover[k] as string}
                onChange={e => set('cover', { ...schema.cover, [k]: e.target.value })} />
            </div>
          ))}
          <div style={field}>
            <span style={label}>學位</span>
            <select style={input} value={schema.cover.degree}
              onChange={e => set('cover', { ...schema.cover, degree: e.target.value as '博士' | '碩士' })}>
              <option value="碩士">碩士</option>
              <option value="博士">博士</option>
            </select>
          </div>
        </div>
      )}

      {/* Abstract */}
      {tab === 'abstract' && (
        <div>
          <h3 style={{ color: '#1a3a6b', marginBottom: 16 }}>中文摘要</h3>
          <div style={field}>
            <span style={label}>摘要內容</span>
            <textarea style={textarea(8)} value={schema.abstractZh.content}
              onChange={e => set('abstractZh', { ...schema.abstractZh, content: e.target.value })} />
          </div>
          <div style={field}>
            <span style={label}>關鍵詞（按 Enter 新增）</span>
            <TagInput tags={schema.abstractZh.keywords}
              onChange={kw => set('abstractZh', { ...schema.abstractZh, keywords: kw })} />
          </div>

          <h3 style={{ color: '#1a3a6b', marginBottom: 16, marginTop: 32 }}>英文摘要</h3>
          <div style={field}>
            <span style={label}>Abstract</span>
            <textarea style={textarea(8)} value={schema.abstractEn.content}
              onChange={e => set('abstractEn', { ...schema.abstractEn, content: e.target.value })} />
          </div>
          <div style={field}>
            <span style={label}>Keywords（按 Enter 新增）</span>
            <TagInput tags={schema.abstractEn.keywords}
              onChange={kw => set('abstractEn', { ...schema.abstractEn, keywords: kw })} />
          </div>
        </div>
      )}

      {/* Acknowledgments */}
      {tab === 'acknowledgments' && (
        <div style={field}>
          <span style={label}>誌謝內容</span>
          <textarea style={textarea(12)} value={schema.acknowledgments}
            onChange={e => set('acknowledgments', e.target.value)} />
        </div>
      )}

      {/* Chapters */}
      {tab === 'chapters' && (
        <div>
          {schema.chapters.map((ch, ci) => (
            <details key={ci} style={{ marginBottom: 16, border: '1px solid #ddd', borderRadius: 8 }} open={ci === 0}>
              <summary style={{ padding: '12px 16px', cursor: 'pointer', fontWeight: 600, color: '#1a3a6b' }}>
                第 {ch.number} 章　{ch.titleZh || '（未命名）'}
              </summary>
              <div style={{ padding: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div style={field}>
                    <span style={label}>中文章名</span>
                    <input style={input} value={ch.titleZh}
                      onChange={e => {
                        const updated = schema.chapters.map((c, i) => i === ci ? { ...c, titleZh: e.target.value } : c);
                        set('chapters', updated);
                      }} />
                  </div>
                  <div style={field}>
                    <span style={label}>英文章名</span>
                    <input style={input} value={ch.titleEn}
                      onChange={e => {
                        const updated = schema.chapters.map((c, i) => i === ci ? { ...c, titleEn: e.target.value } : c);
                        set('chapters', updated);
                      }} />
                  </div>
                </div>
                <p style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>節內容：</p>
                {ch.sections.map((sec, si) => (
                  <SectionEditor key={si} sec={sec}
                    onChange={updated => {
                      const chapters = schema.chapters.map((c, i) => {
                        if (i !== ci) return c;
                        const sections = c.sections.map((s, j) => j === si ? updated : s);
                        return { ...c, sections };
                      });
                      set('chapters', chapters);
                    }} />
                ))}
              </div>
            </details>
          ))}
        </div>
      )}

      {/* Bibliography */}
      {tab === 'bibliography' && (
        <div>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>每行一筆參考文獻：</p>
          <textarea
            style={{ ...textarea(16), width: '100%', boxSizing: 'border-box' }}
            value={schema.bibliography.join('\n')}
            onChange={e => set('bibliography', e.target.value.split('\n'))}
          />
        </div>
      )}

      {/* Figures & Tables */}
      {tab === 'figures' && (
        <div>
          <h3 style={{ color: '#1a3a6b', marginBottom: 16 }}>圖目錄</h3>
          {schema.figures.map((f, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 100px', gap: 8, marginBottom: 8 }}>
              <div style={field}>
                <span style={label}>圖號</span>
                <input style={input} type="number" value={f.number}
                  onChange={e => {
                    const figures = schema.figures.map((fig, j) => j === i ? { ...fig, number: Number(e.target.value) } : fig);
                    set('figures', figures);
                  }} />
              </div>
              <div style={field}>
                <span style={label}>標題</span>
                <input style={input} value={f.title}
                  onChange={e => {
                    const figures = schema.figures.map((fig, j) => j === i ? { ...fig, title: e.target.value } : fig);
                    set('figures', figures);
                  }} />
              </div>
              <div style={field}>
                <span style={label}>頁碼</span>
                <input style={input} type="number" value={f.page ?? ''}
                  onChange={e => {
                    const figures = schema.figures.map((fig, j) => j === i ? { ...fig, page: Number(e.target.value) || undefined } : fig);
                    set('figures', figures);
                  }} />
              </div>
            </div>
          ))}

          <h3 style={{ color: '#1a3a6b', marginBottom: 16, marginTop: 32 }}>表目錄</h3>
          {schema.tables.map((t, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 100px', gap: 8, marginBottom: 8 }}>
              <div style={field}>
                <span style={label}>表號</span>
                <input style={input} type="number" value={t.number}
                  onChange={e => {
                    const tables = schema.tables.map((tbl, j) => j === i ? { ...tbl, number: Number(e.target.value) } : tbl);
                    set('tables', tables);
                  }} />
              </div>
              <div style={field}>
                <span style={label}>標題</span>
                <input style={input} value={t.title}
                  onChange={e => {
                    const tables = schema.tables.map((tbl, j) => j === i ? { ...tbl, title: e.target.value } : tbl);
                    set('tables', tables);
                  }} />
              </div>
              <div style={field}>
                <span style={label}>頁碼</span>
                <input style={input} type="number" value={t.page ?? ''}
                  onChange={e => {
                    const tables = schema.tables.map((tbl, j) => j === i ? { ...tbl, page: Number(e.target.value) || undefined } : tbl);
                    set('tables', tables);
                  }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Appendices */}
      {tab === 'appendices' && (
        <div>
          {(schema.appendices ?? []).map((ap, i) => (
            <div key={i} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 12, marginBottom: 12 }}>
                <div style={field}>
                  <span style={label}>附錄標籤</span>
                  <input style={input} value={ap.label}
                    onChange={e => {
                      const appendices = (schema.appendices ?? []).map((a, j) => j === i ? { ...a, label: e.target.value } : a);
                      set('appendices', appendices);
                    }} />
                </div>
                <div style={field}>
                  <span style={label}>標題</span>
                  <input style={input} value={ap.title}
                    onChange={e => {
                      const appendices = (schema.appendices ?? []).map((a, j) => j === i ? { ...a, title: e.target.value } : a);
                      set('appendices', appendices);
                    }} />
                </div>
              </div>
              <div style={field}>
                <span style={label}>內容</span>
                <textarea style={textarea(8)} value={ap.content}
                  onChange={e => {
                    const appendices = (schema.appendices ?? []).map((a, j) => j === i ? { ...a, content: e.target.value } : a);
                    set('appendices', appendices);
                  }} />
              </div>
            </div>
          ))}
          {(!schema.appendices || schema.appendices.length === 0) && (
            <p style={{ color: '#888' }}>無附錄</p>
          )}
        </div>
      )}
    </div>
  );
}
