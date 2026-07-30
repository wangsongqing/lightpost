import { useState, useEffect } from 'react';
import { RequestBuilder } from './components/RequestBuilder';
import { ResponseViewer } from './components/ResponseViewer';
import { EnvironmentPanel } from './components/EnvironmentPanel';
import { HistorySidebar } from './components/HistorySidebar';
import { CollectionTree } from './components/CollectionTree';
import { useStore } from './stores/useStore';
import './styles/app.css';
import './styles/collection.css';

function App() {
  const { environments, activeEnvId, initFromDb } = useStore();
  const [showEnv, setShowEnv] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    initFromDb();
  }, [initFromDb]);

  const activeEnv = environments.find((e) => e.id === activeEnvId);

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
        <div className="collection-sidebar">
          <CollectionTree />
        </div>

        {/* Request & Response panes */}
        <div className="pane request-pane">
          <RequestBuilder />
        </div>
        <div className="pane response-pane">
          <ResponseViewer />
        </div>
      </main>

      {/* Modals */}
      {showEnv && <EnvironmentPanel onClose={() => setShowEnv(false)} />}
      {showHistory && <HistorySidebar onClose={() => setShowHistory(false)} />}
    </div>
  );
}

export default App;
