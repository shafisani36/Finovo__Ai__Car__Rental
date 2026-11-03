export type RentalType = 'daily' | 'monthly' | 'subscription';

export interface SearchFormData {
  rentalType: RentalType;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDate: string;
  pickupTime: string;
  dropoffDate: string;
  dropoffTime: string;
  carCategory: string;
  differentDropoff: boolean;
  insuranceCover: boolean;
}

export interface BrandCategory {
  id: string;
  brand: string;
  displayTitle?: string[];
  textColor?: 'light' | 'dark';
  model?: string;
  image: string;
  tagline?: string;
  startingPrice?: number;
}

export interface CarSpecs {
  transmission: 'Automatic' | 'Manual' | string;
  fuelType: 'Petrol' | 'Diesel' | 'Hybrid' | 'Electric' | string;
  hp?: string;
  drivetrain?: string;
  seats?: number;
  luggage?: number;
}

export interface FeaturedCar {
  id: string;
  name: string;
  subtitle?: string;
  year?: number;
  type: string;
  dailyRate: number;
  priceDisplay?: string;
  rating?: number;
  image: string;
  specs: CarSpecs;
  featured?: boolean;
}

export interface WhyChooseUsItem {
  id: string;
  title: string;
  description: string;
  badges: string[];
  carImage: string;
  gridArea: string;
}

export interface HowItWorksStep {
  id: number;
  title: string;
  description: string;
  badge: string;
  iconType: 'choose' | 'scan' | 'drive';
  image: string;
}

export interface StatItem {
  id: string;
  value: string;
  label: string;
}

export interface TestimonialItem {
  id: string;
  author: string;
  role: string;
  location: string;
  rating: number;
  review: string;
  avatar: string;
  badge?: string;
  variant?: 'featured' | 'bubble-left' | 'bubble-center' | 'bubble-right';
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}
