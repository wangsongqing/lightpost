import { invoke } from '@tauri-apps/api/core';
import type { KeyValuePair, Environment, HistoryItem } from '../types';

// ============ Collection 类型 ============

export interface CollectionItem {
  id: string;
  parent_id: string | null;
  item_type: 'folder' | 'request';
  title: string;
  method: string | null;
  url: string | null;
  params: string | null;
  headers: string | null;
  body_type: string | null;
  body_content: string | null;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

// ============ Collection API ============

export async function dbCollectionList(): Promise<CollectionItem[]> {
  return invoke<CollectionItem[]>('collection_list');
}

export async function dbCollectionAdd(
  parentId: string | null,
  itemType: 'folder' | 'request',
  title: string,
  method?: string,
  url?: string,
): Promise<CollectionItem> {
  return invoke<CollectionItem>('collection_add', {
    parentId,
    itemType,
    title,
    method: method ?? null,
    url: url ?? null,
  });
}

export async function dbCollectionUpdate(
  id: string,
  updates: {
    title?: string | null;
    method?: string | null;
    url?: string | null;
    params?: string | null;
    headers?: string | null;
    bodyType?: string | null;
    bodyContent?: string | null;
  },
): Promise<void> {
  return invoke('collection_update', {
    id,
    title: updates.title ?? null,
    method: updates.method ?? null,
    url: updates.url ?? null,
    params: updates.params ?? null,
    headers: updates.headers ?? null,
    bodyType: updates.bodyType ?? null,
    bodyContent: updates.bodyContent ?? null,
  });
}

export async function dbCollectionMove(
  id: string,
  parentId: string | null,
  sortOrder: number,
): Promise<void> {
  return invoke('collection_move', { id, parentId, sortOrder });
}

export async function dbCollectionDelete(id: string): Promise<void> {
  try {
    await invoke('collection_delete', { id });
  } catch (e) {
    console.error('Delete failed:', e);
    throw e;
  }
}

// ============ Environment API ============

export interface EnvRow {
  id: string;
  name: string;
  sort_order: number;
  created_at: number;
}

export interface EnvVarRow {
  id: string;
  env_id: string;
  key: string;
  value: string;
  enabled: number;
}

export async function dbEnvList(): Promise<EnvRow[]> {
  return invoke<EnvRow[]>('env_list');
}

export async function dbEnvAdd(name: string): Promise<EnvRow> {
  return invoke<EnvRow>('env_add', { name });
}

export async function dbEnvUpdate(id: string, name: string): Promise<void> {
  return invoke('env_update', { id, name });
}

export async function dbEnvDelete(id: string): Promise<void> {
  return invoke('env_delete', { id });
}

export async function dbEnvGetVariables(envId: string): Promise<EnvVarRow[]> {
  return invoke<EnvVarRow[]>('env_get_variables', { envId });
}

export async function dbEnvSaveVariables(envId: string, variables: EnvVarRow[]): Promise<void> {
  return invoke('env_save_variables', { envId, variables });
}

// ============ History API ============

export async function dbHistoryList(limit?: number): Promise<HistoryItem[]> {
  return invoke<HistoryItem[]>('history_list', { limit: limit ?? null });
}

export async function dbHistoryAdd(
  method: string,
  url: string,
  status?: number,
  time?: number,
): Promise<void> {
  return invoke('history_add', {
    method,
    url,
    status: status ?? null,
    time: time ?? null,
  });
}

export async function dbHistoryClear(): Promise<void> {
  return invoke('history_clear');
}

export async function dbHistoryDelete(id: string): Promise<void> {
  return invoke('history_delete', { id });
}

// ============ 辅助函数：转换 DB 类型到前端类型 ============

export function envVarRowToKeyValuePair(row: EnvVarRow): KeyValuePair {
  return {
    id: row.id,
    key: row.key,
    value: row.value,
    enabled: row.enabled === 1,
  };
}

export function keyValuePairToEnvVarRow(
  kv: KeyValuePair,
  envId: string,
): EnvVarRow {
  return {
    id: kv.id,
    env_id: envId,
    key: kv.key,
    value: kv.value,
    enabled: kv.enabled ? 1 : 0,
  };
}

export function envRowToEnvironment(row: EnvRow, variables: KeyValuePair[]): Environment {
  return {
    id: row.id,
    name: row.name,
    variables,
  };
}
