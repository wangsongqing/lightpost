import { useStore, getActiveRequest } from './useStore';
import type { OpenRequest } from '../types';

export function useActiveRequest(): OpenRequest | null {
  return useStore((state) => getActiveRequest(state));
}
