import { create } from 'zustand';
import type { RequestState, RequestData, Environment, HistoryItem, ResponseData } from '../types';
import { generateId } from '../utils/request';
import {
  dbCollectionList,
  dbCollectionAdd,
  dbCollectionUpdate,
  dbCollectionDelete,
  dbEnvList,
  dbEnvAdd,
  dbEnvUpdate,
  dbEnvDelete,
  dbEnvGetVariables,
  dbEnvSaveVariables,
  dbHistoryList,
  dbHistoryAdd,
  dbHistoryClear,
  dbHistoryDelete,
  envVarRowToKeyValuePair,
  envRowToEnvironment,
  keyValuePairToEnvVarRow,
  type CollectionItem,
} from '../utils/db';

const defaultRequest: RequestData = {
  method: 'GET',
  url: '',
  params: [],
  headers: [],
  bodyType: 'none',
  bodyContent: '',
};

// 初始化标志
let dbInitialized = false;

async function ensureDbInitialized() {
  if (dbInitialized) return;
  dbInitialized = true;
}

export const useStore = create<RequestState>((set, get) => ({
  request: defaultRequest,
  response: null,
  loading: false,
  environments: [],
  activeEnvId: null,
  history: [],

  // 从数据库加载所有数据
  initFromDb: async () => {
    await ensureDbInitialized();

    try {
      // 加载环境变量
      const envRows = await dbEnvList();
      const envs: Environment[] = [];
      for (const row of envRows) {
        const vars = await dbEnvGetVariables(row.id);
        envs.push(envRowToEnvironment(row, vars.map(envVarRowToKeyValuePair)));
      }

      // 加载历史记录
      const history = await dbHistoryList(100);

      set({
        environments: envs,
        activeEnvId: envs[0]?.id || null,
        history,
      });
    } catch (e) {
      console.error('Failed to load from DB:', e);
    }
  },

  setRequest: (partial) => {
    const newRequest = { ...get().request, ...partial };
    set({ request: newRequest });
  },

  setResponse: (response: ResponseData | null) => set({ response }),
  setLoading: (loading: boolean) => set({ loading }),

  // ============ 环境变量 ============

  addEnvironment: async (env: Environment) => {
    const row = await dbEnvAdd(env.name);
    const newEnv: Environment = { ...env, id: row.id };
    set((state) => ({ environments: [...state.environments, newEnv] }));
  },

  updateEnvironment: async (id: string, partial: Partial<Environment>) => {
    if (partial.name) {
      await dbEnvUpdate(id, partial.name);
    }
    if (partial.variables) {
      const vars = partial.variables.map((v) => keyValuePairToEnvVarRow(v, id));
      await dbEnvSaveVariables(id, vars);
    }
    set((state) => ({
      environments: state.environments.map((e) =>
        e.id === id ? { ...e, ...partial } : e
      ),
    }));
  },

  removeEnvironment: async (id: string) => {
    await dbEnvDelete(id);
    set((state) => {
      const envs = state.environments.filter((e) => e.id !== id);
      const activeId = state.activeEnvId === id
        ? (envs[0]?.id || null)
        : state.activeEnvId;
      return { environments: envs, activeEnvId: activeId };
    });
  },

  setActiveEnvId: (id: string | null) => {
    set({ activeEnvId: id });
  },

  // ============ 历史记录 ============

  addHistory: async (item: HistoryItem) => {
    await dbHistoryAdd(item.method, item.url, item.status, item.time);
    set((state) => ({
      history: [item, ...state.history.filter((h) => h.id !== item.id)].slice(0, 100),
    }));
  },

  removeHistory: async (id: string) => {
    await dbHistoryDelete(id);
    set((state) => ({
      history: state.history.filter((h) => h.id !== id),
    }));
  },

  clearHistory: async () => {
    await dbHistoryClear();
    set({ history: [] });
  },
}));

// ============ Collection Store ============

export interface CollectionState {
  items: CollectionItem[];
  activeItemId: string | null;
  expandedFolders: Set<string>;
  loading: boolean;

  // 初始化
  loadCollection: () => Promise<void>;

  // CRUD
  addFolder: (parentId: string | null, title: string) => Promise<CollectionItem>;
  addRequest: (parentId: string | null, title: string, method?: string, url?: string) => Promise<CollectionItem>;
  updateItem: (id: string, updates: Partial<Pick<CollectionItem, 'title' | 'method' | 'url' | 'params' | 'headers' | 'body_type' | 'body_content'>>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;

  // 选中/展开
  setActiveItem: (id: string | null) => void;
  toggleFolder: (id: string) => void;
  isExpanded: (id: string) => boolean;

  // 保存当前请求到选中项
  saveCurrentRequest: () => Promise<void>;
}

export const useCollectionStore = create<CollectionState>((set, get) => ({
  items: [],
  activeItemId: null,
  expandedFolders: new Set(),
  loading: false,

  loadCollection: async () => {
    set({ loading: true });
    try {
      const items = await dbCollectionList();
      set({ items });
    } catch (e) {
      console.error('Failed to load collection:', e);
    } finally {
      set({ loading: false });
    }
  },

  addFolder: async (parentId, title) => {
    const item = await dbCollectionAdd(parentId, 'folder', title);
    set((state) => ({ items: [...state.items, item] }));
    return item;
  },

  addRequest: async (parentId, title, method, url) => {
    const item = await dbCollectionAdd(parentId, 'request', title, method, url);
    set((state) => ({ items: [...state.items, item] }));
    return item;
  },

  updateItem: async (id, updates) => {
    await dbCollectionUpdate(id, {
      title: updates.title ?? null,
      method: updates.method ?? null,
      url: updates.url ?? null,
      params: updates.params ?? null,
      headers: updates.headers ?? null,
      bodyType: updates.body_type ?? null,
      bodyContent: updates.body_content ?? null,
    });
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    }));
  },

  deleteItem: async (id) => {
    console.log('Store deleteItem called:', id);
    await dbCollectionDelete(id);
    console.log('DB delete done, updating state');
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
      activeItemId: state.activeItemId === id ? null : state.activeItemId,
    }));
  },

  setActiveItem: (id) => {
    set({ activeItemId: id });
  },

  toggleFolder: (id) => {
    set((state) => {
      const newExpanded = new Set(state.expandedFolders);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      return { expandedFolders: newExpanded };
    });
  },

  isExpanded: (id) => {
    return get().expandedFolders.has(id);
  },

  saveCurrentRequest: async () => {
    const { activeItemId } = get();
    if (!activeItemId) return;

    const { request } = useStore.getState();
    await dbCollectionUpdate(activeItemId, {
      method: request.method,
      url: request.url,
      params: JSON.stringify(request.params),
      headers: JSON.stringify(request.headers),
      bodyType: request.bodyType,
      bodyContent: request.bodyContent,
    });

    set((state) => ({
      items: state.items.map((item) =>
        item.id === activeItemId
          ? {
              ...item,
              method: request.method,
              url: request.url,
              params: JSON.stringify(request.params),
              headers: JSON.stringify(request.headers),
              body_type: request.bodyType,
              body_content: request.bodyContent,
            }
          : item
      ),
    }));
  },
}));
