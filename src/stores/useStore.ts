import { create } from 'zustand';
import type { RequestState, RequestData, OpenRequest, Environment, HistoryItem, ResponseData } from '../types';
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

function createOpenRequest(title: string, request?: Partial<RequestData>, collectionItemId?: string): OpenRequest {
  return {
    id: generateId(),
    title,
    collectionItemId: collectionItemId ?? null,
    request: { ...defaultRequest, ...request },
    savedRequest: null,
    isDirty: false,
    response: null,
    loading: false,
  };
}

// 初始化标志
let dbInitialized = false;

async function ensureDbInitialized() {
  if (dbInitialized) return;
  dbInitialized = true;
}

export function getActiveRequest(state: RequestState): OpenRequest | null {
  return state.openRequests.find((r) => r.id === state.activeRequestId) ?? null;
}

export const useStore = create<RequestState>((set, get) => {
  // 初始化一个空白标签
  const initialTab = createOpenRequest('Untitled');

  return {
    openRequests: [initialTab],
    activeRequestId: initialTab.id,
    environments: [],
    activeEnvId: null,
    history: [],

    // 从数据库加载所有数据
    initFromDb: async () => {
      await ensureDbInitialized();

      try {
        const envRows = await dbEnvList();
        const envs: Environment[] = [];
        for (const row of envRows) {
          const vars = await dbEnvGetVariables(row.id);
          envs.push(envRowToEnvironment(row, vars.map(envVarRowToKeyValuePair)));
        }

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

    // ============ 标签页操作 ============

    openNewRequest: () => {
      const tab = createOpenRequest('Untitled');
      set((state) => ({
        openRequests: [...state.openRequests, tab],
        activeRequestId: tab.id,
      }));
      return tab.id;
    },

    openRequestFromCollection: (collectionItemId, title, request) => {
      // 如果已经打开了这个 collection item，直接切换过去
      const existing = get().openRequests.find((r) => r.collectionItemId === collectionItemId);
      if (existing) {
        set({ activeRequestId: existing.id });
        return existing.id;
      }

      // 如果当前活动标签是空白未修改的 Untitled，直接复用它
      const active = getActiveRequest(get());
      if (active && active.title === 'Untitled' && !active.isDirty && !active.request.url && !active.collectionItemId) {
        const updatedTab: OpenRequest = {
          ...active,
          title,
          collectionItemId,
          request: { ...request },
          savedRequest: { ...request },
          isDirty: false,
        };
        set((state) => ({
          openRequests: state.openRequests.map((r) => r.id === active.id ? updatedTab : r),
        }));
        return active.id;
      }

      const tab: OpenRequest = {
        id: generateId(),
        title,
        collectionItemId,
        request: { ...request },
        savedRequest: { ...request },
        isDirty: false,
        response: null,
        loading: false,
      };
      set((state) => ({
        openRequests: [...state.openRequests, tab],
        activeRequestId: tab.id,
      }));
      return tab.id;
    },

    closeRequest: (id) => {
      const state = get();
      const index = state.openRequests.findIndex((r) => r.id === id);
      if (index === -1) return;

      const newRequests = state.openRequests.filter((r) => r.id !== id);

      if (newRequests.length === 0) {
        const freshTab = createOpenRequest('Untitled');
        set({ openRequests: [freshTab], activeRequestId: freshTab.id });
        return;
      }

      let newActiveId = state.activeRequestId;
      if (state.activeRequestId === id) {
        const newIndex = Math.min(index, newRequests.length - 1);
        newActiveId = newRequests[newIndex].id;
      }

      set({ openRequests: newRequests, activeRequestId: newActiveId });
    },

    setActiveRequestId: (id) => {
      set({ activeRequestId: id });
    },

    updateTabTitle: (id, title) => {
      set((state) => ({
        openRequests: state.openRequests.map((r) =>
          r.id === id ? { ...r, title } : r
        ),
      }));
    },

    // ============ 当前请求操作 ============

    setRequest: (partial) => {
      set((state) => {
        const activeId = state.activeRequestId;
        return {
          openRequests: state.openRequests.map((r) => {
            if (r.id !== activeId) return r;
            const newRequest = { ...r.request, ...partial };
            const isDirty = r.savedRequest !== null
              ? JSON.stringify(newRequest) !== JSON.stringify(r.savedRequest)
              : JSON.stringify(newRequest) !== JSON.stringify(defaultRequest);
            return { ...r, request: newRequest, isDirty };
          }),
        };
      });
    },

    markSaved: () => {
      set((state) => {
        const activeId = state.activeRequestId;
        return {
          openRequests: state.openRequests.map((r) => {
            if (r.id !== activeId) return r;
            return { ...r, savedRequest: { ...r.request }, isDirty: false };
          }),
        };
      });
    },

    setResponse: (response) => {
      set((state) => {
        const activeId = state.activeRequestId;
        return {
          openRequests: state.openRequests.map((r) =>
            r.id === activeId ? { ...r, response } : r
          ),
        };
      });
    },

    setLoading: (loading) => {
      set((state) => {
        const activeId = state.activeRequestId;
        return {
          openRequests: state.openRequests.map((r) =>
            r.id === activeId ? { ...r, loading } : r
          ),
        };
      });
    },

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
  };
});

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

    const mainState = useStore.getState();
    const activeTab = mainState.openRequests.find((r) => r.id === mainState.activeRequestId);
    if (!activeTab) return;

    const request = activeTab.request;
    await dbCollectionUpdate(activeItemId, {
      method: request.method,
      url: request.url,
      params: JSON.stringify(request.params),
      headers: JSON.stringify(request.headers),
      bodyType: request.bodyType,
      bodyContent: request.bodyContent,
    });

    // 更新 collection items
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

    // 更新 main store 的 openRequests（标记为已保存）
    useStore.setState((state) => ({
      openRequests: state.openRequests.map((r) =>
        r.id === state.activeRequestId ? { ...r, savedRequest: { ...request }, isDirty: false } : r
      ),
    }));
  },
}));
