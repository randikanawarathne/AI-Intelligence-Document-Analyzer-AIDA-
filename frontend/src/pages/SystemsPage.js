import React, { useState, useEffect, useRef } from 'react';
import { getStats, getHealth } from '../utils/api';

const LOG_LINES = [
  { time: '08:14:03', level: 'INFO',  msg: 'FastAPI server started on 0.0.0.0:8000' },
  { time: '08:14:04', level: 'INFO',  msg: 'FAISS index loaded: 1,248,392 vectors in 512 dimensions' },
  { time: '08:14:05', level: 'INFO',  msg: 'Embedding model connected: text-embedding-ada-002' },
  { time: '08:14:22', level: 'INFO',  msg: "POST /upload — 'threat_report_q1.pdf' ingested (847 chunks, 3.2s)" },
  { time: '08:15:01', level: 'INFO',  msg: 'POST /query — latency: 3.2ms, top-k: 5 retrieved' },
  { time: '08:16:33', level: 'WARN',  msg: 'Low confidence score (0.31) on cluster: Department_B' },
  { time: '08:17:44', level: 'INFO',  msg: "POST /upload — 'internal_audit_2025.docx' ingested (312 chunks, 1.8s)" },
  { time: '08:18:02', level: 'ERROR', msg: 'Embedding timeout on chunk 847/2314 — retrying...' },
  { time: '08:18:03', level: 'INFO',  msg: 'Retry successful — chunk ingested' },
  { time: '08:19:11', level: 'INFO',  msg: 'Knowledge map topology updated — 1,248 active nodes' },
];

const levelColor = { INFO: 'var(--green)', WARN: '#f59e0b', ERROR: 'var(--red)' };

export default function SystemsPage() {
  const [stats, setStats]     = useState(null);
  const [health, setHealth]   = useState(null);
  const [logs, setLogs]       = useState(LOG_LINES);
  const termRef               = useRef(null);

  useEffect(() => {
    Promise.all([getStats(), getHealth()])
      .then(([s, h]) => { setStats(s.data); setHealth(h.data); })
      .catch(() => {});

    // Simulate live log appending
    const interval = setInterval(() => {
      const now = new Date();
      const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
      const liveLogs = [
        { time: ts, level: 'INFO',  msg: `POST /query — latency: ${(2 + Math.random() * 5).toFixed(1)}ms` },
        { time: ts, level: 'INFO',  msg: `FAISS search completed — ${Math.floor(Math.random()*5)+1} vectors retrieved` },
        { time: ts, level: 'INFO',  msg: 'Heartbeat OK — all subsystems nominal' },
      ];
      const line = liveLogs[Math.floor(Math.random() * liveLogs.length)];
      setLogs(prev => [...prev.slice(-50), line]);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [logs]);

  const vectors = health?.vectors ?? stats?.vectors ?? 0;
  const docs    = health?.documents ?? stats?.documents ?? 0;

  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Systems Health</h1>
          <p style={s.sub}>Real-time performance monitoring across all AIDA subsystems.</p>
        </div>
        <button style={s.btnOutline}>RUN DIAGNOSTICS</button>
      </div>

      {/* Cards grid */}
      <div style={s.grid}>
        {/* FastAPI */}
        <div style={s.card}>
          <div style={s.cardHead}>
            <div>
              <div style={s.cardTitle}>FastAPI Performance</div>
              <div style={s.cardSub}>REST layer · 0.0.0.0:8000</div>
            </div>
            <span style={s.badge}>HEALTHY</span>
          </div>
          <Metric label="Request Throughput" value="94%" pct={94} color="var(--green)" />
          <Metric label="Error Rate"          value="0.2%" pct={2}  color="var(--green)" />
          <div style={s.statRow}>
            <StatNum num="42ms" label="Avg Latency" />
            <StatNum num="1.2k" label="Req / min" />
          </div>
        </div>

        {/* FAISS */}
        <div style={s.card}>
          <div style={s.cardHead}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={s.faissIcon}><TriangleIcon /></div>
              <div>
                <div style={s.cardTitle}>FAISS Index</div>
                <div style={s.cardSub}>Vector DB · IndexFlatIP</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Vectors</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-bright)' }}>{(vectors || 1248392).toLocaleString()}</div>
            </div>
          </div>
          <div style={s.faissGrid}>
            <div style={s.faissStat}>
              <div style={s.statLabel}>QUERY THROUGHPUT</div>
              <div style={s.statBig}>847<span style={s.statUnit}>q/s</span></div>
              <MiniBar />
            </div>
            <div style={s.faissStat}>
              <div style={s.statLabel}>SEARCH LATENCY</div>
              <div style={s.statBig}>3.2<span style={s.statUnit}>ms</span></div>
              <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 8 }}>▲ 12% vs baseline</div>
            </div>
          </div>
          <div style={s.pillRow}>
            <Pill label="512-dim" active />
            <Pill label="Flat IP" />
            <Pill label="Normalised" />
          </div>
        </div>

        {/* Embedding */}
        <div style={s.card}>
          <div style={{ marginBottom: 16 }}>
            <div style={s.cardTitle}>Embedding Engine</div>
            <div style={s.cardSub}>Multilingual text-embedding-ada-002</div>
          </div>
          <span style={{ ...s.badge, marginBottom: 16, display: 'inline-block', background: 'rgba(91,116,177,0.12)', color: 'var(--purple)', borderColor: 'rgba(91,116,177,0.3)' }}>ACTIVE</span>
          <div style={s.metaList}>
            {[
              ['Model',     'ada-002-proxy'],
              ['Tokens/min','128k'],
              ['Dimensions','1536'],
              ['Queue depth', docs > 0 ? '0' : '—'],
            ].map(([k, v]) => (
              <div key={k} style={s.metaRow}>
                <span style={s.metaKey}>{k}</span>
                <span style={s.metaVal}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Terminal */}
      <div style={s.terminal}>
        <div style={s.termHead}>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ ...s.termDot, background: '#ff5f57' }} />
            <div style={{ ...s.termDot, background: '#febc2e' }} />
            <div style={{ ...s.termDot, background: '#28c840' }} />
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 12 }}>aida-system-logs — real-time</span>
        </div>
        <div style={s.termBody} ref={termRef}>
          {logs.map((l, i) => (
            <div key={i} style={s.logLine}>
              <span style={s.logTime}>2026-04-04 {l.time}</span>
              <span style={{ ...s.logLevel, color: levelColor[l.level] }}>{l.level.padEnd(5)}</span>
              <span style={s.logMsg}>{l.msg}</span>
            </div>
          ))}
          <div style={s.logLine}><span style={{ ...s.logTime, color: 'var(--green)' }}>█</span></div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, pct, color }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ fontSize: 12, color, fontWeight: 600 }}>{value}</span>
      </div>
      <div style={{ background: 'var(--bg-card-alt)', height: 6, borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 6 }} />
      </div>
    </div>
  );
}

