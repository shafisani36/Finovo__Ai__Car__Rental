/**
 * Finovo AI Pre-Trained Automotive Fleet Database (Backend)
 * 
 * Provides verified OEM manufacturer specifications for high accuracy fleet registration.
 */

export interface PretrainedVehicleSpec {
  brand: string;
  model: string;
  year: number;
  trim: string;
  categorySlug: 'sports' | 'luxury-executive' | 'sedan' | 'suv' | 'coupe-sports';
  categoryName: string;
  transmission: 'AUTOMATIC' | 'MANUAL';
  fuelType: 'PETROL' | 'DIESEL' | 'HYBRID' | 'ELECTRIC';
  engineSize: string;
  horsePower: number;
  torqueNm: number;
  acceleration0to100: number;
  topSpeedKmH: number;
  drivetrain: 'AWD' | 'RWD' | 'FWD' | '4WD';
  fuelTankCapacity: string;
  fuelEconomyL100km: number;
  seats: number;
  doors: number;
  luggageCapacityBags: number;
  cabinBagsCapacity: number;
  standardColors: Array<{ name: string; hex: string }>;
  suggestedDailyRate: number;
  suggestedWeeklyRate: number;
  suggestedMonthlyRate: number;
  suggestedSecurityDeposit: number;
  mileageLimitPerDay: number;
  excessMileageFee: number;
  recommendedMinAge: number;
  recommendedMinLicenseYears: number;
  fuelPolicy: string;
  depositRefundHours: number;
  features: string[];
  imageUrl: string;
}

