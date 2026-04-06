import React from 'react';
import { useNavigate } from 'react-router-dom';

const CARDS = [
  { label: 'Total Vectors',  value: '1.24M', color: 'var(--green)',   sub: 'In FAISS index' },
  { label: 'Documents',      value: '3',     color: 'var(--green)',   sub: 'Ingested & indexed' },
  { label: 'Active Alerts',  value: '4',     color: 'var(--red)',     sub: '1 critical' },
  { label: 'Avg Query (ms)', value: '3.2',   color: 'var(--text-bright)', sub: 'Last 100 queries' },
];

const QUICK = [
  { to: '/workspace',  label: 'Query Intelligence',  desc: 'Ask questions across your document corpus using natural language.',    icon: '💬' },
  { to: '/knowledge',  label: 'Upload Documents',     desc: 'Ingest new PDFs, DOCX, or text files into the FAISS vector store.',    icon: '📄' },
  { to: '/intel',      label: 'Intel Dashboard',      desc: 'View the knowledge map, entity distribution, and AI summaries.',       icon: '🧠' },
  { to: '/systems',    label: 'System Health',        desc: 'Monitor FastAPI performance, FAISS index stats, and live logs.',        icon: '⚙️' },
];

export default function DashboardPage() {
  const nav = useNavigate();
  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      <div style={s.content}>
        <h1 style={s.title}>AIDA Overview</h1>
        <p style={s.sub}>AI Intelligence Document Analyzer — RAG system for cybersecurity, legal, and business intelligence workflows.</p>

        {/* Metric row */}
        <div style={s.metricGrid}>
          {CARDS.map((c, i) => (
            <div key={i} style={s.metricCard}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>{c.label}</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: c.color, fontFamily: 'var(--font-display)', marginBottom: 4 }}>{c.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{c.sub}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div style={s.sectionTitle}>Quick Actions</div>
        <div style={s.quickGrid}>
          {QUICK.map((q, i) => (
            <div key={i} style={s.quickCard} onClick={() => nav(q.to)}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{q.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-bright)', marginBottom: 6, fontFamily: 'var(--font-display)' }}>{q.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>{q.desc}</div>
            </div>
          ))}
        </div>

        {/* Architecture */}
        <div style={s.sectionTitle}>System Architecture</div>
        <div style={s.arch}>
          {['User', 'FastAPI Backend', 'Text Processing', 'OpenAI Embeddings', 'FAISS Vector DB', 'LLM (GPT-4o-mini)', 'Response'].map((step, i, arr) => (
            <React.Fragment key={step}>
              <div style={s.archStep}>
                <div style={s.archBox}>{step}</div>
              </div>
              {i < arr.length - 1 && <div style={s.archArrow}>→</div>}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

const s = {
  content:    { padding: '32px 32px 48px' },
  title:      { fontSize: 32, fontWeight: 700, color: 'var(--text-bright)', letterSpacing: -1.5, fontFamily: 'var(--font-display)', marginBottom: 8 },
  sub:        { fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 32 },
  metricGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 40 },
  metricCard: { background: 'var(--bg-card-deep)', borderRadius: 8, padding: '20px 24px', border: '1px solid rgba(43,70,128,0.15)' },
  sectionTitle:{ fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 16, fontFamily: 'var(--font-ui)', paddingBottom: 8, borderBottom: '1px solid var(--border)' },
  quickGrid:  { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 40 },
  quickCard:  { background: 'var(--bg-card-deep)', borderRadius: 8, padding: 24, cursor: 'pointer', border: '1px solid rgba(43,70,128,0.15)', transition: 'all 0.15s' },
  arch:       { display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap', background: 'var(--bg-card-deep)', borderRadius: 8, padding: 28 },
  archStep:   { display: 'flex', alignItems: 'center' },
  archBox:    { background: 'var(--bg-card-alt)', border: '1px solid rgba(78,222,163,0.2)', borderRadius: 4, padding: '8px 14px', fontSize: 11, color: 'var(--green)', letterSpacing: 0.5, whiteSpace: 'nowrap' },
  archArrow:  { color: 'var(--text-dim)', margin: '0 8px', fontSize: 16 },
};
