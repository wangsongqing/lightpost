import { useState } from 'react';
import { useStore } from '../stores/useStore';
import { generateId } from '../utils/request';
import type { KeyValuePair } from '../types';

export function EnvironmentPanel({ onClose }: { onClose: () => void }) {
  const { environments, activeEnvId, setActiveEnvId, addEnvironment, updateEnvironment, removeEnvironment } = useStore();
  const [editingEnvId, setEditingEnvId] = useState<string | null>(null);
  const [newEnvName, setNewEnvName] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const activeEnv = environments.find((e) => e.id === activeEnvId);

  const handleCreate = () => {
    if (!newEnvName.trim()) return;
    const id = generateId();
    addEnvironment({ id, name: newEnvName.trim(), variables: [] });
    setActiveEnvId(id);
    setNewEnvName('');
    setShowCreate(false);
    setEditingEnvId(id);
  };

  const addVariable = (envId: string) => {
    const env = environments.find((e) => e.id === envId);
    if (!env) return;
    updateEnvironment(envId, {
      variables: [...env.variables, { id: generateId(), key: '', value: '', enabled: true }],
    });
  };

  const updateVariable = (envId: string, varId: string, field: 'key' | 'value' | 'enabled', val: string | boolean) => {
    const env = environments.find((e) => e.id === envId);
    if (!env) return;
    updateEnvironment(envId, {
      variables: env.variables.map((v) => (v.id === varId ? { ...v, [field]: val } : v)),
    });
  };

  const removeVariable = (envId: string, varId: string) => {
    const env = environments.find((e) => e.id === envId);
    if (!env) return;
    updateEnvironment(envId, {
      variables: env.variables.filter((v) => v.id !== varId),
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal environment-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Environment Variables</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="env-sidebar">
            <div className="env-list">
              {environments.map((env) => (
                <div
                  key={env.id}
                  className={`env-item ${env.id === activeEnvId ? 'active' : ''}`}
                  onClick={() => { setActiveEnvId(env.id); setEditingEnvId(env.id); }}
                >
                  <span>{env.name}</span>
                  {environments.length > 1 && (
                    <button
                      className="env-remove-btn"
                      onClick={(e) => { e.stopPropagation(); removeEnvironment(env.id); }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            {showCreate ? (
              <div className="env-create">
                <input
                  type="text"
                  placeholder="Environment name"
                  value={newEnvName}
                  onChange={(e) => setNewEnvName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  autoFocus
                />
                <button onClick={handleCreate}>Add</button>
                <button onClick={() => setShowCreate(false)}>Cancel</button>
              </div>
            ) : (
              <button className="env-add-btn" onClick={() => setShowCreate(true)}>
                + New Environment
              </button>
            )}
          </div>
          <div className="env-editor">
            {activeEnv && editingEnvId === activeEnv.id && (
              <>
                <div className="env-editor-header">
                  <h4>{activeEnv.name}</h4>
                  <span className="env-hint">Use {'{{variable}}'} in URL, headers, or body</span>
                </div>
                <div className="kv-header">
                  <span className="kv-col-enable"></span>
                  <span className="kv-col-key">Variable</span>
                  <span className="kv-col-value">Value</span>
                  <span className="kv-col-action"></span>
                </div>
                {activeEnv.variables.map((v: KeyValuePair) => (
                  <div className="kv-row" key={v.id}>
                    <input
                      type="checkbox"
                      checked={v.enabled}
                      onChange={(e) => updateVariable(activeEnv.id, v.id, 'enabled', e.target.checked)}
                      className="kv-enable"
                    />
                    <input
                      type="text"
                      value={v.key}
                      onChange={(e) => updateVariable(activeEnv.id, v.id, 'key', e.target.value)}
                      placeholder="Variable name"
                      className="kv-key"
                    />
                    <input
                      type="text"
                      value={v.value}
                      onChange={(e) => updateVariable(activeEnv.id, v.id, 'value', e.target.value)}
                      placeholder="Value"
                      className="kv-value"
                    />
                    <button className="kv-remove" onClick={() => removeVariable(activeEnv.id, v.id)}>
                      ×
                    </button>
                  </div>
                ))}
                <button className="kv-add" onClick={() => addVariable(activeEnv.id)}>
                  + Add Variable
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
