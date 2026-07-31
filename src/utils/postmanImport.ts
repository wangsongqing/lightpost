// Postman 集合导入工具

export interface PostmanHeader {
  key: string;
  value: string;
  disabled?: boolean;
}

export interface PostmanQueryParam {
  key: string;
  value: string;
  disabled?: boolean;
}

export interface PostmanUrl {
  raw: string;
  protocol?: string;
  host?: string[];
  path?: string[];
  query?: PostmanQueryParam[];
}

export interface PostmanBody {
  mode: 'raw' | 'formdata' | 'urlencoded' | 'file' | 'graphql';
  raw?: string;
  formdata?: { key: string; value: string; type: string; disabled?: boolean }[];
  urlencoded?: { key: string; value: string; disabled?: boolean }[];
  options?: { raw?: { language?: string } };
}

export interface PostmanAuth {
  type: string;
  bearer?: { key: string; value: string; type: string }[];
}

export interface PostmanRequest {
  method: string;
  url: PostmanUrl | string;
  header?: PostmanHeader[];
  body?: PostmanBody | null;
  auth?: PostmanAuth | null;
}

export interface PostmanItem {
  name: string;
  item?: PostmanItem[];
  request?: PostmanRequest;
}

export interface PostmanCollection {
  info: { name: string; schema?: string };
  name?: string;
  item: PostmanItem[];
}

// 将 Postman 变量语法 <<xxx>> 转换为 {{xxx}}
function convertVariables(text: string | undefined | null): string {
  if (!text) return '';
  return text.replace(/<<([^>]+)>>/g, '{{$1}}');
}

// 解析 URL，提取 query 参数
function parseUrl(raw: string): { url: string; params: { key: string; value: string; enabled: boolean }[] } {
  // 将 Postman 变量语法 <<xxx>> 转换为 {{xxx}}
  raw = convertVariables(raw);
  // 查找 ? 分隔符
  const queryStart = raw.indexOf('?');
  if (queryStart === -1) {
    return { url: raw, params: [] };
  }

  const url = raw.substring(0, queryStart);
  const queryString = raw.substring(queryStart + 1);
  const params: { key: string; value: string; enabled: boolean }[] = [];

  queryString.split('&').forEach((pair) => {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) {
      if (pair) params.push({ key: pair, value: '', enabled: true });
    } else {
      params.push({
        key: pair.substring(0, eqIdx),
        value: pair.substring(eqIdx + 1),
        enabled: true,
      });
    }
  });

  return { url, params };
}

// 转换 Postman body 到我们的格式
function convertBody(body: PostmanBody | null | undefined): { bodyType: string; bodyContent: string } {
  if (!body) return { bodyType: 'none', bodyContent: '' };

  switch (body.mode) {
    case 'raw':
      const lang = body.options?.raw?.language;
      return {
        bodyType: lang === 'json' ? 'json' : 'raw',
        bodyContent: convertVariables(body.raw || ''),
      };
    case 'formdata':
      return {
        bodyType: 'form-data',
        bodyContent: JSON.stringify(
          (body.formdata || [])
            .filter((f) => !f.disabled)
            .map((f) => ({ key: f.key, value: convertVariables(f.value), type: f.type || 'text' }))
        ),
      };
    case 'urlencoded':
      return {
        bodyType: 'x-www-form-urlencoded',
        bodyContent: JSON.stringify(
          (body.urlencoded || [])
            .filter((f) => !f.disabled)
            .map((f) => ({ key: f.key, value: convertVariables(f.value) }))
        ),
      };
    default:
      return { bodyType: 'none', bodyContent: '' };
  }
}

// 转换 auth 为 headers
function convertAuth(auth: PostmanAuth | null | undefined): { key: string; value: string; enabled: boolean }[] {
  if (!auth || auth.type !== 'bearer' || !auth.bearer) return [];
  const token = auth.bearer.find((b) => b.key === 'token');
  if (!token?.value) return [];
  return [{ key: 'Authorization', value: convertVariables(`Bearer ${token.value}`), enabled: true }];
}

// 获取原始 URL 字符串
function getRawUrl(url: PostmanUrl | string): string {
  if (typeof url === 'string') return url;
  return url.raw || '';
}

// 递归导入的上下文
import type { CollectionItem } from './db';

export interface ImportResult {
  folderCount: number;
  requestCount: number;
}

// 递归导入 Postman 集合到数据库
export async function importPostmanCollection(
  collection: PostmanCollection,
  addFolder: (parentId: string | null, title: string) => Promise<CollectionItem>,
  addRequest: (parentId: string | null, title: string, method?: string, url?: string) => Promise<CollectionItem>,
  updateItem: (id: string, updates: Partial<CollectionItem>) => Promise<void>,
  targetParentId: string | null = null,
): Promise<ImportResult> {
  let folderCount = 0;
  let requestCount = 0;

  async function processItems(items: PostmanItem[], parentId: string | null) {
    for (const item of items) {
      if (item.item) {
        // 这是一个文件夹
        const folder = await addFolder(parentId, item.name);
        folderCount++;
        await processItems(item.item, folder.id);
      } else if (item.request) {
        // 这是一个请求
        const req = item.request;
        const rawUrl = getRawUrl(req.url);
        const { url, params } = parseUrl(rawUrl);
        const { bodyType, bodyContent } = convertBody(req.body);

        // 合并 headers：原始 headers + auth headers
        const headers = [
          ...(req.header || []).filter((h) => !h.disabled && h.key).map((h) => ({
            key: h.key,
            value: convertVariables(h.value),
            enabled: true,
          })),
          ...convertAuth(req.auth),
        ];

        const requestItem = await addRequest(parentId, item.name, req.method, url);
        requestCount++;

        // 更新额外字段
        await updateItem(requestItem.id, {
          params: params.length > 0 ? JSON.stringify(params) : null,
          headers: headers.length > 0 ? JSON.stringify(headers) : null,
          body_type: bodyType !== 'none' ? bodyType : null,
          body_content: bodyContent || null,
        });
      }
    }
  }

  await processItems(collection.item, targetParentId);

  return { folderCount, requestCount };
}
