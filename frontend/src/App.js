import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar    from './components/Sidebar';
import Topbar     from './components/Topbar';
import DashboardPage  from './pages/DashboardPage';
import SystemsPage    from './pages/SystemsPage';
import IntelPage      from './pages/IntelPage';
import KnowledgePage  from './pages/KnowledgePage';
import WorkspacePage  from './pages/WorkspacePage';
import { getHealth } from './utils/api';

export default function App() {
  const [systemOk, setSystemOk] = useState(false);

  useEffect(() => {
    const check = () => getHealth().then(() => setSystemOk(true)).catch(() => setSystemOk(false));
    check();
    const id = setInterval(check, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <BrowserRouter>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar systemOk={systemOk} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Topbar />
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Routes>
              <Route path="/"           element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard"  element={<DashboardPage />} />
              <Route path="/systems"    element={<SystemsPage />} />
              <Route path="/intel"      element={<IntelPage />} />
              <Route path="/knowledge"  element={<KnowledgePage />} />
              <Route path="/workspace"  element={<WorkspacePage />} />
            </Routes>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}
