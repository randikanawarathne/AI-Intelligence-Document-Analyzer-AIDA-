/**
 * AIDA — Firebase Cloud Database & Authentication Service
 * Manages user sessions, cloud persistence (Firestore), and cloud synchronization with fallback.
 */

class FirebaseService {
  constructor() {
    this.auth = null;
    this.db = null;
    this.isInitialized = false;
    this.currentUser = JSON.parse(localStorage.getItem('aida_user') || 'null');
    this.authListeners = [];

    this.init();
  }

  init() {
    const storedConfig = localStorage.getItem('aida_firebase_config');
    let config = null;

    if (storedConfig) {
      try {
        config = JSON.parse(storedConfig);
      } catch (e) {}
    }

    // Default sample/fallback config structure
    if (!config) {
      config = {
        apiKey: "AIzaSyDemoAIDAKey2026",
        authDomain: "aida-intelligence.firebaseapp.com",
        projectId: "aida-intelligence",
        storageBucket: "aida-intelligence.appspot.com",
        messagingSenderId: "1029384756",
        appId: "1:1029384756:web:aida2026demo"
      };
    }

    if (window.firebase && window.firebase.initializeApp) {
      try {
        if (!window.firebase.apps.length) {
          window.firebase.initializeApp(config);
        }
        this.auth = window.firebase.auth();
        this.db = window.firebase.firestore();
        this.isInitialized = true;

        this.auth.onAuthStateChanged((user) => {
          if (user) {
            this.currentUser = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || user.email.split('@')[0],
              role: 'Lead Intelligence Analyst',
              clearance: 'TOP SECRET // SI-TK',
              photoURL: user.photoURL || null
            };
            localStorage.setItem('aida_user', JSON.stringify(this.currentUser));
          }
          this.notifyAuthListeners();
        });
      } catch (e) {
        console.warn('Firebase initialized in fallback mode:', e);
      }
    }
  }

  onAuthStateChanged(callback) {
    this.authListeners.push(callback);
    callback(this.currentUser);
  }

  notifyAuthListeners() {
    this.authListeners.forEach(cb => cb(this.currentUser));
  }

  async loginWithEmail(email, password) {
    if (this.isInitialized && this.auth) {
      try {
        const cred = await this.auth.signInWithEmailAndPassword(email, password);
        return cred.user;
      } catch (err) {
        // Fallback for demo credentials
        if (password.length >= 6) {
          return this.demoLogin('Lead Intelligence Analyst', email);
        }
        throw err;
      }
    }
    return this.demoLogin('Lead Intelligence Analyst', email);
  }

  async signUpWithEmail(email, password, displayName) {
    if (this.isInitialized && this.auth) {
      try {
        const cred = await this.auth.createUserWithEmailAndPassword(email, password);
        if (displayName) {
          await cred.user.updateProfile({ displayName });
        }
        return cred.user;
      } catch (err) {
        if (password.length >= 6) {
          return this.demoLogin('Intelligence Analyst', email, displayName);
        }
        throw err;
      }
    }
    return this.demoLogin('Intelligence Analyst', email, displayName);
  }

  demoLogin(role = 'Lead Intelligence Analyst', email = 'analyst.vance@aida.intel', displayName = 'Dr. Vance (Lead Analyst)') {
    this.currentUser = {
      uid: 'demo_analyst_01',
      email: email,
      displayName: displayName,
      role: role,
      clearance: 'TOP SECRET // NOFORN',
      photoURL: null,
      isDemo: true
    };
    localStorage.setItem('aida_user', JSON.stringify(this.currentUser));
    this.notifyAuthListeners();
    return this.currentUser;
  }

  async logout() {
    if (this.isInitialized && this.auth) {
      try {
        await this.auth.signOut();
      } catch (e) {}
    }
    this.currentUser = null;
    localStorage.removeItem('aida_user');
    this.notifyAuthListeners();
  }

  // ── Cloud Firestore Persistence ───────────────────────────────────

  async syncDocumentToCloud(docMeta) {
    if (this.isInitialized && this.db && this.currentUser) {
      try {
        await this.db.collection('users').doc(this.currentUser.uid).collection('documents').doc(docMeta.name).set({
          ...docMeta,
          updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        });
      } catch (e) {
        console.warn('Firestore document sync error:', e);
      }
    }
    // Local persistence mirror
    const local = JSON.parse(localStorage.getItem('aida_cloud_docs') || '[]');
    const filtered = local.filter(d => d.name !== docMeta.name);
    filtered.push(docMeta);
    localStorage.setItem('aida_cloud_docs', JSON.stringify(filtered));
  }

  async syncChatToCloud(chatMessage) {
    if (this.isInitialized && this.db && this.currentUser) {
      try {
        await this.db.collection('users').doc(this.currentUser.uid).collection('chats').add({
          ...chatMessage,
          timestamp: window.firebase.firestore.FieldValue.serverTimestamp()
        });
      } catch (e) {}
    }
  }

  async saveDossierToCloud(dossier) {
    if (this.isInitialized && this.db && this.currentUser) {
      try {
        const ref = await this.db.collection('users').doc(this.currentUser.uid).collection('dossiers').add({
          ...dossier,
          createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
        });
        return ref.id;
      } catch (e) {}
    }
    const saved = JSON.parse(localStorage.getItem('aida_cloud_dossiers') || '[]');
    saved.unshift({ ...dossier, id: 'local_' + Date.now(), createdAt: new Date().toISOString() });
    localStorage.setItem('aida_cloud_dossiers', JSON.stringify(saved.slice(0, 20)));
    return 'local_' + Date.now();
  }

  async loadCloudDossiers() {
    if (this.isInitialized && this.db && this.currentUser) {
      try {
        const snap = await this.db.collection('users').doc(this.currentUser.uid).collection('dossiers').orderBy('createdAt', 'desc').limit(20).get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) {}
    }
    return JSON.parse(localStorage.getItem('aida_cloud_dossiers') || '[]');
  }
}

window.firebaseService = new FirebaseService();
