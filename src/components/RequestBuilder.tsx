import { useState, useCallback } from 'react';
import { useStore, useCollectionStore } from '../stores/useStore';
import { sendRequest, generateId } from '../utils/request';
import type { HttpMethod, BodyType, KeyValuePair } from '../types';
import { KeyValueEditor } from './KeyValueEditor';

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
const BODY_TYPES: { value: BodyType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'json', label: 'JSON' },
  { value: 'form-data', label: 'Form Data' },
  { value: 'x-www-form-urlencoded', label: 'URL Encoded' },
  { value: 'raw', label: 'Raw' },
];

export function RequestBuilder() {
  const { request, setRequest, setResponse, setLoading, loading, environments, activeEnvId, addHistory } = useStore();
  const { activeItemId, saveCurrentRequest } = useCollectionStore();
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body'>('headers');
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!activeItemId) return;
    setSaving(true);
    try {
      await saveCurrentRequest();
    } finally {
      setSaving(false);
    }
  }, [activeItemId, saveCurrentRequest]);

  // Ctrl+S / Cmd+S 保存
  const handleSaveKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave],
  );

  const activeEnv = environments.find((e) => e.id === activeEnvId);

  const handleSend = useCallback(async () => {
    if (!request.url.trim()) return;

    setLoading(true);
    setResponse(null);

    const historyId = generateId();
    const historyItem = {
      id: historyId,
      method: request.method,
      url: request.url,
      timestamp: Date.now(),
    };
    addHistory(historyItem);

    try {
      const response = await sendRequest(request, activeEnv);
      setResponse(response);
      addHistory({ ...historyItem, status: response.status, time: response.time });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setResponse({
        status: 0,
        statusText: 'Error',
        headers: {},
        body: `Request failed:\n${errorMessage}`,
        time: 0,
        size: 0,
      });
      addHistory({ ...historyItem, status: 0, time: 0 });
    } finally {
      setLoading(false);
    }
  }, [request, activeEnv, setLoading, setResponse, addHistory]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const updateParams = (params: KeyValuePair[]) => setRequest({ params });
  const updateHeaders = (headers: KeyValuePair[]) => setRequest({ headers });

  return (
    <div className="request-builder" onKeyDown={(e) => { handleKeyDown(e); handleSaveKeyDown(e); }}>
      {/* URL Bar */}
      <div className="url-bar">
        <select
          className="method-select"
          value={request.method}
          onChange={(e) => setRequest({ method: e.target.value as HttpMethod })}
        >
          {HTTP_METHODS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <input
          className="url-input"
          type="text"
          placeholder="Enter request URL (use {{variable}} for env vars)"
          value={request.url}
          onChange={(e) => setRequest({ url: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
        />
        <button
          className="save-btn"
          onClick={handleSave}
          disabled={!activeItemId || saving}
          title={activeItemId ? '保存到请求 (Ctrl+S)' : '请先选中一个请求'}
        >
          {saving ? <span className="spinner" /> : '💾'}
        </button>
        <button
          className="primary send-btn"
          onClick={handleSend}
          disabled={loading || !request.url.trim()}
        >
          {loading ? <span className="spinner" /> : 'Send'}
        </button>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        <div
          className={`tab ${activeTab === 'params' ? 'active' : ''}`}
          onClick={() => setActiveTab('params')}
        >
          Params {request.params.filter((p) => p.key).length > 0 && `(${request.params.filter((p) => p.key).length})`}
        </div>
        <div
          className={`tab ${activeTab === 'headers' ? 'active' : ''}`}
          onClick={() => setActiveTab('headers')}
        >
          Headers {request.headers.filter((h) => h.key).length > 0 && `(${request.headers.filter((h) => h.key).length})`}
        </div>
        <div
          className={`tab ${activeTab === 'body' ? 'active' : ''}`}
          onClick={() => setActiveTab('body')}
        >
          Body
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'params' && (
          <KeyValueEditor
            data={request.params}
            onChange={updateParams}
            keyPlaceholder="Key"
            valuePlaceholder="Value"
          />
        )}
        {activeTab === 'headers' && (
          <KeyValueEditor
            data={request.headers}
            onChange={updateHeaders}
            keyPlaceholder="Header name"
            valuePlaceholder="Header value"
          />
        )}
        {activeTab === 'body' && (
          <div className="body-editor">
            <div className="body-type-bar">
              {BODY_TYPES.map((bt) => (
                <button
                  key={bt.value}
                  className={`body-type-btn ${request.bodyType === bt.value ? 'active' : ''}`}
                  onClick={() => setRequest({ bodyType: bt.value })}
                >
                  {bt.label}
                </button>
              ))}
            </div>
            {request.bodyType !== 'none' && (
              <textarea
                className="body-textarea"
                value={request.bodyContent}
                onChange={(e) => setRequest({ bodyContent: e.target.value })}
                placeholder={request.bodyType === 'json' ? '{\n  "key": "value"\n}' : 'Enter body content...'}
                spellCheck={false}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
