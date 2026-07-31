import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import type { RequestData, ResponseData, KeyValuePair, Environment } from '../types';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export { generateId };

function replaceVariables(text: string, env: Environment | undefined): string {
  if (!env) return text;
  let result = text;
  for (const v of env.variables) {
    if (v.enabled && v.key) {
      const regex = new RegExp(`\\{\\{${v.key}\\}\\}`, 'g');
      result = result.replace(regex, v.value);
    }
  }
  return result;
}

function buildUrl(url: string, params: KeyValuePair[], env?: Environment): string {
  const resolvedUrl = replaceVariables(url, env);
  const urlObj = new URL(resolvedUrl);
  for (const p of params) {
    if (p.enabled && p.key) {
      urlObj.searchParams.set(p.key, replaceVariables(p.value, env));
    }
  }
  return urlObj.toString();
}

function buildHeaders(headers: KeyValuePair[], env?: Environment): Record<string, string> {
  const result: Record<string, string> = {};
  for (const h of headers) {
    if (h.enabled && h.key) {
      result[h.key] = replaceVariables(h.value, env);
    }
  }
  return result;
}

function buildBody(bodyType: string, bodyContent: string, headers: Record<string, string>, env?: Environment): BodyInit | undefined {
  switch (bodyType) {
    case 'json':
      headers['Content-Type'] = 'application/json';
      return replaceVariables(bodyContent, env);
    case 'form-data': {
      const formData = new FormData();
      try {
        const parsed = JSON.parse(bodyContent);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item.enabled && item.key) {
              formData.append(item.key, replaceVariables(item.value, env));
            }
          }
        }
      } catch {
        // ignore parse errors
      }
      return formData;
    }
    case 'x-www-form-urlencoded': {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      const params = new URLSearchParams();
      try {
        const parsed = JSON.parse(bodyContent);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item.enabled && item.key) {
              params.append(item.key, replaceVariables(item.value, env));
            }
          }
        }
      } catch {
        // ignore parse errors
      }
      return params.toString();
    }
    case 'raw':
      return replaceVariables(bodyContent, env);
    default:
      return undefined;
  }
}

export async function sendRequest(request: RequestData, env?: Environment): Promise<ResponseData> {
  const url = buildUrl(request.url, request.params, env);
  const headers = buildHeaders(request.headers, env);
  const body = buildBody(request.bodyType, request.bodyContent, headers, env);

  const startTime = performance.now();

  let response: Response;
  try {
    response = await tauriFetch(url, {
      method: request.method,
      headers,
      body: methodWithBody(request.method) ? body : undefined,
    });
  } catch (err) {
    const endTime = performance.now();
    const time = Math.round(endTime - startTime);
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      status: 0,
      statusText: `Network Error: ${errMsg}`,
      headers: {},
      body: `请求失败: ${errMsg}\n\nURL: ${url}`,
      time,
      size: 0,
    };
  }

  const endTime = performance.now();
  const time = Math.round(endTime - startTime);

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  const responseBody = await response.text();
  const size = new Blob([responseBody]).size;

  return {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
    body: responseBody,
    time,
    size,
  };
}

function methodWithBody(method: string): boolean {
  return ['POST', 'PUT', 'PATCH'].includes(method);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatJson(json: string): string {
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}

export function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return '#52c41a';
  if (status >= 300 && status < 400) return '#1890ff';
  if (status >= 400 && status < 500) return '#faad14';
  if (status >= 500) return '#ff4d4f';
  return '#666';
}
