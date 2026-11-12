import { apiClient } from '../client';

export interface PublicStats {
  vehicles: number;
  customers: number;
  branches: number;
  brands: string[];
  cities: number;
  reviewCount: number;
  averageRating: number | null;
}

export interface PublicReview {
  id: string;
  rating: number;
  comment: string;
  customerName: string;
  vehicle: string;
  createdAt: string;
}

export interface PublicBranch {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  email: string | null;
  openingHours: string | null;
}

export interface SiteInfo {
  companyName: string;
  supportPhone: string | null;
  supportEmail: string | null;
  whatsapp: string | null;
  foundedYear: number | null;
  address: string | null;
  openingHours: string | null;
  branches: PublicBranch[];
  social: {
    facebook: string | null;
    instagram: string | null;
    x: string | null;
    linkedin: string | null;
    youtube: string | null;
  };
}

export const publicSiteApi = {
  getStats: () => apiClient.get<{ success: boolean; stats: PublicStats }>('/public/stats', { skipAuth: true }),
  getReviews: (limit = 6) =>
    apiClient.get<{ success: boolean; reviews: PublicReview[] }>('/public/reviews', { params: { limit }, skipAuth: true }),
  getSite: () => apiClient.get<{ success: boolean; site: SiteInfo }>('/public/site', { skipAuth: true }),
};
