interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  staleTimeMs: number;
}

type CacheListener = (invalidatedKey: string) => void;

export class QueryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private listeners = new Set<CacheListener>();

  public get<T>(key: string): T | undefined {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return undefined;

    const isStale = Date.now() - entry.timestamp > entry.staleTimeMs;
    if (isStale) {
      return undefined;
    }

    return entry.data;
  }

  public set<T>(key: string, data: T, staleTimeMs: number = 30000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      staleTimeMs,
    });
  }

  /**
   * Invalidates any cache key matching the specified prefix.
   * Notifies all active hook subscribers to trigger re-fetching.
   */
  public invalidateQueries(keyPrefix: string): void {
    for (const key of this.cache.keys()) {
      if (key === keyPrefix || key.startsWith(`${keyPrefix}:`) || key.startsWith(keyPrefix)) {
        this.cache.delete(key);
      }
    }

    // Notify listeners so mounted hooks automatically re-evaluate
    this.listeners.forEach((listener) => listener(keyPrefix));
  }

  public subscribe(listener: CacheListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public clear(): void {
    this.cache.clear();
  }
}

export const queryCache = new QueryCache();
