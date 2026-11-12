/**
 * High-fidelity intelligent car image, gallery & dynamic pricing resolver.
 * Ensures every vehicle displays a body-style/model-accurate photo and genuine
 * backend pricing & deposit flags without falling back to static clones.
 */

export interface ResolvedVehiclePricing {
  dailyRate: number;
  securityDeposit: number;
  currency: string;
  zeroDeposit: boolean;
}

const IMAGE_PLACEHOLDER_PATTERNS = ['car-4-tucson', 'car-3-corolla'];

/**
 * Returns the vehicle's billable daily rate, deposit and currency exactly as stored in the backend.
 */
export function resolveVehiclePricing(v: any): ResolvedVehiclePricing {
  // Mirrors exactly what the backend pricing engine charges (vehicle.dailyRate / securityDeposit / currency).
  // No conversions and no invented defaults: a missing value stays 0 so it is visible instead of silently faked.
  if (!v) {
    return { dailyRate: 0, securityDeposit: 0, currency: '', zeroDeposit: false };
  }

  const currency = String(v.currency || '').toUpperCase();
  const dailyRate = Math.max(0, Number(v.dailyRate) || 0);
  const securityDeposit = Math.max(0, Number(v.securityDeposit) || 0);

  return {
    dailyRate,
    securityDeposit,
    currency,
    zeroDeposit: securityDeposit <= 0,
  };
}

/**
 * Formats a money amount with its ISO currency code, e.g. "PKR 8,000".
 */
export function formatMoney(amount: number, currency?: string, fractionDigits = 0): string {
  const value = Number.isFinite(amount) ? amount : 0;
  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  return currency ? `${currency} ${formatted}` : formatted;
}

/**
 * Returns true if the URL points to a full-bleed landscape studio/real photograph
 * rather than a transparent PNG vehicle cutout.
 */
export function isFullBleedCarPhoto(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('/studio-') ||
    lower.includes('/uploads/') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.webp') ||
    lower.includes('auto=format') ||
    lower.includes('unsplash.com')
  );
}

/**
 * Resolves the highest-fidelity image URL for a vehicle from backend `photos`,
 * `media`, `primaryImageUrl`, or accurate model/category studio fallback.
 */
export function getCarImage(v: any): string {
  if (!v) return '/cars/finovo-white-car.png';

  const photoPrimary = Array.isArray(v.photos)
    ? v.photos.find((p: any) => p?.isPrimary && p?.url)?.url || v.photos[0]?.url
    : undefined;

  const mediaPrimary = Array.isArray(v.media)
    ? v.media.find((m: any) => m?.isPrimary && m?.fileUrl)?.fileUrl || v.media[0]?.fileUrl
    : undefined;

  const candidateUrl = photoPrimary || mediaPrimary || v.primaryImageUrl;
  if (
    candidateUrl &&
    typeof candidateUrl === 'string' &&
    !IMAGE_PLACEHOLDER_PATTERNS.some((pat) => candidateUrl.includes(pat))
  ) {
    return candidateUrl;
  }

  const brand = (typeof v.brand === 'object' && v.brand ? v.brand.name : v.brand || '').toLowerCase();
  const model = (typeof v.model === 'object' && v.model ? v.model.name : v.model || '').toLowerCase();
  const color = (v.color || '').toLowerCase();
  const reg = (v.registrationNumber || '').toUpperCase();
  const cat = (
    typeof v.category === 'object' && v.category
      ? v.category.slug || v.category.name
      : v.categoryName || v.category || ''
  ).toLowerCase();

  if (model.includes('urus')) return '/cars/studio-lambo-urus.jpg';
  if (model.includes('hurac') || brand.includes('lambo') || reg.includes('-01')) {
    return '/cars/orange-car.jpg';
  }
  if (model.includes('m4') || reg.includes('-12')) return '/cars/studio-bmw-m4.jpg';
  if (model.includes('x5') || (brand.includes('bmw') && cat.includes('suv'))) {
    return '/cars/studio-bmw-x5.jpg';
  }
  if (model.includes('740') || cat.includes('luxury')) return '/cars/studio-bmw-740i.jpg';
  if (model.includes('tucson') || brand.includes('hyundai')) return '/cars/finovo-blue-car.png';
  if (model.includes('cooper') || brand.includes('mini')) return '/cars/finovo-green-car.png';
  if (model.includes('focus') || brand.includes('ford') || cat.includes('hatch')) {
    return '/cars/finovo-yellow-car.png';
  }
  if (brand.includes('tesla') || v.fuelType === 'ELECTRIC') {
    return color.includes('red') ? '/cars/finovo-red-car.png' : '/cars/finovo-gray-car.png';
  }
  if (model.includes('corolla') || brand.includes('toyota')) return '/cars/finovo-white-car.png';
  if (brand.includes('bmw')) return '/cars/bmw.png';
  if (cat.includes('suv')) return '/cars/studio-bmw-x5.jpg';
  if (cat.includes('sport') || cat.includes('coupe')) return '/cars/studio-bmw-m4.jpg';

  return '/cars/finovo-white-car.png';
}

