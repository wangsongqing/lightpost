import { useStore } from '../stores/useStore';
import { generateId } from '../utils/request';
import type { KeyValuePair } from '../types';

interface Props {
  data: KeyValuePair[];
  onChange: (data: KeyValuePair[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export function KeyValueEditor({ data, onChange, keyPlaceholder = 'Key', valuePlaceholder = 'Value' }: Props) {
  const addRow = () => {
    onChange([...data, { id: generateId(), key: '', value: '', enabled: true }]);
  };

  const updateRow = (id: string, field: 'key' | 'value' | 'enabled', val: string | boolean) => {
    onChange(data.map((item) => (item.id === id ? { ...item, [field]: val } : item)));
  };

  const removeRow = (id: string) => {
    const filtered = data.filter((item) => item.id !== id);
    onChange(filtered.length === 0 ? [{ id: generateId(), key: '', value: '', enabled: true }] : filtered);
  };

  return (
    <div className="key-value-editor">
      <div className="kv-header">
        <span className="kv-col-enable"></span>
        <span className="kv-col-key">Key</span>
        <span className="kv-col-value">Value</span>
        <span className="kv-col-action"></span>
      </div>
      {data.map((item) => (
        <div className="kv-row" key={item.id}>
          <input
            type="checkbox"
            checked={item.enabled}
            onChange={(e) => updateRow(item.id, 'enabled', e.target.checked)}
            className="kv-enable"
          />
          <input
            type="text"
            value={item.key}
            onChange={(e) => updateRow(item.id, 'key', e.target.value)}
            placeholder={keyPlaceholder}
            className="kv-key"
          />
          <input
            type="text"
            value={item.value}
            onChange={(e) => updateRow(item.id, 'value', e.target.value)}
            placeholder={valuePlaceholder}
            className="kv-value"
          />
          <button className="kv-remove" onClick={() => removeRow(item.id)}>
            ×
          </button>
        </div>
      ))}
      <button className="kv-add" onClick={addRow}>
        + Add
      </button>
    </div>
  );
}