export const PRETRAINED_VEHICLE_DATABASE: PretrainedVehicleSpec[] = [
  {
    brand: 'Lamborghini',
    model: 'Huracán Evo Spyder',
    year: 2026,
    trim: 'V10 LP 640-4',
    categorySlug: 'sports',
    categoryName: 'Coupe / Sports',
    transmission: 'AUTOMATIC',
    fuelType: 'PETROL',
    engineSize: '5.2L Naturally Aspirated V10',
    horsePower: 640,
    torqueNm: 600,
    acceleration0to100: 3.1,
    topSpeedKmH: 325,
    drivetrain: 'AWD',
    fuelTankCapacity: '83 Liters',
    fuelEconomyL100km: 13.9,
    seats: 2,
    doors: 2,
    luggageCapacityBags: 1,
    cabinBagsCapacity: 1,
    standardColors: [
      { name: 'Arancio Borealis (Pearl Orange)', hex: '#FF6600' },
      { name: 'Giallo Inti (Yellow)', hex: '#FFCC00' },
      { name: 'Nero Noctis (Gloss Black)', hex: '#111827' },
      { name: 'Bianco Monocerus (White)', hex: '#FFFFFF' },
      { name: 'Verde Mantis (Lime Green)', hex: '#10B981' },
    ],
    suggestedDailyRate: 120000,
    suggestedWeeklyRate: 720000,
    suggestedMonthlyRate: 2600000,
    suggestedSecurityDeposit: 250000,
    mileageLimitPerDay: 200,
    excessMileageFee: 350,
    recommendedMinAge: 25,
    recommendedMinLicenseYears: 3,
    fuelPolicy: 'Full-to-Full (98 Octane Premium)',
    depositRefundHours: 24,
    features: [
      'Carbon Ceramic Brakes',
      'Magneto-Rheological Suspension',
      'Lamborghini Dinamica Veicolo Integrata (LDVI)',
      'Apple CarPlay & Touch Infotainment',
      'Sports Exhaust with Active Bypass Valves',
      'Electro-Hydraulic Soft-Top Roof',
    ],
    imageUrl: 'https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?auto=format&fit=crop&w=1200&q=80',
  },
  {
    brand: 'BMW',
    model: 'M4 Competition Coupe',
    year: 2026,
    trim: 'M xDrive 503 HP',
    categorySlug: 'sports',
    categoryName: 'Coupe / Sports',
    transmission: 'AUTOMATIC',
    fuelType: 'PETROL',
    engineSize: '3.0L M TwinPower Turbo Inline-6',
    horsePower: 503,
    torqueNm: 650,
    acceleration0to100: 3.4,
    topSpeedKmH: 290,
    drivetrain: 'AWD',
    fuelTankCapacity: '59 Liters',
    fuelEconomyL100km: 10.2,
    seats: 4,
    doors: 2,
    luggageCapacityBags: 2,
    cabinBagsCapacity: 2,
    standardColors: [
      { name: 'Sao Paulo Yellow', hex: '#EAB308' },
      { name: 'Isle of Man Green', hex: '#047857' },
      { name: 'Toronto Red', hex: '#DC2626' },
      { name: 'Alpine White', hex: '#FFFFFF' },
      { name: 'Black Sapphire Metallic', hex: '#111827' },
    ],
    suggestedDailyRate: 65000,
    suggestedWeeklyRate: 390000,
    suggestedMonthlyRate: 1400000,
    suggestedSecurityDeposit: 150000,
    mileageLimitPerDay: 250,
    excessMileageFee: 180,
    recommendedMinAge: 23,
    recommendedMinLicenseYears: 2,
    fuelPolicy: 'Full-to-Full',
    depositRefundHours: 24,
    features: [
      'M Steptronic 8-Speed Drivelogic',
      'M Carbon Bucket Seats',
      'Head-Up Display with M-Specific View',
      'Harman Kardon Surround Sound System',
    ],
    imageUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80',
  },
  {
    brand: 'BMW',
    model: '520i M-Sport',
    year: 2026,
    trim: 'Executive Executive Line',
    categorySlug: 'sedan',
    categoryName: 'Sedan',
    transmission: 'AUTOMATIC',
    fuelType: 'HYBRID',
    engineSize: '2.0L TwinPower Turbo 48V Mild Hybrid',
    horsePower: 208,
    torqueNm: 330,
    acceleration0to100: 7.5,
    topSpeedKmH: 230,
    drivetrain: 'RWD',
    fuelTankCapacity: '60 Liters',
    fuelEconomyL100km: 6.4,
    seats: 5,
    doors: 4,
    luggageCapacityBags: 3,
    cabinBagsCapacity: 3,
    standardColors: [
      { name: 'Mineral White Metallic', hex: '#F9FAFB' },
      { name: 'Carbon Black Metallic', hex: '#1F2937' },
      { name: 'Phytonic Blue', hex: '#2563EB' },
      { name: 'Skyscraper Gray', hex: '#6B7280' },
    ],
    suggestedDailyRate: 32000,
    suggestedWeeklyRate: 192000,
    suggestedMonthlyRate: 700000,
    suggestedSecurityDeposit: 60000,
    mileageLimitPerDay: 300,
    excessMileageFee: 80,
    recommendedMinAge: 21,
    recommendedMinLicenseYears: 1,
    fuelPolicy: 'Full-to-Full',
    depositRefundHours: 24,
    features: [
      'BMW Curved Display with OS 8.5',
      'Driving Assistant Professional with Lane Keep',
      'Parking Assistant Plus 360° Surround Camera',
    ],
    imageUrl: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=80',
  },
  {
    brand: 'Mercedes-Benz',
    model: 'S-Class S580 4MATIC',
    year: 2026,
    trim: 'Maybach-Line Flagship',
    categorySlug: 'luxury-executive',
    categoryName: 'Luxury / Executive',
    transmission: 'AUTOMATIC',
    fuelType: 'HYBRID',
    engineSize: '4.0L V8 Biturbo with EQ Boost',
    horsePower: 496,
    torqueNm: 700,
    acceleration0to100: 4.4,
    topSpeedKmH: 250,
    drivetrain: 'AWD',
    fuelTankCapacity: '76 Liters',
    fuelEconomyL100km: 10.1,
    seats: 5,
    doors: 4,
    luggageCapacityBags: 4,
    cabinBagsCapacity: 3,
    standardColors: [
      { name: 'Obsidian Black Metallic', hex: '#0F172A' },
      { name: 'Diamond White Bright', hex: '#FFFFFF' },
      { name: 'Selenite Gray', hex: '#4B5563' },
    ],
    suggestedDailyRate: 95000,
    suggestedWeeklyRate: 570000,
    suggestedMonthlyRate: 2100000,
    suggestedSecurityDeposit: 200000,
    mileageLimitPerDay: 250,
    excessMileageFee: 220,
    recommendedMinAge: 25,
    recommendedMinLicenseYears: 2,
    fuelPolicy: 'Full-to-Full',
    depositRefundHours: 24,
    features: [
      'Burmester 4D High-End Surround Sound',
      'Rear Executive Lounge Seating with Hot Stone Massage',
      'E-Active Body Control Predictive Air Suspension',
    ],
    imageUrl: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1200&q=80',
  },
  {
    brand: 'Toyota',
    model: 'Land Cruiser 300 ZX',
    year: 2026,
    trim: '3.5L Twin-Turbo V6 Flagship',
    categorySlug: 'suv',
    categoryName: 'SUV',
    transmission: 'AUTOMATIC',
    fuelType: 'PETROL',
    engineSize: '3.5L Twin-Turbo V6',
    horsePower: 409,
    torqueNm: 650,
    acceleration0to100: 6.7,
    topSpeedKmH: 210,
    drivetrain: '4WD',
    fuelTankCapacity: '110 Liters',
    fuelEconomyL100km: 11.5,
    seats: 7,
    doors: 5,
    luggageCapacityBags: 6,
    cabinBagsCapacity: 4,
    standardColors: [
      { name: 'Precious White Pearl', hex: '#F9FAFB' },
      { name: 'Attitude Black', hex: '#111827' },
      { name: 'Silver Metallic', hex: '#D1D5DB' },
    ],
    suggestedDailyRate: 48000,
    suggestedWeeklyRate: 288000,
    suggestedMonthlyRate: 1050000,
    suggestedSecurityDeposit: 80000,
    mileageLimitPerDay: 300,
    excessMileageFee: 100,
    recommendedMinAge: 21,
    recommendedMinLicenseYears: 1,
    fuelPolicy: 'Full-to-Full',
    depositRefundHours: 24,
    features: [
      'Multi-Terrain Select with Crawl Control & E-KDSS',
      'JBL 14-Speaker Premium Sound System',
      'Cool Box Center Console Refrigerator',
    ],
    imageUrl: 'https://images.unsplash.com/photo-1594502184342-2e12f877aa73?auto=format&fit=crop&w=1200&q=80',
  },
];

export function lookupPretrainedVehicleBackend(brand: string, model: string): PretrainedVehicleSpec | null {
  const cleanBrand = brand.trim().toLowerCase();
  const cleanModel = model.trim().toLowerCase();

  return (
    PRETRAINED_VEHICLE_DATABASE.find(
      (v) =>
        v.brand.toLowerCase() === cleanBrand &&
        (v.model.toLowerCase() === cleanModel ||
          cleanModel.includes(v.model.toLowerCase()) ||
          v.model.toLowerCase().includes(cleanModel))
    ) || null
  );
}
