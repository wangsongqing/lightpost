import { useState, useCallback } from 'react';
import { useStore } from '../stores/useStore';
import { useActiveRequest } from '../stores/useActiveRequest';
import type { BodyType, KeyValuePair, RequestData } from '../types';
import { KeyValueEditor } from './KeyValueEditor';

const BODY_TYPES: { value: BodyType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'json', label: 'JSON' },
  { value: 'form-data', label: 'Form Data' },
  { value: 'x-www-form-urlencoded', label: 'URL Encoded' },
  { value: 'raw', label: 'Raw' },
];

const emptyRequest: RequestData = {
  method: 'GET',
  url: '',
  params: [],
  headers: [],
  bodyType: 'none',
  bodyContent: '',
};

export function RequestBuilder() {
  const activeReqTab = useActiveRequest();
  const request: RequestData = activeReqTab?.request ?? emptyRequest;
  const { setRequest } = useStore();
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body'>('headers');

  const updateParams = (params: KeyValuePair[]) => setRequest({ params });
  const updateHeaders = (headers: KeyValuePair[]) => setRequest({ headers });

  return (
    <div className="request-builder">
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
