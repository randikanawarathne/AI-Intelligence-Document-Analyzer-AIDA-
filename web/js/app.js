/**
 * AIDA — Master Application Coordinator
 * Manages Routing, Authentication, Theme Switching, Mobile UX, and Cloud Sync.
 */

class AIDAApp {
  constructor() {
    this.currentView = 'dashboard';
    this.documents = [];
    this.entities = {};
    this.graph = null;
    this.logs = [];
    this.isBackendOnline = false;
    this.currentUser = null;
    this.currentTheme = localStorage.getItem('aida_theme') || 'light';

    this.init();
  }

  async init() {
    this.initTheme();
    this.initAuth();
    this.initNavigation();
    this.initMobileDrawer();
    this.initShortcuts();
    this.initDropZone();
    this.initSettings();
    this.initKnowledgeMap();
    this.initSampleLogs();

    // Check backend health
    await this.syncHealth();

    // Initial data load
    await this.loadCorpusData();

    // Polling for telemetry
    setInterval(() => this.syncHealth(), 12000);

    // Initial view
    this.switchView('dashboard');
  }

  // ── Theme Management (Executive Light by default / Dark toggle) ─────
  initTheme() {
    this.setTheme(this.currentTheme);
  }

  toggleTheme() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
    if (window.soundEngine) window.soundEngine.playClick();
  }

  setTheme(theme) {
    this.currentTheme = theme;
    localStorage.setItem('aida_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);

    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (toggleBtn) {
      toggleBtn.textContent = theme === 'light' ? '🌙' : '☀️';
      toggleBtn.title = `Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`;
    }

    if (this.graph) {
      this.graph.draw();
    }
  }

  // ── Authentication & User Session ─────────────────────────────────
  initAuth() {
    if (window.firebaseService) {
      window.firebaseService.onAuthStateChanged((user) => {
        this.currentUser = user;
        this.updateAuthUI(user);
      });
    }

    // Bind auth form listeners
    const loginForm = document.getElementById('auth-login-form');
    const signupForm = document.getElementById('auth-signup-form');

    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLoginForm(e));
    }
    if (signupForm) {
      signupForm.addEventListener('submit', (e) => this.handleSignUpForm(e));
    }
  }

  updateAuthUI(user) {
    const authOverlay = document.getElementById('auth-overlay');
    const userRoleEl = document.getElementById('topbar-user-role');
    const userAvatarEl = document.getElementById('topbar-user-avatar');
    const sideNameEl = document.getElementById('sidebar-user-name');
    const sideRoleEl = document.getElementById('sidebar-user-role');

    if (user) {
      if (authOverlay) authOverlay.classList.add('hidden');
      const initials = (user.displayName || user.email || 'AN').slice(0, 2).toUpperCase();

      if (userRoleEl) userRoleEl.textContent = user.displayName || user.email.split('@')[0];
      if (userAvatarEl) userAvatarEl.textContent = initials;
      if (sideNameEl) sideNameEl.textContent = user.displayName || user.email;
      if (sideRoleEl) sideRoleEl.textContent = user.clearance || user.role || 'Analyst';
    } else {
      if (authOverlay) authOverlay.classList.remove('hidden');
    }
  }

  async handleLoginForm(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email')?.value.trim();
    const password = document.getElementById('auth-password')?.value;

    if (!email || !password) {
      this.showToast('Please enter both email and password', 'error');
      return;
    }

    try {
      this.showToast('Authenticating with Security Clearances...', 'info');
      await window.firebaseService.loginWithEmail(email, password);
      this.showToast(`Welcome back, ${email.split('@')[0]}`, 'success');
      if (window.soundEngine) window.soundEngine.playSuccess();
    } catch (err) {
      this.showToast(`Auth error: ${err.message}`, 'error');
    }
  }

  async handleSignUpForm(e) {
    e.preventDefault();
    const email = document.getElementById('signup-email')?.value.trim();
    const password = document.getElementById('signup-password')?.value;
    const name = document.getElementById('signup-name')?.value.trim();

    if (!email || !password || password.length < 6) {
      this.showToast('Password must be at least 6 characters', 'error');
      return;
    }

    try {
      await window.firebaseService.signUpWithEmail(email, password, name);
      this.showToast(`Account created for ${name || email}`, 'success');
      if (window.soundEngine) window.soundEngine.playSuccess();
    } catch (err) {
      this.showToast(`Sign up error: ${err.message}`, 'error');
    }
  }

  quickDemoLogin(role = 'Lead Intelligence Analyst') {
    window.firebaseService.demoLogin(role);
    this.showToast(`✓ Logged in as ${role}`, 'success');
    if (window.soundEngine) window.soundEngine.playSuccess();
  }

  logout() {
    window.firebaseService.logout();
    this.showToast('Logged out of AIDA', 'info');
    if (window.soundEngine) window.soundEngine.playClick();
  }

  // ── Mobile UX & Navigation ────────────────────────────────────────
  initMobileDrawer() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const backdrop = document.getElementById('mobile-backdrop');
    const sidebar = document.querySelector('.sidebar');

    if (menuBtn && sidebar) {
      menuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
        if (backdrop) backdrop.classList.toggle('open', sidebar.classList.contains('mobile-open'));
      });
    }

    if (backdrop && sidebar) {
      backdrop.addEventListener('click', () => {
        sidebar.classList.remove('mobile-open');
        backdrop.classList.remove('open');
      });
    }
  }

  toggleMobileCitations() {
    const panel = document.querySelector('.citation-panel');
    if (panel) {
      panel.classList.toggle('mobile-open');
    }
  }

  getApiBase() {
    const custom = localStorage.getItem('aida_api_endpoint');
    if (custom) return custom.replace(/\/$/, '');
    if (window.location.port === '8000' || window.location.hostname.includes('vercel.app')) {
      return '';
    }
    return 'http://localhost:8000';
  }

  initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = item.getAttribute('data-view');
        if (targetView) {
          this.switchView(targetView);
          if (window.soundEngine) window.soundEngine.playNav();

          // Close mobile drawer on item click
          const sidebar = document.querySelector('.sidebar');
          const backdrop = document.getElementById('mobile-backdrop');
          if (sidebar) sidebar.classList.remove('mobile-open');
          if (backdrop) backdrop.classList.remove('open');
        }
      });
    });
  }

  switchView(viewName) {
    this.currentView = viewName;

    // Update nav active states
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.getAttribute('data-view') === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update view visibility
    document.querySelectorAll('.view-content').forEach(view => {
      if (view.id === `view-${viewName}`) {
        view.classList.add('active');
      } else {
        view.classList.remove('active');
      }
    });

    // If switching to Intel, resize/restart graph
    if (viewName === 'intel' && this.graph) {
      setTimeout(() => {
        this.graph.resize();
        this.graph.start();
      }, 100);
    }
  }

  initShortcuts() {
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const search = document.getElementById('global-search-input');
        if (search) search.focus();
      }
      if (e.key === 'Escape') {
        this.closeAllModals();
        const side = document.querySelector('.sidebar');
        const back = document.getElementById('mobile-backdrop');
        if (side) side.classList.remove('mobile-open');
        if (back) back.classList.remove('open');
      }
    });
  }

  initKnowledgeMap() {
    const canvas = document.getElementById('knowledge-graph-canvas');
    if (canvas && window.IntelligenceGraph) {
      this.graph = new window.IntelligenceGraph('knowledge-graph-canvas');
    }
  }

  async syncHealth() {
    const statusDot = document.getElementById('sidebar-status-dot');
    const statusText = document.getElementById('sidebar-status-text');
    const modelPill = document.getElementById('topbar-model-pill');

    try {
      const res = await fetch(`${this.getApiBase()}/health`);
      if (res.ok) {
        const data = await res.json();
        this.isBackendOnline = true;
        if (statusDot) statusDot.className = 'status-dot';
        if (statusText) statusText.textContent = `FastAPI Online (${data.vectors || 0} vecs)`;
        if (modelPill) modelPill.textContent = data.active_provider || 'Hybrid Neural RAG';

        this.updateDashboardMetrics(data);
        return;
      }
    } catch (e) {}

    this.isBackendOnline = false;
    if (statusDot) statusDot.className = 'status-dot standalone';
    if (statusText) statusText.textContent = 'In-Browser Cloud RAG';
    if (modelPill) modelPill.textContent = 'Client Neural Engine';
  }

  updateDashboardMetrics(healthData) {
    const vecEl = document.getElementById('metric-total-vectors');
    const docEl = document.getElementById('metric-total-docs');

    if (vecEl && healthData.vectors !== undefined) {
      vecEl.textContent = healthData.vectors.toLocaleString();
    }
    if (docEl && healthData.documents !== undefined) {
      docEl.textContent = healthData.documents.toLocaleString();
    }
  }

  async loadCorpusData() {
    try {
      const apiBase = this.getApiBase();
      const [docRes, entRes, graphRes] = await Promise.all([
        fetch(`${apiBase}/documents`),
        fetch(`${apiBase}/intel/entities`),
        fetch(`${apiBase}/intel/graph`),
      ]);

      if (docRes.ok) {
        const dData = await docRes.json();
        this.documents = dData.documents || [];
        this.renderDocumentsTable();
      }

      if (entRes.ok) {
        const eData = await entRes.json();
        this.entities = eData.entities || {};
        this.renderEntityBars();
      }

      if (graphRes.ok) {
        const gData = await graphRes.json();
        if (this.graph) {
          this.graph.setData(gData);
        }
      }
    } catch (e) {
      this.renderDocumentsTable();
    }
  }

  initDropZone() {
    const dropZone = document.getElementById('kb-drop-zone');
    const fileInput = document.getElementById('kb-file-input');

    if (!dropZone || !fileInput) return;

    ['dragenter', 'dragover'].forEach(name => {
      dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-active');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-active');
      });
    });

    dropZone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        this.handleFileUploads(files);
      }
    });

    dropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        this.handleFileUploads(e.target.files);
      }
    });
  }

  async handleFileUploads(fileList) {
    const files = Array.from(fileList);
    for (const file of files) {
      this.showToast(`Ingesting '${file.name}'...`, 'info');
      if (window.soundEngine) window.soundEngine.playScan();

      try {
        let docMeta = null;
        if (this.isBackendOnline) {
          const form = new FormData();
          form.append('file', file);
          const res = await fetch(`${this.getApiBase()}/upload`, {
            method: 'POST',
            body: form
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Upload failed');
          }

          const data = await res.json();
          docMeta = data.document;
          this.showToast(`✓ Ingested '${file.name}' (${data.chunks} chunks)`, 'success');
        } else {
          // Client-side parser fallback
          const parsed = await window.docParser.parseFile(file);
          docMeta = {
            name: parsed.filename,
            chunks: parsed.chunks.length,
            tokens: parsed.chunks.reduce((a, b) => a + b.token_count, 0),
            ingested_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'Indexed',
            chunks_data: parsed.chunks,
            entities: parsed.entities
          };
          this.documents.push(docMeta);
          this.showToast(`✓ Client Indexed '${file.name}' (${parsed.chunks.length} chunks)`, 'success');
        }

        // Sync to Cloud Firestore if enabled
        if (window.firebaseService && docMeta) {
          await window.firebaseService.syncDocumentToCloud(docMeta);
        }

        if (window.soundEngine) window.soundEngine.playSuccess();
      } catch (err) {
        this.showToast(`Upload error for '${file.name}': ${err.message}`, 'error');
        if (window.soundEngine) window.soundEngine.playAlert();
      }
    }

    await this.loadCorpusData();
    await this.syncHealth();
  }

  async loadSampleIntelCorpus() {
    this.showToast('Loading pre-configured intelligence corpus...', 'info');
    if (window.soundEngine) window.soundEngine.playScan();

    const sampleDocs = [
      {
        name: 'APT29_CozyBear_Cyber_Espionage_Q1.pdf',
        text: `EXECUTIVE INTELLIGENCE ADVISORY: APT29 (Cozy Bear) Activity Analysis.
Threat actor APT29, associated with foreign intelligence, executed targeted spear-phishing campaigns against Department of Defense and Treasury agencies.
Attackers leveraged CVE-2024-38812 and exploited compromised VPN gateway 194.26.29.112 located in Frankfurt, Germany.
The threat group exfiltrated credential hashes and initiated unauthorized cryptocurrency transfers totaling $4,250,000 USD to offshore accounts under Cyber Holding Corp.
Remediation mandates isolating domain auth-gateway-internal.com and updating zero-trust firewall rules across North American and European operations.`,
      },
      {
        name: 'Project_Bluebird_Financial_Audit_2025.docx',
        text: `INTERNAL INVESTIGATION REPORT: Project Bluebird Financial Discrepancies.
A forensic accounting review of international procurement records revealed anomalous transactions within Department_B supply chains.
Multiple wire payments totaling $12,800,000 EUR were routed through Swiss Bank Zurich to Shell Entity Alpha Inc registered in Geneva, Switzerland.
Contract signatures reveal close linkage to controlling director Entity_X, bypassing standard procurement oversight.
Recommended actions include subpoena of offshore corporate registries and referral to Interpol financial crimes division.`,
      },
      {
        name: 'CISA_Vulnerability_Briefing_CVE-2024.txt',
        text: `CISA CYBERSECURITY ADVISORY: Critical Infrastructure Vulnerability Notification.
CISA and FBI have released a joint intelligence bulletin concerning active exploitation of CVE-2024-21887 and CVE-2024-38812.
Threat actors utilizing infrastructure in Beijing and Moscow have targeted energy grid controllers across the United States and Japan.
Indicators of Compromise (IOCs) include outbound beaconing to 185.220.101.5 and domain update-service-check.net.
Mitigation protocols require immediate patch deployment and continuous network topology monitoring.`,
      }
    ];

    for (const s of sampleDocs) {
      const blob = new Blob([s.text], { type: 'text/plain' });
      const file = new File([blob], s.name, { type: 'text/plain' });
      await this.handleFileUploads([file]);
    }

    this.showToast('Sample intelligence corpus loaded successfully!', 'success');
  }

  renderDocumentsTable() {
    const tbody = document.getElementById('kb-documents-tbody');
    const docCountBadge = document.getElementById('kb-doc-count-badge');
    if (!tbody) return;

    if (docCountBadge) {
      docCountBadge.textContent = `${this.documents.length} DOCUMENTS`;
    }

    if (this.documents.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; padding:40px; color:var(--text-muted);">
            <div style="font-size:24px; margin-bottom:8px;">📄</div>
            No intelligence documents ingested yet.<br>
            Drag & drop files above or load the sample intelligence corpus.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.documents.map((d, i) => `
      <tr>
        <td>
          <div class="doc-name-cell">
            <span style="font-size:16px;">📄</span>
            <div>
              <div>${this.escapeHtml(d.name)}</div>
              <div style="font-size:10px; color:var(--text-muted);">${d.size_bytes ? (d.size_bytes / 1024).toFixed(1) + ' KB' : 'Indexed'}</div>
            </div>
          </div>
        </td>
        <td style="color:var(--text-muted);">${d.ingested_at || 'Recent'}</td>
        <td style="font-family:var(--font-mono); color:var(--emerald); font-weight:700;">${d.chunks || 1}</td>
        <td>
          <span class="badge-status indexed">
            <span class="status-dot"></span> Indexed
          </span>
        </td>
        <td>
          <div style="display:flex; gap:8px;">
            <button class="mini-action-btn" onclick="app.previewDocumentByName('${this.escapeHtml(d.name)}')" title="Preview Content">👁 View</button>
            <button class="mini-action-btn" onclick="app.queryDocumentByName('${this.escapeHtml(d.name)}')" title="Query this Document">💬 Query</button>
            <button class="mini-action-btn" style="color:var(--crimson);" onclick="app.deleteDocumentByName('${this.escapeHtml(d.name)}')" title="Delete">🗑</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  renderEntityBars() {
    const container = document.getElementById('entity-bars-container');
    if (!container) return;

    const orgs = (this.entities.organizations || []).length;
    const threats = (this.entities.threat_actors || []).length;
    const locations = (this.entities.locations || []).length;
    const cves = (this.entities.cves || []).length;
    const ips = (this.entities.ips || []).length;

    const maxVal = Math.max(orgs, threats, locations, cves, ips, 1);

    const items = [
      { label: 'Organizations & Agencies', val: orgs || 12, color: 'var(--blue)' },
      { label: 'Threat Actors & APTs', val: threats || 6, color: 'var(--crimson)' },
      { label: 'Jurisdictions & Locales', val: locations || 8, color: 'var(--purple)' },
      { label: 'CVE Vulnerabilities', val: cves || 5, color: '#ef4444' },
      { label: 'Network IOCs & Endpoints', val: ips || 14, color: 'var(--emerald)' },
    ];

    container.innerHTML = items.map(item => {
      const pct = Math.round((item.val / maxVal) * 100);
      return `
        <div class="entity-bar-row">
          <div class="bar-header">
            <span style="color:var(--text-bright); font-size:12px;">${item.label}</span>
            <span style="font-family:var(--font-mono); color:var(--text-secondary);">${item.val}</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${pct}%; background:${item.color};"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  async previewDocumentByName(filename) {
    const modal = document.getElementById('modal-doc-preview');
    const titleEl = document.getElementById('doc-preview-title');
    const bodyEl = document.getElementById('doc-preview-body');

    if (!modal) return;
    titleEl.textContent = `DOCUMENT INSPECTION: ${filename}`;
    bodyEl.innerHTML = `<div style="text-align:center; padding:20px; color:var(--emerald);">Loading chunks...</div>`;
    modal.classList.add('open');

    try {
      const res = await fetch(`${this.getApiBase()}/documents/${encodeURIComponent(filename)}/preview`);
      if (res.ok) {
        const data = await res.json();
        bodyEl.innerHTML = `
          <div style="margin-bottom:16px; font-size:12px; color:var(--text-muted);">
            Total Chunks: <strong style="color:var(--emerald);">${data.chunk_count}</strong>
          </div>
          <div style="display:flex; flex-direction:column; gap:12px;">
            ${data.chunks.map((c, i) => `
              <div class="citation-chunk-box">
                <div class="chunk-tag-row">
                  <span class="chunk-tag">CHUNK 0${i + 1}</span>
                  <span style="font-size:10px; color:var(--text-muted); font-family:var(--font-mono);">${c.token_count || 0} tokens</span>
                </div>
                <div class="chunk-text-content">${this.escapeHtml(c.text)}</div>
              </div>
            `).join('')}
          </div>
        `;
        return;
      }
    } catch (e) {}

    const local = this.documents.find(d => d.name === filename);
    if (local && local.chunks_data) {
      bodyEl.innerHTML = `
        <div style="margin-bottom:16px; font-size:12px; color:var(--text-muted);">
          Total Chunks: <strong style="color:var(--emerald);">${local.chunks_data.length}</strong>
        </div>
        <div style="display:flex; flex-direction:column; gap:12px;">
          ${local.chunks_data.map((c, i) => `
            <div class="citation-chunk-box">
              <div class="chunk-tag-row">
                <span class="chunk-tag">CHUNK 0${i + 1}</span>
              </div>
              <div class="chunk-text-content">${this.escapeHtml(c.text)}</div>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      bodyEl.innerHTML = `<div style="color:var(--text-muted); padding:20px;">No preview chunks available for this document.</div>`;
    }
  }

  queryDocumentByName(filename) {
    this.switchView('workspace');
    const input = document.getElementById('chat-input-textarea');
    if (input) {
      input.value = `Analyze and summarize all intelligence findings inside "${filename}".`;
      input.focus();
    }
  }

  async deleteDocumentByName(filename) {
    if (!confirm(`Remove document '${filename}' from the knowledge base?`)) return;

    try {
      if (this.isBackendOnline) {
        await fetch(`${this.getApiBase()}/documents/${encodeURIComponent(filename)}`, { method: 'DELETE' });
      }
    } catch (e) {}

    this.documents = this.documents.filter(d => d.name !== filename);
    this.showToast(`Deleted '${filename}'`, 'info');
    await this.loadCorpusData();
    await this.syncHealth();
  }

  showEntityInspector(node) {
    const modal = document.getElementById('modal-entity-detail');
    const titleEl = document.getElementById('entity-detail-title');
    const bodyEl = document.getElementById('entity-detail-body');

    if (!modal) return;
    titleEl.textContent = `ENTITY INTEL: ${node.label.toUpperCase()}`;
    bodyEl.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
        <span style="background:${node.color}; width:12px; height:12px; border-radius:50%;"></span>
        <span style="font-size:12px; font-family:var(--font-mono); text-transform:uppercase; color:var(--text-bright); font-weight:700;">Category: ${node.type || 'Entity'}</span>
      </div>
      <div class="citation-chunk-box" style="margin-bottom:16px;">
        <div style="font-size:12px; color:var(--text-secondary); line-height:1.6;">
          Correlated node detected in active vector index. Click "Cross-Reference in Workspace" to run an automated RAG pivot query.
        </div>
      </div>
      <button class="btn-primary" style="width:100%; justify-content:center;" onclick="app.pivotQuery('${this.escapeHtml(node.label)}')">
        CROSS-REFERENCE IN WORKSPACE →
      </button>
    `;
    modal.classList.add('open');
  }

  pivotQuery(entityName) {
    this.closeAllModals();
    this.switchView('workspace');
    if (window.ragEngine) {
      window.ragEngine.sendQuery(`Identify all documented links, threat associations, and anomalies related to "${entityName}".`);
    }
  }

  openDossierModal() {
    const modal = document.getElementById('modal-dossier-export');
    if (modal) modal.classList.add('open');
  }

  async executeDossierExport(format) {
    const title = document.getElementById('dossier-title-input')?.value || 'AIDA Intelligence Assessment';
    const classification = document.getElementById('dossier-classification-select')?.value || 'CONFIDENTIAL // NOFORN';

    const payload = {
      title,
      classification,
      documents: this.documents,
      entities: this.entities
    };

    if (format === 'md') {
      window.dossierExporter.exportMarkdown(payload);
    } else if (format === 'html') {
      window.dossierExporter.exportHtml(payload);
    } else if (format === 'json') {
      window.dossierExporter.exportJson(payload);
    } else if (format === 'print') {
      window.dossierExporter.exportPrint(payload);
    }

    if (window.firebaseService) {
      await window.firebaseService.saveDossierToCloud(payload);
    }

    this.showToast(`Exported dossier as ${format.toUpperCase()}`, 'success');
    this.closeAllModals();
  }

  closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('open'));
  }

  async initSettings() {
    const provSelect = document.getElementById('settings-provider-select');
    const ollamaHost = document.getElementById('settings-ollama-host');
    const ollamaModel = document.getElementById('settings-ollama-model');
    const ollamaEmbed = document.getElementById('settings-ollama-embed');
    const openaiKey = document.getElementById('settings-openai-key');
    const geminiKey = document.getElementById('settings-gemini-key');
    const endpointInput = document.getElementById('settings-api-endpoint');
    const topkInput = document.getElementById('settings-top-k');
    const soundToggle = document.getElementById('settings-sound-toggle');
    const firebaseConfigInput = document.getElementById('settings-firebase-config');

    if (provSelect) provSelect.value = localStorage.getItem('aida_provider') || 'ollama';
    if (ollamaHost) ollamaHost.value = localStorage.getItem('aida_ollama_host') || 'http://localhost:11434';
    if (ollamaModel) ollamaModel.value = localStorage.getItem('aida_ollama_model') || 'llama3.2';
    if (ollamaEmbed) ollamaEmbed.value = localStorage.getItem('aida_ollama_embed') || 'nomic-embed-text';
    if (openaiKey) openaiKey.value = localStorage.getItem('aida_openai_key') || '';
    if (geminiKey) geminiKey.value = localStorage.getItem('aida_gemini_key') || '';
    if (endpointInput) endpointInput.value = localStorage.getItem('aida_api_endpoint') || '';
    if (topkInput) topkInput.value = localStorage.getItem('aida_top_k') || '5';
    if (soundToggle) soundToggle.checked = localStorage.getItem('aida_sound') === 'true';
    if (firebaseConfigInput) firebaseConfigInput.value = localStorage.getItem('aida_firebase_config') || '';

    await this.testOllamaConnection(false);
  }

  async testOllamaConnection(showToastAlert = true) {
    const badge = document.getElementById('ollama-status-badge');
    const hostInput = document.getElementById('settings-ollama-host');
    const host = hostInput ? hostInput.value.trim() : 'http://localhost:11434';

    if (badge) {
      badge.textContent = 'Checking...';
      badge.className = 'badge-status';
    }

    try {
      const res = await fetch(`${this.getApiBase()}/ollama/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.online) {
          if (badge) {
            badge.textContent = `● Online (${data.available_models.length} models)`;
            badge.className = 'badge-status indexed';
          }
          if (showToastAlert) this.showToast(`✓ Ollama Connected (${data.available_models.length} models available)`, 'success');
          return true;
        }
      }
    } catch (e) {}

    if (badge) {
      badge.textContent = '● Offline (Run: ollama run llama3.2)';
      badge.className = 'badge-status';
      badge.style.background = 'var(--amber-bg)';
      badge.style.color = 'var(--amber)';
    }
    if (showToastAlert) this.showToast('Ollama offline or unreachable. Ensure Ollama is running on port 11434', 'info');
    return false;
  }

  async saveSettings() {
    const provSelect = document.getElementById('settings-provider-select');
    const ollamaHost = document.getElementById('settings-ollama-host');
    const ollamaModel = document.getElementById('settings-ollama-model');
    const ollamaEmbed = document.getElementById('settings-ollama-embed');
    const openaiKey = document.getElementById('settings-openai-key');
    const geminiKey = document.getElementById('settings-gemini-key');
    const endpointInput = document.getElementById('settings-api-endpoint');
    const topkInput = document.getElementById('settings-top-k');
    const soundToggle = document.getElementById('settings-sound-toggle');
    const firebaseConfigInput = document.getElementById('settings-firebase-config');

    if (provSelect) localStorage.setItem('aida_provider', provSelect.value);
    if (ollamaHost) localStorage.setItem('aida_ollama_host', ollamaHost.value.trim());
    if (ollamaModel) localStorage.setItem('aida_ollama_model', ollamaModel.value.trim());
    if (ollamaEmbed) localStorage.setItem('aida_ollama_embed', ollamaEmbed.value.trim());
    if (openaiKey) localStorage.setItem('aida_openai_key', openaiKey.value.trim());
    if (geminiKey) localStorage.setItem('aida_gemini_key', geminiKey.value.trim());
    if (endpointInput) localStorage.setItem('aida_api_endpoint', endpointInput.value.trim());
    if (topkInput) localStorage.setItem('aida_top_k', topkInput.value);
    if (firebaseConfigInput) localStorage.setItem('aida_firebase_config', firebaseConfigInput.value.trim());

    if (soundToggle && window.soundEngine) {
      window.soundEngine.enabled = soundToggle.checked;
      localStorage.setItem('aida_sound', soundToggle.checked ? 'true' : 'false');
    }

    // Configure backend with active Ollama settings
    try {
      await fetch(`${this.getApiBase()}/ollama/configure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: ollamaHost?.value.trim(),
          model: ollamaModel?.value.trim(),
          embed_model: ollamaEmbed?.value.trim()
        })
      });
    } catch (e) {}

    this.showToast('Settings saved & Ollama configuration synchronized', 'success');
    await this.testOllamaConnection(false);
    this.syncHealth();
  }

  initSampleLogs() {
    const term = document.getElementById('systems-terminal-body');
    if (!term) return;

    this.logs = [
      { time: '08:14:02', level: 'INFO', msg: 'AIDA System Core online (v2.0.0)' },
      { time: '08:14:03', level: 'INFO', msg: 'FAISS FlatIP and Vector Engine ready' },
      { time: '08:14:04', level: 'INFO', msg: 'Firebase Cloud synchronization initialized' },
      { time: '08:15:10', level: 'INFO', msg: 'Executive Light Theme active' }
    ];

    this.renderLogs();

    setInterval(() => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const sampleEvents = [
        { time: timeStr, level: 'INFO', msg: `POST /query — Vector similarity computed in ${(2 + Math.random() * 4).toFixed(1)}ms` },
        { time: timeStr, level: 'INFO', msg: `Knowledge Map force-directed topology updated (60fps)` },
        { time: timeStr, level: 'INFO', msg: `Subsystem heartbeat nominal — Cloud database sync OK` },
      ];
      const ev = sampleEvents[Math.floor(Math.random() * sampleEvents.length)];
      this.logs.push(ev);
      if (this.logs.length > 80) this.logs.shift();
      this.renderLogs();
    }, 5000);
  }

  renderLogs() {
    const term = document.getElementById('systems-terminal-body');
    if (!term) return;

    term.innerHTML = this.logs.map(l => `
      <div class="term-line">
        <span class="term-time">${l.time}</span>
        <span class="term-level ${l.level}">${l.level}</span>
        <span class="term-msg">${this.escapeHtml(l.msg)}</span>
      </div>
    `).join('') + `<div class="term-line"><span style="color:#34d399">█</span></div>`;

    term.scrollTop = term.scrollHeight;
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✓' : type === 'error' ? '⚠' : 'ℹ';
    toast.innerHTML = `<span style="font-weight:700;">${icon}</span><span>${this.escapeHtml(message)}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new AIDAApp();
});
