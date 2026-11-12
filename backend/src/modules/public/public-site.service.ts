import { prisma } from '../../infrastructure/prisma/prisma.client';

/** Short in-memory cache: public pages are read often and these numbers change slowly. */
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { expires: number; value: unknown }>();

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const value = await load();
  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, value });
  return value;
}

export class PublicSiteService {
  /** Live business numbers for the home and about pages. */
  static getStats() {
    return cached('stats', async () => {
      const [vehicles, customers, branches, reviewAggregate, brandRows] = await Promise.all([
        prisma.vehicle.count({
          where: { deletedAt: null, isListed: true, isPublicCatalog: true, status: { not: 'ARCHIVED' } },
        }),
        prisma.customer.count(),
        prisma.branch.findMany({ where: { isActive: true }, select: { city: true } }),
        prisma.vehicleReview.aggregate({ where: { isApproved: true }, _avg: { rating: true }, _count: { _all: true } }),
        prisma.vehicle.findMany({
          where: { deletedAt: null, isListed: true, isPublicCatalog: true, status: { not: 'ARCHIVED' } },
          distinct: ['brand'],
          select: { brand: true },
        }),
      ]);
      const cities = new Set(branches.map((b) => b.city.trim().toLowerCase()).filter(Boolean));
      return {
        vehicles,
        customers,
        branches: branches.length,
        brands: brandRows.map((row) => row.brand).filter(Boolean).sort(),
        cities: cities.size,
        reviewCount: reviewAggregate._count._all,
        averageRating: reviewAggregate._avg.rating ? Math.round(reviewAggregate._avg.rating * 10) / 10 : null,
      };
    });
  }

  /** Real, approved customer reviews with a comment (no invented testimonials). */
  static getReviews(limit = 6) {
    const safeLimit = Math.min(Math.max(1, Math.floor(limit) || 6), 12);
    return cached(`reviews:${safeLimit}`, async () => {
      const reviews = await prisma.vehicleReview.findMany({
        where: { isApproved: true, comment: { not: null } },
        orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
        take: safeLimit,
        include: {
          customer: { select: { fullName: true } },
          vehicle: { select: { brand: true, model: true } },
        },
      });
      return reviews
        .filter((r) => (r.comment || '').trim().length > 0)
        .map((r) => {
          // Privacy: first name + last initial only
          const parts = r.customer.fullName.trim().split(/\s+/);
          const name = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
          return {
            id: r.id,
            rating: r.rating,
            comment: r.comment!.trim(),
            customerName: name,
            vehicle: `${r.vehicle.brand} ${r.vehicle.model}`,
            createdAt: r.createdAt,
          };
        });
    });
  }

  /**
   * Company contact details shown in the footer, contact page and FAQ. Values come from the backend
   * environment; anything not configured falls back to the head-office (first active) branch.
   */
  static getSiteInfo() {
    return cached('site', async () => {
      const branches = await prisma.branch.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
        take: 12,
        select: { id: true, name: true, address: true, city: true, phone: true, email: true, openingHours: true },
      });
      const headOffice = branches[0] ?? null;
      const address =
        process.env.COMPANY_ADDRESS ||
        (headOffice ? [headOffice.address, headOffice.city].filter(Boolean).join(', ') : null);
      return {
        companyName: process.env.COMPANY_NAME || 'Finovo Car Rental',
        supportPhone: process.env.SUPPORT_PHONE || headOffice?.phone || null,
        supportEmail: process.env.SUPPORT_EMAIL || headOffice?.email || null,
        whatsapp: process.env.SUPPORT_WHATSAPP || null,
        foundedYear: Number(process.env.COMPANY_FOUNDED_YEAR) || null,
        address: address || null,
        openingHours: process.env.SUPPORT_HOURS || headOffice?.openingHours || null,
        branches: branches.map((b) => ({
          id: b.id,
          name: b.name,
          address: [b.address, b.city].filter(Boolean).join(', '),
          phone: b.phone,
          email: b.email,
          openingHours: b.openingHours,
        })),
        apps: {
          ios: process.env.APP_STORE_URL || null,
          android: process.env.PLAY_STORE_URL || null,
        },
        social: {
          facebook: process.env.SOCIAL_FACEBOOK_URL || null,
          instagram: process.env.SOCIAL_INSTAGRAM_URL || null,
          x: process.env.SOCIAL_X_URL || null,
          linkedin: process.env.SOCIAL_LINKEDIN_URL || null,
          youtube: process.env.SOCIAL_YOUTUBE_URL || null,
        },
      };
    });
  }
}
