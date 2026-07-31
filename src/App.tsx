import { useState, useEffect, useRef, useCallback } from 'react';
import { RequestBuilder } from './components/RequestBuilder';
import { ResponseViewer } from './components/ResponseViewer';
import { UrlBar } from './components/UrlBar';
import { EnvironmentPanel } from './components/EnvironmentPanel';
import { HistorySidebar } from './components/HistorySidebar';
import { CollectionTree } from './components/CollectionTree';
import { RequestTabs } from './components/RequestTabs';
import { useStore } from './stores/useStore';
import './styles/app.css';
import './styles/collection.css';

function App() {
  const { environments, activeEnvId, initFromDb } = useStore();
  const [showEnv, setShowEnv] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  useEffect(() => {
    initFromDb();
  }, [initFromDb]);

  const activeEnv = environments.find((e) => e.id === activeEnvId);

  // 拖拽调整侧边栏宽度
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = sidebarWidth;
    e.preventDefault();
  }, [sidebarWidth]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = e.clientX - startX.current;
      const newWidth = Math.max(200, Math.min(600, startWidth.current + delta));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div className="app">
      {/* Top bar */}
      <header className="top-bar">
        <div className="logo">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">LightPost</span>
        </div>
        <div className="top-actions">
          <button
            className="env-trigger"
            onClick={() => setShowEnv(true)}
            title="Manage environments"
          >
            <span
              className="env-dot"
              style={{
                background: activeEnv
                  ? 'var(--accent)'
                  : 'var(--text-muted)',
              }}
            />
            {activeEnv?.name || 'No Env'}
          </button>
          <button onClick={() => setShowHistory(true)} title="Request history">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="main-content">
        {/* Left sidebar - Collection tree */}
        <div className="collection-sidebar" style={{ width: sidebarWidth }}>
          <CollectionTree />
        </div>

        {/* 拖拽分隔条 */}
        <div
          className="sidebar-resizer"
          onMouseDown={handleMouseDown}
        />

        {/* Right side: tabs on top, then URL bar, then request/response split */}
        <div className="content-area">
          <RequestTabs />
          <UrlBar />
          <div className="panes-row">
            <div className="pane request-pane">
              <RequestBuilder />
            </div>
            <div className="pane response-pane">
              <ResponseViewer />
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      {showEnv && <EnvironmentPanel onClose={() => setShowEnv(false)} />}
      {showHistory && <HistorySidebar onClose={() => setShowHistory(false)} />}
    </div>
  );
}

export default App;
