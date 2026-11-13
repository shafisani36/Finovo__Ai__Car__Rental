import { useSyncExternalStore } from 'react';

/**
 * Per-browser car lists: saved (favourite) cars, the compare list and recently viewed cars.
 * Stored in localStorage so guests can use them too; every access is guarded because
 * storage can be unavailable (private mode, blocked cookies).
 */
type ListName = 'saved' | 'compare' | 'recent';

const STORAGE_KEYS: Record<ListName, string> = {
  saved: 'finovo_saved_cars',
  compare: 'finovo_compare_cars',
  recent: 'finovo_recent_cars',
};

export const MAX_COMPARE = 3;
const MAX_RECENT = 8;
const MAX_SAVED = 50;

const listeners = new Set<() => void>();
const cache: Partial<Record<ListName, string[]>> = {};

function read(list: ListName): string[] {
  if (cache[list]) return cache[list]!;
  let value: string[] = [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS[list]);
    const parsed = raw ? JSON.parse(raw) : [];
    value = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string').slice(0, MAX_SAVED) : [];
  } catch {
    value = [];
  }
  cache[list] = value;
  return value;
}

function write(list: ListName, ids: string[]) {
  cache[list] = ids;
  try {
    window.localStorage.setItem(STORAGE_KEYS[list], JSON.stringify(ids));
  } catch {
    // Storage full or blocked: the list still works for this visit
  }
  listeners.forEach((listener) => listener());
}

// Keep several open tabs in sync
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    const entry = (Object.entries(STORAGE_KEYS) as [ListName, string][]).find(([, key]) => key === event.key);
    if (!entry) return;
    delete cache[entry[0]];
    listeners.forEach((listener) => listener());
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function useList(list: ListName): string[] {
  return useSyncExternalStore(subscribe, () => read(list), () => []);
}

export function useSavedCars() {
  const saved = useList('saved');
  return {
    saved,
    isSaved: (id: string) => saved.includes(id),
    toggleSaved: (id: string) =>
      write('saved', saved.includes(id) ? saved.filter((x) => x !== id) : [id, ...saved].slice(0, MAX_SAVED)),
  };
}

export function useCompareCars() {
  const compare = useList('compare');
  return {
    compare,
    isCompared: (id: string) => compare.includes(id),
    isFull: compare.length >= MAX_COMPARE,
    /** Returns false when the list is already full. */
    toggleCompare: (id: string): boolean => {
      if (compare.includes(id)) {
        write('compare', compare.filter((x) => x !== id));
        return true;
      }
      if (compare.length >= MAX_COMPARE) return false;
      write('compare', [...compare, id]);
      return true;
    },
    clearCompare: () => write('compare', []),
  };
}

export function useRecentlyViewed() {
  const recent = useList('recent');
  return {
    recent,
    addRecent: (id: string) => {
      const current = read('recent');
      if (current[0] === id) return;
      write('recent', [id, ...current.filter((x) => x !== id)].slice(0, MAX_RECENT));
    },
  };
}
