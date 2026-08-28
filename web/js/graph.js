/**
 * AIDA — Force-Directed Relational Knowledge Map (Canvas 60fps)
 * Visualizes cross-document entity networks, threat actors, IOCs, and clusters.
 * Supports both Light Executive and Dark Themes seamlessly.
 */

class IntelligenceGraph {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.nodes = [];
    this.edges = [];
    this.animId = null;

    // Viewport transforms (Pan & Zoom)
    this.scale = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.dragNode = null;
    this.lastMouse = { x: 0, y: 0 };
    this.hoverNode = null;
    this.selectedNode = null;
    this.activeFilter = 'all';

    // Physics parameters
    this.physicsEnabled = true;
    this.repulsion = 750;
    this.springLength = 85;
    this.damping = 0.88;

    this.initEvents();
    this.resize();

    window.addEventListener('resize', () => this.resize());
  }

  isDark() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.width = rect.width || 800;
    this.height = rect.height || 500;
    this.canvas.width = this.width * window.devicePixelRatio;
    this.canvas.height = this.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  setData(data) {
    const rawNodes = data.nodes || [];
    const rawEdges = data.edges || [];

    const W = this.width || 800;
    const H = this.height || 500;

    this.nodes = rawNodes.map((n, i) => {
      const angle = (i / Math.max(1, rawNodes.length)) * Math.PI * 2;
      const radius = 110 + Math.random() * 130;
      return {
        ...n,
        x: n.x ?? (W / 2 + Math.cos(angle) * radius),
        y: n.y ?? (H / 2 + Math.sin(angle) * radius),
        vx: 0,
        vy: 0,
        radius: n.size || 12,
        color: n.color || '#059669',
        pulse: Math.random() * Math.PI * 2,
      };
    });

    const nodeMap = new Map(this.nodes.map(n => [n.id, n]));

    this.edges = rawEdges
      .map(e => {
        const src = typeof e.source === 'object' ? e.source : nodeMap.get(e.source);
        const tgt = typeof e.target === 'object' ? e.target : nodeMap.get(e.target);
        return src && tgt ? { source: src, target: tgt, strength: e.strength || 0.5 } : null;
      })
      .filter(Boolean);

    this.start();
  }

  initEvents() {
    if (!this.canvas) return;

    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - this.panX) / this.scale;
      const mouseY = (e.clientY - rect.top - this.panY) / this.scale;

      const clicked = this.findNodeAt(mouseX, mouseY);
      if (clicked) {
        this.dragNode = clicked;
        this.selectedNode = clicked;
        if (window.soundEngine) window.soundEngine.playClick();
        this.onNodeClick(clicked);
      } else {
        this.isDragging = true;
      }
      this.lastMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - this.panX) / this.scale;
      const mouseY = (e.clientY - rect.top - this.panY) / this.scale;

      if (this.dragNode) {
        this.dragNode.x = mouseX;
        this.dragNode.y = mouseY;
        this.dragNode.vx = 0;
        this.dragNode.vy = 0;
      } else if (this.isDragging) {
        const dx = e.clientX - this.lastMouse.x;
        const dy = e.clientY - this.lastMouse.y;
        this.panX += dx;
        this.panY += dy;
        this.lastMouse = { x: e.clientX, y: e.clientY };
      } else {
        const hover = this.findNodeAt(mouseX, mouseY);
        this.hoverNode = hover;
        this.canvas.style.cursor = hover ? 'pointer' : 'grab';
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.dragNode = null;
      this.canvas.style.cursor = 'grab';
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.max(0.3, Math.min(3.0, this.scale * zoomFactor));

      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      this.panX = mouseX - (mouseX - this.panX) * (newScale / this.scale);
      this.panY = mouseY - (mouseY - this.panY) * (newScale / this.scale);
      this.scale = newScale;
    });
  }

  findNodeAt(x, y) {
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const n = this.nodes[i];
      if (this.activeFilter !== 'all' && n.type !== this.activeFilter && n.type !== 'document') continue;
      const dist = Math.hypot(n.x - x, n.y - y);
      if (dist <= n.radius + 6) return n;
    }
    return null;
  }

  onNodeClick(node) {
    if (window.app && window.app.showEntityInspector) {
      window.app.showEntityInspector(node);
    }
  }

  setFilter(filterType) {
    this.activeFilter = filterType;
  }

  resetView() {
    this.scale = 1.0;
    this.panX = 0;
    this.panY = 0;
    const W = this.width || 800;
    const H = this.height || 500;
    this.nodes.forEach((n, i) => {
      const angle = (i / Math.max(1, this.nodes.length)) * Math.PI * 2;
      const radius = 110 + Math.random() * 110;
      n.x = W / 2 + Math.cos(angle) * radius;
      n.y = H / 2 + Math.sin(angle) * radius;
      n.vx = 0;
      n.vy = 0;
    });
  }

  updatePhysics() {
    if (!this.physicsEnabled) return;

    const W = this.width || 800;
    const H = this.height || 500;
    const cx = W / 2;
    const cy = H / 2;

    // Center Gravity
    for (const n of this.nodes) {
      const dx = cx - n.x;
      const dy = cy - n.y;
      n.vx += dx * 0.0005;
      n.vy += dy * 0.0005;
    }

    // Node Repulsion (Coulomb)
    for (let i = 0; i < this.nodes.length; i++) {
      const na = this.nodes[i];
      for (let j = i + 1; j < this.nodes.length; j++) {
        const nb = this.nodes[j];
        const dx = na.x - nb.x;
        const dy = na.y - nb.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < 300) {
          const force = (this.repulsion / (dist * dist));
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          na.vx += fx;
          na.vy += fy;
          nb.vx -= fx;
          nb.vy -= fy;
        }
      }
    }

    // Edge Springs (Hooke)
    for (const edge of this.edges) {
      const na = edge.source;
      const nb = edge.target;
      const dx = nb.x - na.x;
      const dy = nb.y - na.y;
      const dist = Math.hypot(dx, dy) || 1;
      const force = (dist - this.springLength) * 0.015 * edge.strength;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      na.vx += fx;
      na.vy += fy;
      nb.vx -= fx;
      nb.vy -= fy;
    }

    // Position updates with Damping
    for (const n of this.nodes) {
      if (n === this.dragNode) continue;
      n.vx *= this.damping;
      n.vy *= this.damping;
      n.x += n.vx;
      n.y += n.vy;
      n.pulse += 0.03;
    }
  }

  draw() {
    const ctx = this.ctx;
    const W = this.width;
    const H = this.height;
    const dark = this.isDark();

    ctx.clearRect(0, 0, W, H);

    // Canvas Background
    ctx.fillStyle = dark ? '#040a17' : '#ffffff';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.scale, this.scale);

    // Draw Edges
    for (const edge of this.edges) {
      const na = edge.source;
      const nb = edge.target;

      const isFiltA = this.activeFilter === 'all' || na.type === this.activeFilter || na.type === 'document';
      const isFiltB = this.activeFilter === 'all' || nb.type === this.activeFilter || nb.type === 'document';
      if (!isFiltA || !isFiltB) continue;

      const isConnected = this.selectedNode && (this.selectedNode === na || this.selectedNode === nb);

      ctx.beginPath();
      ctx.moveTo(na.x, na.y);
      ctx.lineTo(nb.x, nb.y);
      ctx.strokeStyle = isConnected 
        ? (dark ? 'rgba(78, 222, 163, 0.8)' : 'rgba(5, 150, 105, 0.8)')
        : (dark ? 'rgba(70, 110, 180, 0.3)' : 'rgba(203, 213, 225, 0.8)');
      ctx.lineWidth = isConnected ? 2.0 : 1.0;
      ctx.stroke();

      // Particle pulse along edge
      if (isConnected || Math.random() < 0.05) {
        const time = Date.now() * 0.001;
        const progress = (time % 1);
        const px = na.x + (nb.x - na.x) * progress;
        const py = na.y + (nb.y - na.y) * progress;
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = dark ? '#4edea3' : '#059669';
        ctx.fill();
      }
    }

    // Draw Nodes
    for (const n of this.nodes) {
      if (this.activeFilter !== 'all' && n.type !== this.activeFilter && n.type !== 'document') continue;

      const isHover = this.hoverNode === n;
      const isSelected = this.selectedNode === n;
      const pulseSize = Math.sin(n.pulse) * 1.5;

      // Glow halo
      ctx.beginPath();
      ctx.arc(n.x, n.y, (n.radius + pulseSize) * 2.0, 0, Math.PI * 2);
      ctx.fillStyle = isSelected 
        ? (dark ? 'rgba(78, 222, 163, 0.35)' : 'rgba(5, 150, 105, 0.2)') 
        : n.color + (dark ? '25' : '15');
      ctx.fill();

      // Node Body
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius + (isHover ? 3 : 0), 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? (dark ? '#4edea3' : '#059669') : n.color;
      ctx.fill();
      ctx.lineWidth = isSelected || isHover ? 2.5 : 1.5;
      ctx.strokeStyle = dark ? '#040a17' : '#ffffff';
      ctx.stroke();

      // Label text
      ctx.font = `${isSelected || isHover ? '700 11px' : '600 10px'} 'Plus Jakarta Sans', sans-serif`;
      ctx.fillStyle = isSelected || isHover 
        ? (dark ? '#ffffff' : '#0f172a') 
        : (dark ? '#94a3b8' : '#475569');
      ctx.textAlign = 'center';
      ctx.fillText(n.label, n.x, n.y + n.radius + 14);
    }

    ctx.restore();
  }

  start() {
    if (this.animId) cancelAnimationFrame(this.animId);
    const loop = () => {
      this.updatePhysics();
      this.draw();
      this.animId = requestAnimationFrame(loop);
    };
    loop();
  }

  stop() {
    if (this.animId) cancelAnimationFrame(this.animId);
  }
}

window.IntelligenceGraph = IntelligenceGraph;
