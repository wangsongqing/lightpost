import { useState } from 'react';
import { useStore } from '../stores/useStore';
import { formatBytes, formatJson, getStatusColor } from '../utils/request';
import type { ResponseData } from '../types';

type ResponseTab = 'body' | 'headers' | 'cookies';

function highlightJson(json: string): string {
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"([^"]+)"(\s*:)/g, '<span class="json-key">"$1"</span>$2')
    .replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>')
    .replace(/: (\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
    .replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
    .replace(/: (null)/g, ': <span class="json-null">$1</span>');
}

export function ResponseViewer() {
  const { response, loading } = useStore();
  const [activeTab, setActiveTab] = useState<ResponseTab>('body');
  const [bodyView, setBodyView] = useState<'pretty' | 'raw'>('pretty');

  if (loading) {
    return (
      <div className="response-viewer loading">
        <div className="loading-indicator">
          <span className="spinner" />
          <span>Sending request...</span>
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="response-viewer empty">
        <div className="empty-state">
          <p>Send a request to see the response</p>
          <p className="shortcut">Press <kbd>⌘</kbd> + <kbd>Enter</kbd> to send</p>
        </div>
      </div>
    );
  }

  const isJson = response.headers['content-type']?.includes('json') ||
    response.body.trim().startsWith('{') ||
    response.body.trim().startsWith('[');

  const formattedBody = isJson && bodyView === 'pretty' ? formatJson(response.body) : response.body;

  return (
    <div className="response-viewer fade-in">
      {/* Status bar */}
      <div className="response-status-bar">
        <div className="status-info">
          <span className="status-code" style={{ color: getStatusColor(response.status) }}>
            {response.status}
          </span>
          <span className="status-text">{response.statusText}</span>
        </div>
        <div className="response-meta">
          <span>{response.time} ms</span>
          <span>{formatBytes(response.size)}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        <div
          className={`tab ${activeTab === 'body' ? 'active' : ''}`}
          onClick={() => setActiveTab('body')}
        >
          Body
        </div>
        <div
          className={`tab ${activeTab === 'headers' ? 'active' : ''}`}
          onClick={() => setActiveTab('headers')}
        >
          Headers ({Object.keys(response.headers).length})
        </div>
      </div>

      {/* Content */}
      <div className="response-content">
        {activeTab === 'body' && (
          <div className="response-body">
            {isJson && (
              <div className="body-view-toggle">
                <button
                  className={bodyView === 'pretty' ? 'active' : ''}
                  onClick={() => setBodyView('pretty')}
                >
                  Pretty
                </button>
                <button
                  className={bodyView === 'raw' ? 'active' : ''}
                  onClick={() => setBodyView('raw')}
                >
                  Raw
                </button>
              </div>
            )}
            <pre className="body-content">
              {isJson && bodyView === 'pretty' ? (
                <code dangerouslySetInnerHTML={{ __html: highlightJson(formattedBody) }} />
              ) : (
                <code>{formattedBody}</code>
              )}
            </pre>
          </div>
        )}
        {activeTab === 'headers' && (
          <div className="response-headers">
            {Object.entries(response.headers).map(([key, value]) => (
              <div className="header-row" key={key}>
                <span className="header-key">{key}</span>
                <span className="header-value">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