function StatNum({ num, label }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-bright)', fontFamily: 'var(--font-display)' }}>{num}</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function MiniBar() {
  const heights = [40, 60, 50, 80, 70, 30, 55, 90];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 32, marginTop: 12 }}>
      {heights.map((h, i) => (
        <div key={i} style={{ flex: 1, height: `${h}%`, background: i === heights.length - 1 ? 'rgba(78,222,163,0.3)' : 'var(--green)', borderRadius: '2px 2px 0 0' }} />
      ))}
    </div>
  );
}

function Pill({ label, active }) {
  return <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, background: active ? 'rgba(78,222,163,0.1)' : 'rgba(43,70,128,0.2)', color: active ? 'var(--green)' : 'var(--text-muted)' }}>{active ? '● ' : '● '}{label}</span>;
}

function TriangleIcon() { return <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 17L10 3l7 14H3z" stroke="var(--green)" strokeWidth="1.5" strokeLinejoin="round"/><path d="M6 13h8" stroke="var(--green)" strokeWidth="1.5"/></svg>; }

const s = {
  header:    { padding: '32px 32px 0', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 },
  title:     { fontSize: 32, fontWeight: 700, color: 'var(--text-bright)', letterSpacing: -1.5, fontFamily: 'var(--font-display)', marginBottom: 8 },
  sub:       { fontSize: 14, color: 'var(--text-muted)' },
  btnOutline:{ background: 'var(--bg-card)', border: 'none', borderRadius: 4, color: 'var(--green)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', padding: '10px 20px', cursor: 'pointer', fontFamily: 'var(--font-ui)' },
  grid:      { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, padding: '0 32px', marginBottom: 24 },
  card:      { background: 'var(--bg-card-deep)', borderRadius: 8, padding: 24 },
  cardHead:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  cardTitle: { fontSize: 15, color: 'var(--text-bright)', fontFamily: 'var(--font-display)', marginBottom: 2 },
  cardSub:   { fontSize: 11, color: 'var(--text-muted)' },
  badge:     { background: 'rgba(78,222,163,0.1)', color: 'var(--green)', fontSize: 10, padding: '3px 10px', borderRadius: 12, border: '1px solid rgba(78,222,163,0.3)' },
  statRow:   { display: 'flex', justifyContent: 'space-around', borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 },
  faissIcon: { width: 40, height: 40, background: 'rgba(78,222,163,0.08)', border: '1px solid rgba(78,222,163,0.2)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  faissGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '16px 0' },
  faissStat: { background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 4, padding: 16 },
  statLabel: { fontSize: 10, letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 8 },
  statBig:   { fontSize: 24, fontWeight: 700, color: 'var(--text-bright)', fontFamily: 'var(--font-display)' },
  statUnit:  { fontSize: 12, color: 'var(--text-muted)' },
  pillRow:   { display: 'flex', gap: 8 },
  metaList:  { borderTop: '1px solid var(--border)' },
  metaRow:   { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(30,41,59,0.3)' },
  metaKey:   { fontSize: 12, color: 'var(--text-muted)' },
  metaVal:   { fontSize: 12, color: 'var(--text-bright)' },
  terminal:  { margin: '0 32px 32px', background: 'var(--bg-card-deep)', borderRadius: 8, overflow: 'hidden' },
  termHead:  { background: 'var(--bg-card-alt)', padding: '10px 16px', display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border)' },
  termDot:   { width: 10, height: 10, borderRadius: '50%' },
  termBody:  { padding: '16px 24px', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 2, maxHeight: 320, overflowY: 'auto' },
  logLine:   { display: 'flex', gap: 16 },
  logTime:   { color: 'var(--purple)', flexShrink: 0 },
  logLevel:  { flexShrink: 0, fontWeight: 600 },
  logMsg:    { color: 'var(--text-muted)' },
};
