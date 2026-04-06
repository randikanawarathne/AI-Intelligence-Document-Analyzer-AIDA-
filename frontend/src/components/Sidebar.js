import React from 'react';
import { NavLink } from 'react-router-dom';

const NAV = [
  { to: '/dashboard',  label: 'Dashboard',      icon: <GridIcon /> },
  { to: '/systems',    label: 'Systems',         icon: <CogIcon /> },
  { to: '/intel',      label: 'Intel',           icon: <HexIcon />, highlight: true },
  { to: '/knowledge',  label: 'Knowledge Base',  icon: <FileIcon /> },
  { to: '/workspace',  label: 'Workspace',       icon: <ChartIcon /> },
];

export default function Sidebar({ systemOk }) {
  return (
    <aside style={styles.aside}>
      {/* Brand */}
      <div style={styles.brand}>
        <div style={styles.brandIcon}>A</div>
        <div>
          <div style={styles.brandName}>AIDA</div>
          <div style={styles.brandSub}>System Intelligence</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={styles.nav}>
        {NAV.map(({ to, label, icon, highlight }) => (
          <NavLink key={to} to={to} style={({ isActive }) => ({ ...styles.navItem, ...(isActive ? styles.navActive : {}), ...(highlight && !isActive ? {} : {}) })}>
            {({ isActive }) => (
              <>
                <span style={{ ...styles.navIcon, color: isActive ? 'var(--green-dim)' : 'var(--text-muted)' }}>{icon}</span>
                <span style={{ color: isActive ? 'var(--green-dim)' : 'var(--text-muted)' }}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={styles.footer}>
        <div style={styles.statusRow}>
          <span style={{ ...styles.dot, background: systemOk ? 'var(--green-dim)' : 'var(--red)', boxShadow: systemOk ? '0 0 6px var(--green-dim)' : 'none' }} />
          <span style={styles.statusText}>{systemOk ? 'FastAPI Connected' : 'API Offline'}</span>
        </div>
        <div style={styles.footLink}><SettingsIcon /><span>Settings</span></div>
        <div style={styles.footLink}><LogoutIcon /><span>Log out</span></div>
      </div>
    </aside>
  );
}

const styles = {
  aside:      { width: 256, minWidth: 256, background: 'var(--bg-surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0 },
  brand:      { padding: '24px 16px', display: 'flex', alignItems: 'center', gap: 12 },
  brandIcon:  { width: 32, height: 32, background: 'var(--green)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: '#004a31', fontFamily: 'var(--font-display)' },
  brandName:  { fontSize: 22, fontWeight: 700, color: 'var(--text-bright)', letterSpacing: -1, fontFamily: 'var(--font-display)' },
  brandSub:   { fontSize: 10, color: 'var(--green-dim)', letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'var(--font-ui)' },
  nav:        { padding: '0 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  navItem:    { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 4, textDecoration: 'none', fontSize: 14, transition: 'background 0.15s' },
  navActive:  { background: 'rgba(15,23,42,0.7)' },
  navIcon:    { width: 18, height: 18, flexShrink: 0 },
  footer:     { borderTop: '1px solid var(--border)', padding: '16px 16px 20px' },
  statusRow:  { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 },
  dot:        { width: 8, height: 8, borderRadius: '50%', flexShrink: 0, transition: 'all 0.3s' },
  statusText: { fontSize: 11, color: 'var(--green-dim)', letterSpacing: 0.5 },
  footLink:   { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer' },
};

function GridIcon() { return <svg viewBox="0 0 18 18" fill="none" width="100%" height="100%"><rect x="1" y="1" width="7" height="7" rx="1" fill="currentColor" opacity=".7"/><rect x="10" y="1" width="7" height="7" rx="1" fill="currentColor" opacity=".7"/><rect x="1" y="10" width="7" height="7" rx="1" fill="currentColor" opacity=".7"/><rect x="10" y="10" width="7" height="7" rx="1" fill="currentColor" opacity=".7"/></svg>; }
function CogIcon() { return <svg viewBox="0 0 18 18" fill="none" width="100%" height="100%"><circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.22 3.22l1.41 1.41M13.36 13.36l1.41 1.41M3.22 14.78l1.41-1.41M13.36 4.64l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>; }
function HexIcon() { return <svg viewBox="0 0 18 18" fill="none" width="100%" height="100%"><path d="M9 1L1 5v8l8 4 8-4V5L9 1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M1 5l8 4 8-4M9 9v8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>; }
function FileIcon() { return <svg viewBox="0 0 18 18" fill="none" width="100%" height="100%"><path d="M3 2h8l4 4v10H3V2z" stroke="currentColor" strokeWidth="1.5"/><path d="M11 2v4h4" stroke="currentColor" strokeWidth="1.5"/><path d="M6 9h6M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>; }
function ChartIcon() { return <svg viewBox="0 0 18 18" fill="none" width="100%" height="100%"><path d="M1 14L5 7l4 5 3-4 5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function SettingsIcon() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M9 1v2M9 15v2M1 9h2M15 9h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>; }
function LogoutIcon() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M12 13l5-4-5-4M7 9h10M7 3H3a1 1 0 00-1 1v10a1 1 0 001 1h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
