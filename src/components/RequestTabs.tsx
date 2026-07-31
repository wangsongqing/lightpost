import { useStore } from '../stores/useStore';
import type { OpenRequest } from '../types';

const methodColor = (method: string) => {
  const colors: Record<string, string> = {
    GET: 'var(--method-get)',
    POST: 'var(--method-post)',
    PUT: 'var(--method-put)',
    DELETE: 'var(--method-delete)',
    PATCH: 'var(--method-patch)',
    HEAD: 'var(--method-head)',
    OPTIONS: 'var(--method-options)',
  };
  return colors[method] || 'var(--text-muted)';
};

export function RequestTabs() {
  const { openRequests, activeRequestId, setActiveRequestId, closeRequest, openNewRequest } = useStore();

  const handleClose = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    closeRequest(id);
  };

  const handleDoubleClick = () => {
    openNewRequest();
  };

  return (
    <div className="request-tabs" onDoubleClick={handleDoubleClick}>
      <div className="tabs-scroll">
        {openRequests.map((tab: OpenRequest) => {
          const isActive = tab.id === activeRequestId;
          return (
            <div
              key={tab.id}
              className={`request-tab ${isActive ? 'active' : ''}`}
              onClick={() => setActiveRequestId(tab.id)}
              title={tab.request.url || tab.title}
            >
              <span
                className="tab-method"
                style={{ color: methodColor(tab.request.method) }}
              >
                {tab.request.method}
              </span>
              <span className="tab-title">{tab.title}</span>
              {tab.isDirty && (
                <span className="tab-dirty-dot" title="未保存的更改" />
              )}
              <button
                className="tab-close"
                onClick={(e) => handleClose(e, tab.id)}
                title="关闭"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
      <button className="tab-add-btn" onClick={openNewRequest} title="新建请求">
        +
      </button>
    </div>
  );
}
