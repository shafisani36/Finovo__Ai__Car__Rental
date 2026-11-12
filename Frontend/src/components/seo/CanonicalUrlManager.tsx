import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Routes that must never be indexed by search engines (private dashboards and auth flows). */
const NO_INDEX_PREFIXES = [
  '/admin',
  '/customer',
  '/dashboard',
  '/login',
  '/register',
  '/forgot-password',
  '/verify-code',
  '/reset-password',
  '/unauthorized',
];

/**
 * Canonical origin for SEO. Set VITE_SITE_URL to the production domain (for example https://www.finovo.com)
 * so canonical links always point to the live site, even from preview or staging hosts.
 */
function getSiteOrigin(): string {
  const configured = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim();
  return (configured || window.location.origin).replace(/\/+$/, '');
}

/** Builds the canonical path: no query string, no hash, no trailing slash (except the home page). */
export function buildCanonicalUrl(pathname: string, origin = getSiteOrigin()): string {
  const cleanPath = pathname === '/' ? '/' : pathname.replace(/\/+$/, '').toLowerCase();
  return `${origin}${cleanPath}`;
}

function upsertHeadElement<T extends HTMLElement>(selector: string, create: () => T): T {
  const existing = document.head.querySelector<T>(selector);
  if (existing) return existing;
  const element = create();
  document.head.appendChild(element);
  return element;
}

/**
 * Keeps <link rel="canonical">, og:url and robots meta in sync with the current route
 * so Google indexes one clean URL per page (filters such as ?pickupDate=... are not separate pages).
 */
export function CanonicalUrlManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const canonicalUrl = buildCanonicalUrl(pathname);
    const isPrivate = NO_INDEX_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

    const canonical = upsertHeadElement('link[rel="canonical"]', () => {
      const link = document.createElement('link');
      link.rel = 'canonical';
      return link;
    });
    canonical.href = canonicalUrl;

    const ogUrl = upsertHeadElement('meta[property="og:url"]', () => {
      const meta = document.createElement('meta');
      meta.setAttribute('property', 'og:url');
      return meta;
    });
    ogUrl.content = canonicalUrl;

    const robots = upsertHeadElement('meta[name="robots"]', () => {
      const meta = document.createElement('meta');
      meta.name = 'robots';
      return meta;
    });
    robots.content = isPrivate ? 'noindex, nofollow' : 'index, follow';
  }, [pathname]);

  return null;
}
