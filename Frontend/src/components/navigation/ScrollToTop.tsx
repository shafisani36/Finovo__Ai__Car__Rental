import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Starts every new page at the top, like a normal website.
 * Links with a #hash keep their in-page jump.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, hash]);

  return null;
}
