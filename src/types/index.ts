export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export type BodyType = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw';

export interface RequestData {
  method: HttpMethod;
  url: string;
  params: KeyValuePair[];
  headers: KeyValuePair[];
  bodyType: BodyType;
  bodyContent: string;
}

export interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
}

export interface Environment {
  id: string;
  name: string;
  variables: KeyValuePair[];
}

export interface HistoryItem {
  id: string;
  method: HttpMethod;
  url: string;
  timestamp: number;
  status?: number;
  time?: number;
}

export interface OpenRequest {
  id: string;
  title: string;
  collectionItemId: string | null;
  request: RequestData;
  savedRequest: RequestData | null;
  isDirty: boolean;
  response: ResponseData | null;
  loading: boolean;
}

export interface RequestState {
  openRequests: OpenRequest[];
  activeRequestId: string | null;
  environments: Environment[];
  activeEnvId: string | null;
  history: HistoryItem[];

  initFromDb: () => Promise<void>;

  // 标签页操作
  openNewRequest: () => string;
  openRequestFromCollection: (collectionItemId: string, title: string, request: RequestData) => string;
  closeRequest: (id: string) => void;
  setActiveRequestId: (id: string) => void;
  updateTabTitle: (id: string, title: string) => void;

  // 当前请求操作
  setRequest: (request: Partial<RequestData>) => void;
  markSaved: () => void;
  setResponse: (response: ResponseData | null) => void;
  setLoading: (loading: boolean) => void;

  // 环境变量
  addEnvironment: (env: Environment) => Promise<void>;
  updateEnvironment: (id: string, env: Partial<Environment>) => Promise<void>;
  removeEnvironment: (id: string) => Promise<void>;
  setActiveEnvId: (id: string | null) => void;

  // 历史记录
  addHistory: (item: HistoryItem) => Promise<void>;
  removeHistory: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
}
