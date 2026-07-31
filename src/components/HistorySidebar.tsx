import { useStore } from '../stores/useStore';
import type { HistoryItem } from '../types';

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function formatUrl(url: string, maxLen: number = 40): string {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `http://${url}`);
    let path = urlObj.pathname + urlObj.search;
    if (path.length > maxLen) path = path.substring(0, maxLen) + '...';
    return path || urlObj.host;
  } catch {
    return url.length > maxLen ? url.substring(0, maxLen) + '...' : url;
  }
}

export function HistorySidebar({ onClose }: { onClose: () => void }) {
  const { history, removeHistory, clearHistory, openNewRequest, setRequest } = useStore();

  const handleClick = (item: HistoryItem) => {
    // 这里只能恢复 URL 和方法，完整恢复需要额外存储
    const tabId = openNewRequest();
    setRequest({ method: item.method, url: item.url });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal history-sidebar" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>History</h3>
          <div className="header-actions">
            {history.length > 0 && (
              <button className="clear-btn" onClick={clearHistory}>
                Clear All
              </button>
            )}
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
        </div>
        <div className="modal-body">
          {history.length === 0 ? (
            <div className="empty-history">
              <p>No request history yet</p>
              <p className="hint">Your recent requests will appear here</p>
            </div>
          ) : (
            <div className="history-list">
              {history.map((item) => (
                <div className="history-item" key={item.id} onClick={() => handleClick(item)}>
                  <div className="history-item-main">
                    <span className={`method-badge ${item.method}`}>{item.method}</span>
                    <span className="history-url">{formatUrl(item.url)}</span>
                  </div>
                  <div className="history-item-meta">
                    {item.status !== undefined && (
                      <span
                        className="history-status"
                        style={{ color: item.status >= 200 && item.status < 300 ? 'var(--success)' : item.status >= 400 ? 'var(--error)' : 'var(--warning)' }}
                      >
                        {item.status || 'ERR'}
                      </span>
                    )}
                    {item.time !== undefined && <span>{item.time}ms</span>}
                    <span className="history-time">{formatTime(item.timestamp)}</span>
                    <button
                      className="history-remove"
                      onClick={(e) => { e.stopPropagation(); removeHistory(item.id); }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
