import React, { useState, useRef, useEffect } from 'react';
import { queryDocuments } from '../utils/api';

export default function WorkspacePage() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "AIDA online. I have access to your uploaded document corpus. Ask me to analyze threats, find entity relationships, summarize intelligence, or query specific document content.",
      citations: [],
    }
  ]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const msgEndRef              = useRef(null);
  const textareaRef            = useRef(null);

  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setLoading(true);
    try {
      const { data } = await queryDocuments(q);
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer, citations: data.citations || [] }]);
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Backend unreachable. Ensure the FastAPI server is running on port 8000.';
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠ Error: ${errMsg}`, citations: [] }]);
    }
    setLoading(false);
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const lastAI = [...messages].reverse().find(m => m.role === 'assistant' && m.citations?.length > 0);

  return (
    <div style={s.workspace}>
      {/* Chat panel */}
      <div style={s.chatPanel}>
        <div style={s.chatMessages}>
          <div style={s.tsDivider}>— Session started {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} —</div>
          {messages.map((m, i) => m.role === 'user' ? (
            <div key={i} style={s.userMsg}>
              <div style={s.userBubble}>
                <div style={s.msgText}>{m.content}</div>
                <div style={s.msgTime}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          ) : (
            <div key={i} style={s.aiMsg}>
              <div style={s.aiAvatar}>AI</div>
              <div style={s.aiBubble}>
                <div style={s.msgText}>{m.content}</div>
              </div>
            </div>
          ))}
          {loading && (
            <div style={s.aiMsg}>
              <div style={s.aiAvatar}>AI</div>
              <div style={s.aiBubble}><ThinkingDots /></div>
            </div>
          )}
          <div ref={msgEndRef} />
        </div>

        {/* Input */}
        <div style={s.inputArea}>
          <div style={s.inputLabel}>ASK AIDA — Connected to FastAPI RAG Backend</div>
          <div style={s.inputBox}>
            <AttachIcon />
            <textarea
              ref={textareaRef}
              style={s.textarea}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask AIDA about system logs, threats, or documentation…"
              rows={1}
            />
            <button style={{ ...s.sendBtn, opacity: loading || !input.trim() ? 0.5 : 1 }} onClick={send} disabled={loading || !input.trim()}>
              SEND →
            </button>
          </div>
        </div>
      </div>

      {/* Citation inspector */}
      <div style={s.citPanel}>
        <div style={s.citHeader}>
          <div style={s.citTitle}>Citation Inspector</div>
          <div style={s.citSub}>Retrieved context chunks</div>
        </div>
        <div style={s.citBody}>
          {lastAI?.citations?.length > 0 ? (
            lastAI.citations.map((c, i) => (
              <div key={i} style={s.chunk}>
                <span style={s.chunkTag}>CHUNK {i+1} · score: {c.score.toFixed(2)}</span>
                <div style={s.chunkText}>{c.text}</div>
                <div style={s.chunkSrc}>Source: {c.source}</div>
              </div>
            ))
          ) : (
            <div style={{ color: 'var(--text-dim)', fontSize: 12, padding: '24px 0', textAlign: 'center', lineHeight: 2 }}>
              No citations yet.<br />
              Ask a question to see retrieved context chunks from your uploaded documents.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ThinkingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '4px 0' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ width: 6, height: 6, background: 'var(--green)', borderRadius: '50%', animation: `thinking 1.2s ${i * 0.2}s infinite` }} />
      ))}
      <style>{`@keyframes thinking { 0%,80%,100%{opacity:.2;transform:scale(.8)} 40%{opacity:1;transform:scale(1)} }`}</style>
    </div>
  );
}

function AttachIcon() {
  return (
    <div style={{ flexShrink: 0, padding: 4, cursor: 'pointer' }}>
      <svg width="16" height="20" viewBox="0 0 16 20" fill="none"><path d="M3 18a5 5 0 01-2-4V6a7 7 0 0114 0v9a3 3 0 01-6 0V6a1 1 0 00-2 0v9a5 5 0 01-5 5z" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round"/></svg>
    </div>
  );
}

const s = {
  workspace:  { display: 'flex', height: '100%', overflow: 'hidden' },
  chatPanel:  { flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', overflow: 'hidden' },
  chatMessages: { flex: 1, overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 16 },
  tsDivider:  { textAlign: 'center', fontSize: 11, color: 'var(--text-dim)', padding: '8px 0' },
  userMsg:    { display: 'flex', justifyContent: 'flex-end' },
  userBubble: { background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(43,70,128,0.2)', borderRadius: 8, padding: '14px 16px', maxWidth: '80%' },
  aiMsg:      { display: 'flex', gap: 12 },
  aiAvatar:   { width: 32, height: 32, background: 'var(--bg-card-alt)', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--green)' },
  aiBubble:   { background: 'var(--bg-item)', border: '1px solid var(--border-card)', borderRadius: 8, padding: '14px 16px', flex: 1, maxWidth: '80%' },
  msgText:    { fontSize: 13, lineHeight: 1.7, color: 'var(--text-bright)', whiteSpace: 'pre-wrap' },
  msgTime:    { fontSize: 11, color: 'var(--text-dim)', marginTop: 8, textAlign: 'right' },
  inputArea:  { padding: '16px 32px 24px', borderTop: '1px solid var(--border)' },
  inputLabel: { fontSize: 10, color: 'var(--text-dim)', letterSpacing: 0.8, marginBottom: 8 },
  inputBox:   { background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(43,70,128,0.4)', borderRadius: 8, display: 'flex', alignItems: 'flex-end', padding: 12, gap: 8 },
  textarea:   { flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-bright)', fontSize: 13, fontFamily: 'var(--font-ui)', resize: 'none', minHeight: 24, maxHeight: 120, lineHeight: 1.5 },
  sendBtn:    { background: 'var(--green)', border: 'none', borderRadius: 4, padding: '8px 16px', cursor: 'pointer', color: '#004a31', fontWeight: 700, fontSize: 12, fontFamily: 'var(--font-ui)', flexShrink: 0, transition: 'all 0.15s' },
  citPanel:   { width: 380, minWidth: 380, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  citHeader:  { padding: '20px 24px', borderBottom: '1px solid var(--border)' },
  citTitle:   { fontSize: 16, color: 'var(--text-bright)', fontFamily: 'var(--font-display)', marginBottom: 2 },
  citSub:     { fontSize: 11, color: 'var(--text-muted)' },
  citBody:    { flex: 1, overflowY: 'auto', padding: '20px 24px' },
  chunk:      { marginBottom: 24 },
  chunkTag:   { fontSize: 9, letterSpacing: 1, background: 'rgba(78,222,163,0.1)', color: 'var(--green)', padding: '2px 8px', borderRadius: 2, display: 'inline-block', marginBottom: 8 },
  chunkText:  { background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 4, padding: 14, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 },
  chunkSrc:   { fontSize: 10, color: 'var(--text-dim)', marginTop: 6 },
};
