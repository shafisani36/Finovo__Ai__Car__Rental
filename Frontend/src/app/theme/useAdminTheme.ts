import { useCallback, useEffect, useState } from 'react';

export type AdminTheme = 'light' | 'dark';

const STORAGE_KEY = 'finovo_admin_theme';
const HTML_ATTRIBUTE = 'data-admin-theme';

function readStoredTheme(): AdminTheme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // Storage can be blocked (private mode); fall back to the system setting
  }
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

/**
 * Light or dark look of the admin area. The choice is remembered in this browser and is applied to
 * <html data-admin-theme> only while the admin area is open, so the public site and the customer
 * portal keep their own look.
 */
export function useAdminTheme() {
  const [theme, setTheme] = useState<AdminTheme>(readStoredTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute(HTML_ATTRIBUTE, theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Not saved; the theme still applies for this visit
    }
  }, [theme]);

  // Leaving the admin area removes the dark look again
  useEffect(() => () => document.documentElement.removeAttribute(HTML_ATTRIBUTE), []);

  // Another tab changed the theme
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && (event.newValue === 'light' || event.newValue === 'dark')) setTheme(event.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggleTheme = useCallback(() => setTheme((current) => (current === 'dark' ? 'light' : 'dark')), []);

  return { theme, isDark: theme === 'dark', toggleTheme };
}
