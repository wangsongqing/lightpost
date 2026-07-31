import { useState, useCallback } from 'react';
import { useStore, useCollectionStore } from '../stores/useStore';
import { sendRequest, generateId } from '../utils/request';
import type { HttpMethod } from '../types';

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

export function UrlBar() {
  const { request, setRequest, setResponse, setLoading, loading, environments, activeEnvId, addHistory } = useStore();
  const { activeItemId, saveCurrentRequest } = useCollectionStore();
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

  const handleSaveKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSend();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
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

  return (
    <div className="url-bar" onKeyDown={(e) => { handleKeyDown(e); handleSaveKeyDown(e); }}>
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
  );
}
