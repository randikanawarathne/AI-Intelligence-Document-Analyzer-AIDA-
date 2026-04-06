import React from 'react';
import { useLocation, Link } from 'react-router-dom';

const LINKS = [
  { to: '/systems',   label: 'Systems' },
  { to: '/intel',     label: 'Intel' },
  { to: '/workspace', label: 'Workspace' },
];

export default function Topbar() {
  const { pathname } = useLocation();

  return (
    <header style={s.bar}>
      <div style={s.left}>
        <div style={s.searchWrap}>
          <SearchIcon />
          <input style={s.input} placeholder="QUERY ENTITIES..." />
        </div>
        <nav style={s.nav}>
          {LINKS.map(({ to, label }) => {
            const active = pathname.startsWith(to);
            return (
              <Link key={to} to={to} style={{ ...s.link, ...(active ? s.linkActive : {}) }}>
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div style={s.right}>
        <BellIcon />
        <span style={s.userName}>ADMIN_NODE_01</span>
        <div style={s.avatar}>AN</div>
      </div>
    </header>
  );
}

const s = {
  bar:       { height: 64, minHeight: 64, background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', position: 'sticky', top: 0, zIndex: 20 },
  left:      { display: 'flex', alignItems: 'center', gap: 24 },
  searchWrap:{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card-alt)', borderRadius: 4, padding: '6px 14px', width: 300 },
  input:     { background: 'none', border: 'none', outline: 'none', color: 'var(--text-muted)', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', width: '100%', fontFamily: 'var(--font-ui)' },
  nav:       { display: 'flex', gap: 32, marginLeft: 8 },
  link:      { fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--text-muted)', textDecoration: 'none', paddingBottom: 4 },
  linkActive:{ color: 'var(--green)', borderBottom: '2px solid var(--green)' },
  right:     { display: 'flex', alignItems: 'center', gap: 14 },
  userName:  { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: '#cbd5e1' },
  avatar:    { width: 32, height: 32, background: 'var(--bg-card-alt)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--green)' },
};

function SearchIcon() { return <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="5" cy="5" r="4" stroke="#6b7280" strokeWidth="1.5"/><path d="M9 9l2 2" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round"/></svg>; }
function BellIcon()   { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{color:'var(--text-muted)'}}><path d="M9 2a6 6 0 016 6v3l1.5 2.5H1.5L3 11V8a6 6 0 016-6zM7 15.5a2 2 0 004 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>; }
