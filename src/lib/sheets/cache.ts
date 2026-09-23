interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const cacheStore = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string): T | null {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cacheStore.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCached<T>(key: string, data: T, ttlMs: number): void {
  cacheStore.set(key, {
    data,
    expiry: Date.now() + ttlMs,
  });
}

export function invalidateCache(key: string): void {
  cacheStore.delete(key);
}

export function invalidatePrefix(prefix: string): void {
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key);
    }
  }
}

// Master data di-cache selama 10 menit
export const MASTER_CACHE_KEY = "master_data_v1";
export const MASTER_CACHE_TTL = 10 * 60 * 1000;

// Dashboard data di-cache selama 5 menit
export const DASHBOARD_CACHE_KEY = "dashboard_data_v1";
export const DASHBOARD_CACHE_TTL = 5 * 60 * 1000;

export function invalidateMasterCache(): void {
  invalidateCache(MASTER_CACHE_KEY);
}

export function invalidateDashboardCache(): void {
  invalidateCache(DASHBOARD_CACHE_KEY);
}
