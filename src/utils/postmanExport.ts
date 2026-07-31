// Postman 集合导出工具
// 导出为标准 Postman Collection v2.1 格式

import type { CollectionItem } from './db';
import type { PostmanCollection, PostmanItem, PostmanRequest, PostmanUrl, PostmanBody, PostmanHeader } from './postmanImport';

// 构建 Postman URL 对象
function buildPostmanUrl(url: string): PostmanUrl {
  if (!url) {
    return { raw: '', protocol: 'https', path: [] };
  }

  // 尝试解析 URL
  let protocol = 'https';
  let raw = url;
  let pathParts: string[] = [];

  // 如果有协议前缀
  const protocolMatch = url.match(/^(https?):\/\//);
  if (protocolMatch) {
    protocol = protocolMatch[1];
  }

  // 提取 path 部分
  try {
    const urlWithoutProtocol = url.replace(/^(https?):\/\//, '');
    const pathStart = urlWithoutProtocol.indexOf('/');
    if (pathStart !== -1) {
      const pathAndQuery = urlWithoutProtocol.substring(pathStart);
      const queryStart = pathAndQuery.indexOf('?');
      const pathStr = queryStart !== -1 ? pathAndQuery.substring(0, queryStart) : pathAndQuery;
      pathParts = pathStr.split('/').filter(Boolean);
      if (pathParts.length > 0 && pathParts[0] !== '') {
        // 第一个 path 段可能包含 host，需要处理
      }
    }
  } catch {
    // 解析失败就用 raw
  }

  return {
    raw,
    protocol,
    path: pathParts.length > 0 ? pathParts : [url],
  };
}

// 构建 Postman body 对象
function buildPostmanBody(bodyType: string | null, bodyContent: string | null): PostmanBody | undefined {
  if (!bodyType || !bodyContent) return undefined;

  switch (bodyType) {
    case 'json':
      return {
        mode: 'raw',
        raw: bodyContent,
        options: { raw: { language: 'json' } },
      };
    case 'raw':
      return {
        mode: 'raw',
        raw: bodyContent,
      };
    case 'form-data':
      try {
        const items = JSON.parse(bodyContent);
        return {
          mode: 'formdata',
          formdata: items.map((item: { key: string; value: string; type?: string }) => ({
            key: item.key,
            value: item.value,
            type: item.type || 'text',
          })),
        };
      } catch {
        return { mode: 'raw', raw: bodyContent };
      }
    case 'x-www-form-urlencoded':
      try {
        const items = JSON.parse(bodyContent);
        return {
          mode: 'urlencoded',
          urlencoded: items.map((item: { key: string; value: string }) => ({
            key: item.key,
            value: item.value,
          })),
        };
      } catch {
        return { mode: 'raw', raw: bodyContent };
      }
    default:
      return undefined;
  }
}

// 构建 Postman header 数组
function buildPostmanHeaders(headersJson: string | null): PostmanHeader[] {
  if (!headersJson) return [];
  try {
    const headers = JSON.parse(headersJson);
    return headers
      .filter((h: { key: string; enabled?: boolean }) => h.key)
      .map((h: { key: string; value: string; enabled?: boolean }) => ({
        key: h.key,
        value: h.value,
        disabled: h.enabled === false,
      }));
  } catch {
    return [];
  }
}

// 构建 Postman 请求对象
function buildPostmanRequest(item: CollectionItem): PostmanRequest {
  return {
    method: item.method || 'GET',
    url: buildPostmanUrl(item.url || ''),
    header: buildPostmanHeaders(item.headers),
    body: buildPostmanBody(item.body_type, item.body_content),
  };
}

// 递归构建 Postman item 树
function buildPostmanItems(
  items: CollectionItem[],
  parentId: string | null,
): PostmanItem[] {
  const children = items.filter((i) => i.parent_id === parentId);

  // 按 sort_order 和 created_at 排序
  children.sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.created_at - b.created_at;
  });

  return children.map((item) => {
    if (item.item_type === 'folder') {
      return {
        name: item.title,
        item: buildPostmanItems(items, item.id),
      };
    } else {
      return {
        name: item.title,
        request: buildPostmanRequest(item),
      };
    }
  });
}

// 导出为 Postman 集合
export function exportToPostman(
  items: CollectionItem[],
  collectionName: string = 'LightPost Export',
): PostmanCollection {
  return {
    info: {
      name: collectionName,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: buildPostmanItems(items, null),
  };
}

// 下载 JSON 文件
export function downloadJson(data: unknown, filename: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
