import React, { useRef, useEffect } from 'react';

const COLORS = ['#4edea3', '#34d399', '#5b74b1', '#ee7d77', '#91aaeb'];

export default function NetworkGraph({ nodeCount = 1248 }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const stateRef  = useRef({ nodes: [], edges: [], W: 0, H: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const init = () => {
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      canvas.width  = W;
      canvas.height = H;
      const N = 50;
      const nodes = Array.from({ length: N }, () => ({
        x: 60 + Math.random() * (W - 120),
        y: 60 + Math.random() * (H - 120),
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: 3 + Math.random() * 7,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        phase: Math.random() * Math.PI * 2,
      }));
      const edges = [];
      for (let i = 0; i < N; i++) {
        const k = 1 + Math.floor(Math.random() * 3);
        for (let j = 0; j < k; j++) {
          const t = Math.floor(Math.random() * N);
          if (t !== i) edges.push([i, t]);
        }
      }
      stateRef.current = { nodes, edges, W, H };
    };

    const draw = () => {
      const { nodes, edges, W, H } = stateRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, W, H);

      // Dark bg
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);

      // Radial glow
      const grd = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.6);
      grd.addColorStop(0, 'rgba(43,70,128,0.25)');
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);

      // Move
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < n.r || n.x > W - n.r) n.vx *= -1;
        if (n.y < n.r || n.y > H - n.r) n.vy *= -1;
        n.phase += 0.018;
      });

      // Edges
      edges.forEach(([a, b]) => {
        const na = nodes[a], nb = nodes[b];
        const d = Math.hypot(na.x - nb.x, na.y - nb.y);
        if (d < 220) {
          ctx.beginPath();
          ctx.moveTo(na.x, na.y);
          ctx.lineTo(nb.x, nb.y);
          ctx.strokeStyle = `rgba(91,116,177,${(1 - d / 220) * 0.35})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      });

      // Nodes
      nodes.forEach(n => {
        const pulse = Math.sin(n.phase) * 0.25 + 0.85;
        // Glow
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = n.color + '18';
        ctx.fill();
        // Core
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * pulse, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.globalAlpha = 0.85;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      animRef.current = requestAnimationFrame(draw);
    };

    init();
    draw();

    const ro = new ResizeObserver(() => { init(); });
    ro.observe(canvas);
    return () => { cancelAnimationFrame(animRef.current); ro.disconnect(); };
  }, []);

  return (
    <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      {/* Tooltip chip */}
      <div style={chip}>
        <span style={{ color: 'var(--green)', fontSize: 10 }}>●</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 0.5 }}>
          {nodeCount.toLocaleString()} nodes active
        </span>
      </div>
    </div>
  );
}

const chip = { position: 'absolute', bottom: 24, right: 24, background: 'rgba(5,24,60,0.7)', backdropFilter: 'blur(6px)', border: '1px solid rgba(43,70,128,0.25)', borderRadius: 8, padding: '8px 14px', display: 'flex', gap: 8, alignItems: 'center' };
