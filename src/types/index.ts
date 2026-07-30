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

export interface RequestState {
  request: RequestData;
  response: ResponseData | null;
  loading: boolean;
  environments: Environment[];
  activeEnvId: string | null;
  history: HistoryItem[];

  initFromDb: () => Promise<void>;
  setRequest: (request: Partial<RequestData>) => void;
  setResponse: (response: ResponseData | null) => void;
  setLoading: (loading: boolean) => void;
  addEnvironment: (env: Environment) => Promise<void>;
  updateEnvironment: (id: string, env: Partial<Environment>) => Promise<void>;
  removeEnvironment: (id: string) => Promise<void>;
  setActiveEnvId: (id: string | null) => void;
  addHistory: (item: HistoryItem) => Promise<void>;
  removeHistory: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
}
