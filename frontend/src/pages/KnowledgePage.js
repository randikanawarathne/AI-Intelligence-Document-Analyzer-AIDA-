import React, { useState, useEffect, useRef } from 'react';
import { uploadDocument, getDocuments } from '../utils/api';

export default function KnowledgePage() {
  const [docs,      setDocs]      = useState([]);
  const [dragging,  setDragging]  = useState(false);
  const [uploading, setUploading] = useState({});
  const [stats,     setStats]     = useState({ vectors: 1248392, capacity: 75 });
  const fileRef = useRef(null);

  const loadDocs = async () => {
    try {
      const { data } = await getDocuments();
      setDocs(data.documents || []);
      setStats(s => ({ ...s, vectors: data.total_vectors || s.vectors }));
    } catch { /* server might be off */ }
  };

  useEffect(() => { loadDocs(); }, []);

  const handleFiles = async (files) => {
    const arr = Array.from(files);
    for (const file of arr) {
      if (!file.name.match(/\.(txt|pdf|docx)$/i)) {
        alert(`Unsupported file type: ${file.name}`);
        continue;
      }
      const key = file.name + Date.now();
      setUploading(p => ({ ...p, [key]: { name: file.name, progress: 0, status: 'uploading' } }));
      try {
        const { data } = await uploadDocument(file, pct => setUploading(p => ({ ...p, [key]: { ...p[key], progress: pct } })));
        setUploading(p => ({ ...p, [key]: { ...p[key], progress: 100, status: 'done', chunks: data.chunks } }));
        await loadDocs();
        setTimeout(() => setUploading(p => { const n = { ...p }; delete n[key]; return n; }), 3000);
      } catch (err) {
        setUploading(p => ({ ...p, [key]: { ...p[key], status: 'error', err: err.response?.data?.detail || 'Upload failed' } }));
      }
    }
  };

  const onDrop = (e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); };

  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      <div style={s.content}>
        <h1 style={s.title}>Knowledge Base</h1>
        <p style={s.sub}>Ingest, manage, and query your document corpus. Files are automatically chunked, embedded via OpenAI, and indexed into FAISS for semantic retrieval.</p>

        {/* Upload + Stats */}
        <div style={s.topLayout}>
          {/* Drop zone */}
          <div
            style={{ ...s.dropZone, ...(dragging ? s.dropZoneActive : {}) }}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" style={{ display: 'none' }} multiple accept=".txt,.pdf,.docx" onChange={e => handleFiles(e.target.files)} />
            <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
            <div style={s.dropTitle}>Drag & drop files to ingest</div>
            <div style={s.dropSub}>Supports .txt · .pdf · .docx — files are automatically chunked and embedded</div>
            <button style={s.browseBtn} onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}>
              BROWSE FILES TO UPLOAD
            </button>
          </div>

          {/* Stats card */}
          <div style={s.statsCard}>
            <div style={s.statsTitle}>Vector Store Status</div>
            {[
              ['Total Vectors',   (stats.vectors || 0).toLocaleString()],
              ['Embedding Model', 'ada-002'],
              ['Index Type',      'Flat IP (cosine)'],
              ['Dimensions',      '1536'],
            ].map(([k, v]) => (
              <div key={k} style={s.statRow}><span style={s.statKey}>{k}</span><span style={s.statVal}>{v}</span></div>
            ))}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Storage Capacity: {stats.capacity}% utilized</div>
              <div style={s.track}><div style={{ ...s.fill, width: `${stats.capacity}%` }} /></div>
            </div>
          </div>
        </div>

        {/* Active uploads */}
        {Object.values(uploading).length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={s.tableHeader}><div style={s.sectionTitle}>Uploading</div></div>
            {Object.values(uploading).map((u, i) => (
              <div key={i} style={s.uploadRow}>
                <span style={{ color: 'var(--text-bright)', fontSize: 13 }}>{u.name}</span>
                {u.status === 'uploading' && (
                  <div style={{ flex: 1, margin: '0 16px' }}>
                    <div style={s.track}><div style={{ ...s.fill, width: `${u.progress}%`, transition: 'width 0.3s' }} /></div>
                  </div>
                )}
                {u.status === 'done' && <span style={{ color: 'var(--green)', fontSize: 12 }}>✓ Indexed ({u.chunks} chunks)</span>}
                {u.status === 'error' && <span style={{ color: 'var(--red)', fontSize: 12 }}>{u.err}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Documents table */}
        <div style={s.tableSection}>
          <div style={s.tableHeader}>
            <div style={s.sectionTitle}>Ingested Documents</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={s.tblBtn} onClick={loadDocs}>REFRESH</button>
            </div>
          </div>
          <table style={s.table}>
            <thead>
              <tr>
                {['Document Name', 'Date Ingested', 'Chunks', 'Status', 'Actions'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {docs.length === 0 ? (
                <tr><td colSpan={5} style={{ ...s.td, textAlign: 'center', color: 'var(--text-dim)', padding: 32 }}>No documents ingested yet. Upload your first document above.</td></tr>
              ) : (
                docs.map((d, i) => (
                  <tr key={i}>
                    <td style={s.td}><FileIcon />{d.name}</td>
                    <td style={{ ...s.td, color: 'var(--text-muted)' }}>{d.ingested_at}</td>
                    <td style={s.td}>{d.chunks}</td>
                    <td style={s.td}><StatusBadge status={d.status} /></td>
                    <td style={{ ...s.td, color: 'var(--text-muted)' }}>•••</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const ok = status === 'Indexed';
  return (
    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 6, background: ok ? 'rgba(52,211,153,0.1)' : 'rgba(245,158,11,0.1)', color: ok ? 'var(--green-dim)' : '#f59e0b' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
      {status}
    </span>
  );
}

function FileIcon() {
  return <svg width="14" height="17" viewBox="0 0 14 17" fill="none" style={{ marginRight: 10, flexShrink: 0 }}><path d="M1 1h8l4 4v11H1V1z" stroke="var(--text-muted)" strokeWidth="1.2"/><path d="M9 1v4h4" stroke="var(--text-muted)" strokeWidth="1.2"/></svg>;
}

const s = {
  content:    { padding: '32px 32px 48px' },
  title:      { fontSize: 32, fontWeight: 700, color: 'var(--text-bright)', letterSpacing: -1.5, fontFamily: 'var(--font-display)', marginBottom: 8 },
  sub:        { fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 680, marginBottom: 28 },
  topLayout:  { display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, marginBottom: 32 },
  dropZone:   { border: '2px dashed rgba(78,222,163,0.25)', borderRadius: 8, background: 'rgba(78,222,163,0.02)', padding: '48px 32px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  dropZoneActive: { borderColor: 'var(--green)', background: 'rgba(78,222,163,0.07)' },
  dropTitle:  { fontSize: 16, color: 'var(--text-bright)', fontFamily: 'var(--font-display)' },
  dropSub:    { fontSize: 13, color: 'var(--text-muted)' },
  browseBtn:  { background: 'linear-gradient(to right, var(--green), #005236)', border: 'none', borderRadius: 4, color: '#004a31', fontWeight: 700, fontSize: 11, letterSpacing: 1, padding: '10px 24px', cursor: 'pointer', fontFamily: 'var(--font-ui)' },
  statsCard:  { background: 'var(--bg-card-deep)', borderRadius: 8, padding: 24 },
  statsTitle: { fontSize: 13, letterSpacing: 1, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16, fontFamily: 'var(--font-ui)' },
  statRow:    { display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 },
  statKey:    { color: 'var(--text-muted)' },
  statVal:    { color: 'var(--text-bright)', fontWeight: 500 },
  track:      { background: 'var(--bg-card-alt)', height: 6, borderRadius: 6, overflow: 'hidden' },
  fill:       { height: '100%', borderRadius: 6, background: 'var(--green)' },
  uploadRow:  { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 24px', background: 'var(--bg-card-deep)', borderRadius: 4, marginBottom: 8 },
  tableSection:{ background: 'var(--bg-card-deep)', borderRadius: 8, overflow: 'hidden' },
  tableHeader:{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle:{ fontSize: 16, color: 'var(--text-bright)', fontFamily: 'var(--font-display)' },
  tblBtn:     { background: 'var(--bg-card)', border: 'none', borderRadius: 4, color: 'var(--green)', fontSize: 10, letterSpacing: 1, padding: '6px 14px', cursor: 'pointer', fontFamily: 'var(--font-ui)' },
  table:      { width: '100%', borderCollapse: 'collapse' },
  th:         { padding: '12px 24px', textAlign: 'left', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontWeight: 500 },
  td:         { padding: '14px 24px', fontSize: 13, color: 'var(--text-bright)', borderBottom: '1px solid rgba(30,41,59,0.3)', display: 'revert', alignItems: 'center' },
};