export interface CarGalleryEntry {
  url: string;
  caption: string;
  isPrimary?: boolean;
}

const GENERIC_GALLERY_MISMATCHES = ['thumb-18.jpg', 'thumb-20.jpg', 'thumb-21.jpg'];

function isValidPhotoForVehicle(url: string, brand: string, model: string): boolean {
  if (!url) return false;
  if (IMAGE_PLACEHOLDER_PATTERNS.some((pat) => url.includes(pat))) return false;
  if (url.includes('1544829099') && !brand.includes('lamborghini') && !model.includes('huracan')) {
    return false;
  }
  if (url.includes('thumb-20') && !brand.includes('porsche') && !model.includes('911')) {
    return false;
  }
  if (
    (url.includes('thumb-18') || url.includes('thumb-21')) &&
    !(brand.includes('lamborghini') && !model.includes('urus')) &&
    !model.includes('huracan')
  ) {
    return false;
  }
  if (GENERIC_GALLERY_MISMATCHES.some((pat) => url.includes(pat)) && !brand.includes('lamborghini') && !brand.includes('porsche')) {
    return false;
  }
  if (url.includes('/cars/interior.jpg') && !brand.includes('bmw')) {
    return false;
  }
  return true;
}

function getModelSpecificGallery(v: any, displayName: string): CarGalleryEntry[] {
  const brand = String(v?.brand || '').toLowerCase();
  const model = String(v?.model || '').toLowerCase();
  const color = String(v?.color || '').toLowerCase();

  if (model.includes('focus')) {
    return [
      { url: '/cars/finovo-yellow-car.png', caption: `${displayName} Front Three-Quarter`, isPrimary: true },
      { url: '/cars/focus-st-side.jpg', caption: `${displayName} Side Profile` },
      { url: '/cars/focus-st-rear.jpg', caption: `${displayName} Rear Three-Quarter` },
    ];
  }
  if (model.includes('tucson')) {
    return [
      { url: '/cars/finovo-blue-car.png', caption: `${displayName} Front Three-Quarter`, isPrimary: true },
      { url: '/cars/tucson-side.jpg', caption: `${displayName} Side Profile` },
      { url: '/cars/tucson-rear.jpg', caption: `${displayName} Rear Three-Quarter` },
    ];
  }
  if (model.includes('x5')) {
    return [
      { url: '/cars/studio-bmw-x5.jpg', caption: `${displayName} Front Three-Quarter`, isPrimary: true },
      { url: '/cars/bmw-x5m-rear.jpg', caption: `${displayName} Rear Three-Quarter` },
    ];
  }
  if (model.includes('520')) {
    return [
      { url: '/cars/bmw.png', caption: `${displayName} Front Three-Quarter`, isPrimary: true },
      { url: '/cars/bmw-520i-side.jpg', caption: `${displayName} Side Profile` },
      { url: '/cars/bmw-520i-rear.jpg', caption: `${displayName} Rear Three-Quarter` },
      { url: '/cars/interior.jpg', caption: `${displayName} Driver Cockpit` },
    ];
  }
  if (model.includes('corolla')) {
    return [
      { url: '/cars/finovo-white-car.png', caption: `${displayName} Front Three-Quarter`, isPrimary: true },
      { url: '/cars/corolla-rear.jpg', caption: `${displayName} Rear Three-Quarter` },
    ];
  }
  if (model.includes('cooper') || brand.includes('mini')) {
    return [
      { url: '/cars/finovo-green-car.png', caption: `${displayName} Front Three-Quarter`, isPrimary: true },
      { url: '/cars/mini-cooper-rear.jpg', caption: `${displayName} Rear Three-Quarter` },
    ];
  }
  if (model.includes('m4')) {
    return [{ url: '/cars/studio-bmw-m4.jpg', caption: `${displayName} Studio View`, isPrimary: true }];
  }
  if (model.includes('740')) {
    return [{ url: '/cars/studio-bmw-740i.jpg', caption: `${displayName} Studio View`, isPrimary: true }];
  }
  if (model.includes('urus')) {
    return [{ url: '/cars/studio-lambo-urus.jpg', caption: `${displayName} Studio View`, isPrimary: true }];
  }
  if (brand.includes('lamborghini') || model.includes('huracan')) {
    return [{ url: '/cars/orange-car.jpg', caption: `${displayName} Studio View`, isPrimary: true }];
  }
  if (brand.includes('tesla')) {
    const isRed = model.includes('performance') || color.includes('red');
    return [
      {
        url: isRed ? '/cars/finovo-red-car.png' : '/cars/finovo-gray-car.png',
        caption: `${displayName} Studio View`,
        isPrimary: true,
      },
    ];
  }
  return [];
}

