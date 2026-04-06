import React, { useState } from 'react';
import NetworkGraph from '../components/NetworkGraph';

const ALERTS = [
  { tag: 'High Risk Breach', color: 'var(--red)',    bg: 'var(--red)',    time: '2m ago',  title: 'Financial Anomaly Detected',   body: "Unusual transaction patterns identified in 'Project Bluebird' documents matching known fraud vectors.", link: 'VIEW INVESTIGATION' },
  { tag: 'Entity Linkage',   color: 'var(--green)',  bg: 'var(--green)',  time: '14m ago', title: 'Threat Actor Association',     body: "Found 12 matching signatures between 'Internal Audit' and 'External Intel' datasets.",                  link: 'REVIEW MATCHES' },
  { tag: 'Inference Warning',color: 'var(--purple)', bg: 'var(--purple)', time: '1h ago',  title: 'Low Confidence Clustering',    body: "Clusters in 'Department_B' have high ambiguity. Manual verification recommended.",                        link: null },
];

const BARS = [
  { label: 'Organizations', val: 428, pct: 85, color: 'var(--green)' },
  { label: 'People',        val: 156, pct: 45, color: '#3cd096' },
  { label: 'Locations',     val: 89,  pct: 25, color: 'var(--purple)' },
  { label: 'Threats',       val: 32,  pct: 12, color: 'var(--red)' },
];

const SUMMARIES = [
  { badge: 'Strategic Insight',      title: 'Cross-Regional Correlation',    body: 'Detected high overlap in operational nodes between APAC and EMEA intelligence sets regarding semiconductor procurement.' },
  { badge: 'Structural Analysis',    title: 'Hierarchy Re-classification',   body: "System suggests moving 'Entity_X' from Subsidiary to Key Controlling Stakeholder based on newly ingested financial records." },
  { badge: 'Vulnerability Assessment', title: 'Logistical Weakness Identified', body: 'Supply chain routes in Document_A-4 reveal single-point-of-failure vulnerabilities in Northern shipping lanes.' },
  { badge: 'Predictive Trend',       title: 'Acquisition Probability',       body: "Increasing sentiment linkages between 'Comp_Alpha' and 'Comp_Beta' suggest a 72% probability of partnership announcement." },
];

