import { useCallback, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'finovo_theme';
/** Older key used when only the admin area had a dark mode */
const LEGACY_KEY = 'finovo_admin_theme';
const HTML_ATTRIBUTE = 'data-theme';

const listeners = new Set<() => void>();

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // Storage can be blocked (private mode); fall back to the system setting
  }
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

let current: Theme = typeof window === 'undefined' ? 'light' : readStoredTheme();

function apply(theme: Theme): void {
  if (typeof document !== 'undefined') document.documentElement.setAttribute(HTML_ATTRIBUTE, theme);
}

/** Applies the saved theme before the first render, so pages do not flash in the wrong colours. */
export function initTheme(): void {
  apply(current);
  // Another tab changed the theme
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY && (event.newValue === 'light' || event.newValue === 'dark') && event.newValue !== current) {
      current = event.newValue;
      apply(current);
      listeners.forEach((notify) => notify());
    }
  });
}

function setTheme(theme: Theme): void {
  current = theme;
  apply(theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Not saved; the theme still applies for this visit
  }
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void): () => void {
  listeners.add(notify);
  return () => listeners.delete(notify);
}

/**
 * Light or dark look of the whole app (website, customer portal and admin area). One choice, remembered in
 * this browser, shared by every toggle on the page and by other open tabs.
 */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => current, () => 'light' as Theme);
  const toggleTheme = useCallback(() => setTheme(current === 'dark' ? 'light' : 'dark'), []);
  return { theme, isDark: theme === 'dark', toggleTheme };
}