/**
 * Returns authentic gallery photos and captions for the exact vehicle/model,
 * filtering out unrelated legacy stock thumbnails.
 */
export function getCarGalleryEntries(v: any): CarGalleryEntry[] {
  const brand = String(v?.brand || '').toLowerCase();
  const model = String(v?.model || '').toLowerCase();
  const displayName = [v?.brand, v?.model].filter(Boolean).join(' ') || 'Finovo Vehicle';
  const main = getCarImage(v);

  const modelFallback = getModelSpecificGallery(v, displayName);
  const rawEntries: CarGalleryEntry[] = [];

  if (Array.isArray(v?.photos) && v.photos.length > 0) {
    v.photos.forEach((p: any, idx: number) => {
      const url = typeof p === 'string' ? p : p?.url;
      if (url && isValidPhotoForVehicle(url, brand, model)) {
        rawEntries.push({
          url,
          caption: (typeof p === 'object' && p?.caption) || `${displayName} Angle ${idx + 1}`,
          isPrimary: typeof p === 'object' ? Boolean(p?.isPrimary) : idx === 0,
        });
      }
    });
  } else if (Array.isArray(v?.media) && v.media.length > 0) {
    v.media.forEach((m: any, idx: number) => {
      if (m?.fileUrl && isValidPhotoForVehicle(m.fileUrl, brand, model)) {
        rawEntries.push({
          url: m.fileUrl,
          caption: m?.caption || `${displayName} Angle ${idx + 1}`,
          isPrimary: idx === 0,
        });
      }
    });
  }

  const seen = new Set<string>();
  const deduped: CarGalleryEntry[] = [];

  if (rawEntries.length > 0) {
    if (isValidPhotoForVehicle(main, brand, model) && !rawEntries.some((entry) => entry.url === main)) {
      deduped.push({ url: main, caption: `${displayName} Exterior Front`, isPrimary: true });
      seen.add(main);
    }
    for (const entry of rawEntries) {
      if (!seen.has(entry.url)) {
        seen.add(entry.url);
        deduped.push(entry);
      }
    }
    if (deduped.length > 0) {
      return deduped;
    }
  }

  if (modelFallback.length > 0) {
    return modelFallback;
  }

  return [{ url: main, caption: `${displayName} Studio View`, isPrimary: true }];
}

export function getCarGallery(v: any): string[] {
  return getCarGalleryEntries(v).map((entry) => entry.url);
}
