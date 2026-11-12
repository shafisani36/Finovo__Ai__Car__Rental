import { useEffect, useState } from 'react';
import { publicSiteApi, type PublicReview, type PublicStats, type SiteInfo } from '../api/services/publicSite.api';

/**
 * Shared, once-per-page-load requests for the public website data, so the footer, the FAQ and the
 * contact page do not each call the API.
 */
const requests: {
  site?: Promise<SiteInfo | null>;
  stats?: Promise<PublicStats | null>;
  reviews?: Promise<PublicReview[]>;
} = {};

function useShared<T>(load: () => Promise<T>, initial: T): T {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    let active = true;
    load().then((v) => {
      if (active) setValue(v);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
}

/** Company contact details (null fields are simply not shown). */
export function useSiteInfo(): SiteInfo | null {
  return useShared(() => {
    requests.site ??= publicSiteApi
      .getSite()
      .then((r) => r.site)
      .catch(() => {
        requests.site = undefined;
        return null;
      });
    return requests.site;
  }, null);
}

/** Live business numbers; null while loading or when the API is unreachable. */
export function usePublicStats(): PublicStats | null {
  return useShared(() => {
    requests.stats ??= publicSiteApi
      .getStats()
      .then((r) => r.stats)
      .catch(() => {
        requests.stats = undefined;
        return null;
      });
    return requests.stats;
  }, null);
}

/** Real approved customer reviews; empty when there are none yet. */
export function usePublicReviews(): PublicReview[] {
  return useShared(() => {
    requests.reviews ??= publicSiteApi
      .getReviews(6)
      .then((r) => r.reviews)
      .catch(() => {
        requests.reviews = undefined;
        return [];
      });
    return requests.reviews;
  }, []);
}

/** "1234" -> "1.2K+", "87" -> "87" */
export function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M+`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K+`;
  return String(value);
}

/** "+92 (300) 123-4567" -> "tel:+923001234567" */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^+\d]/g, '')}`;
}