export default function IntelPage() {
  const [scanning, setScanning] = useState(false);
  const [nodes, setNodes] = useState(1248);

  const runScan = () => {
    setScanning(true);
    setTimeout(() => { setScanning(false); setNodes(n => n + Math.floor(Math.random() * 80)); }, 2500);
  };

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Intel View</h1>
          <p style={s.sub}>Visualizing cross-document entity relationships and AI-synthesized intelligence nodes across the current ingestion set.</p>
        </div>
        <div style={s.actions}>
          <button style={s.btnOutline}>EXPORT REPORT</button>
          <button style={{ ...s.btnPrimary, opacity: scanning ? 0.6 : 1 }} onClick={runScan} disabled={scanning}>
            {scanning ? 'SCANNING…' : 'RUN DEEP SCAN'}
          </button>
        </div>
      </div>

      {/* Bento grid */}
      <div style={s.bento}>
        {/* Knowledge Map — spans 8 cols, row 1 */}
        <div style={{ ...s.card, gridColumn: '1 / span 8', height: 480, padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#000' }}>
          <div style={s.kmHeader}>
            <div>
              <div style={s.cardTitle}>Knowledge Map</div>
              <div style={s.cardSub}>Relational Topology v4.2</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={s.badgeGreen}>LIVE_LINK</span>
              <span style={s.badgeBlue}>NODES: {nodes.toLocaleString()}</span>
            </div>
          </div>
          <NetworkGraph nodeCount={nodes} />
        </div>

        {/* Alerts — spans 4 cols, row 1 */}
        <div style={{ ...s.card, gridColumn: '9 / span 4' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <span style={{ color: 'var(--red)', fontSize: 18 }}>⚠</span>
            <div style={s.cardTitle}>Critical Alerts</div>
            <span style={{ marginLeft: 'auto', background: 'var(--red-bg)', color: 'var(--red-text)', fontSize: 9, padding: '2px 8px', borderRadius: 12, letterSpacing: 1 }}>04 ACTIVE</span>
          </div>
          {ALERTS.map((a, i) => (
            <div key={i} style={{ ...s.alertItem, borderLeftColor: a.bg }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: a.color }}>{a.tag}</span>
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{a.time}</span>
              </div>
              <div style={s.alertTitle}>{a.title}</div>
              <div style={s.alertBody}>{a.body}</div>
              {a.link && <div style={s.alertLink}>{a.link} →</div>}
            </div>
          ))}
          <div style={s.viewAllBtn}>VIEW ALL INCIDENT LOGS</div>
        </div>

        {/* Bar chart — spans 5 cols, row 2 */}
        <div style={{ ...s.card, gridColumn: '1 / span 5' }}>
          <div style={s.cardTitle}>Entity Distribution</div>
          <div style={{ ...s.cardSub, marginBottom: 24 }}>By document volume</div>
          {BARS.map((b, i) => (
            <div key={i} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-bright)' }}>{b.label}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.val}</span>
              </div>
              <div style={s.barTrack}>
                <div style={{ ...s.barFill, width: `${b.pct}%`, background: b.color }} />
              </div>
            </div>
          ))}
        </div>

        {/* Summaries — spans 7 cols, row 2 */}
        <div style={{ ...s.card, gridColumn: '6 / span 7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <div style={s.cardTitle}>Intelligence Summaries</div>
              <div style={s.cardSub}>AI-Generated Insights</div>
            </div>
            <button style={s.refreshBtn}>REFRESH FEED</button>
          </div>
          <div style={s.intelGrid}>
            {SUMMARIES.map((sm, i) => (
              <div key={i} style={s.intelCard}>
                <div style={s.intelBadge}>{sm.badge}</div>
                <div style={s.intelTitle}>{sm.title}</div>
                <div style={s.intelBody}>{sm.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page:       { overflowY: 'auto', flex: 1 },
  header:     { padding: '32px 32px 0', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' },
  title:      { fontSize: 32, fontWeight: 700, color: 'var(--text-bright)', letterSpacing: -1.5, fontFamily: 'var(--font-display)', marginBottom: 8 },
  sub:        { fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 580 },
  actions:    { display: 'flex', gap: 12, alignItems: 'center' },
  btnOutline: { background: 'var(--bg-card)', border: 'none', borderRadius: 4, color: 'var(--green)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', padding: '10px 20px', cursor: 'pointer', fontFamily: 'var(--font-ui)' },
  btnPrimary: { background: 'linear-gradient(to right, var(--green), #005236)', border: 'none', borderRadius: 4, color: '#004a31', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', padding: '10px 20px', cursor: 'pointer', fontWeight: 700, fontFamily: 'var(--font-ui)' },
  bento:      { display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 20, padding: '24px 32px 40px' },
  card:       { background: 'var(--bg-card-deep)', borderRadius: 8, padding: 24 },
  cardTitle:  { fontSize: 16, color: 'var(--text-bright)', fontFamily: 'var(--font-display)', marginBottom: 2 },
  cardSub:    { fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase' },
  kmHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: 24 },
  badgeGreen: { fontSize: 10, padding: '3px 10px', borderRadius: 2, letterSpacing: 0.8, background: 'rgba(78,222,163,0.1)', border: '1px solid rgba(78,222,163,0.3)', color: 'var(--green)' },
  badgeBlue:  { fontSize: 10, padding: '3px 10px', borderRadius: 2, letterSpacing: 0.8, background: 'var(--bg-card-alt)', border: '1px solid rgba(43,70,128,0.4)', color: 'var(--text-muted)' },
  alertItem:  { borderLeft: '2px solid', borderRadius: 4, padding: '14px 16px', background: 'var(--bg-card-alt)', marginBottom: 12 },
  alertTitle: { fontSize: 13, color: 'var(--text-bright)', margin: '4px 0' },
  alertBody:  { fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 },
  alertLink:  { fontSize: 10, color: 'var(--green)', letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', marginTop: 8 },
  viewAllBtn: { border: '1px solid rgba(43,70,128,0.3)', borderRadius: 4, padding: 12, textAlign: 'center', marginTop: 4, fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1, cursor: 'pointer' },
  barTrack:   { background: 'var(--bg-card-alt)', height: 8, borderRadius: 12, overflow: 'hidden' },
  barFill:    { height: '100%', borderRadius: 12, transition: 'width 1s ease' },
  refreshBtn: { background: 'none', border: 'none', color: 'var(--green)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'var(--font-ui)' },
  intelGrid:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  intelCard:  { background: 'var(--bg-item)', border: '1px solid var(--border-card)', borderRadius: 4, padding: 16 },
  intelBadge: { fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  intelTitle: { fontSize: 13, color: 'var(--text-bright)', marginBottom: 6 },
  intelBody:  { fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 },
};
