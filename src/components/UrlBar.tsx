import { useState, useCallback, useEffect } from 'react';
import { useStore, useCollectionStore } from '../stores/useStore';
import { useActiveRequest } from '../stores/useActiveRequest';
import { sendRequest, generateId } from '../utils/request';
import type { HttpMethod, RequestData } from '../types';

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

const emptyRequest: RequestData = {
  method: 'GET',
  url: '',
  params: [],
  headers: [],
  bodyType: 'none',
  bodyContent: '',
};

export function UrlBar() {
  const activeTab = useActiveRequest();
  const request: RequestData = activeTab?.request ?? emptyRequest;
  const loading = activeTab?.loading ?? false;
  const { setRequest, setResponse, setLoading, environments, activeEnvId, addHistory } = useStore();
  const { activeItemId, saveCurrentRequest } = useCollectionStore();
  const [saving, setSaving] = useState(false);

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

  const handleSave = useCallback(async () => {
    if (!activeItemId) return;
    setSaving(true);
    try {
      await saveCurrentRequest();
    } finally {
      setSaving(false);
    }
  }, [activeItemId, saveCurrentRequest]);

  // 全局快捷键：Ctrl+S / Cmd+S 保存，Ctrl+Enter / Cmd+Enter 发送
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSend();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleSave, handleSend]);

  return (
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
          if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) handleSend();
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
