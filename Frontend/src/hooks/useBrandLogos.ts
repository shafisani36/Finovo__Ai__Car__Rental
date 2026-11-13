import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

interface BrandRow {
  name: string;
  logoUrl?: string | null;
}

let request: Promise<Map<string, string>> | null = null;

/** Brand name (lower case) to its uploaded logo, from Admin > Brands. Missing logos are simply absent. */
export function useBrandLogos(): Map<string, string> {
  const [logos, setLogos] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    let active = true;
    request ??= apiClient
      .get<{ success: boolean; brands: BrandRow[] }>('/vehicles/brands', { skipAuth: true })
      .then((res) => new Map((res.brands || []).filter((b) => b.logoUrl).map((b) => [b.name.trim().toLowerCase(), b.logoUrl!])))
      .catch(() => {
        request = null;
        return new Map<string, string>();
      });
    request.then((map) => {
      if (active) setLogos(map);
    });
    return () => {
      active = false;
    };
  }, []);
  return logos;
}
