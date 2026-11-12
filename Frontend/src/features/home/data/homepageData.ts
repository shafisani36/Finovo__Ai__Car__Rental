import type {
  BrandCategory,
  WhyChooseUsItem,
  HowItWorksStep,
  FaqItem,
} from '../../../types';

export const BRAND_CATEGORIES: BrandCategory[] = [
  {
    id: 'mercedes',
    brand: 'Mercedes-Benz',
    displayTitle: ['Mercedes-', 'Benz'],
    textColor: 'light',
    model: 'G-Class & AMG',
    image: 'https://images.unsplash.com/photo-1520031441872-265e4ff70366?auto=format&fit=crop&w=800&q=85',
    tagline: 'Rugged prestige & unmatched power',
    startingPrice: 280,
  },
  {
    id: 'audi',
    brand: 'Audi',
    displayTitle: ['Audi'],
    textColor: 'dark',
    model: 'R8 & RS Series',
    image: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&w=800&q=85',
    tagline: 'Vorsprung durch high-performance Technik',
    startingPrice: 240,
  },
  {
    id: 'bmw',
    brand: 'BMW',
    displayTitle: ['BMW'],
    textColor: 'light',
    model: 'M4 Competition & X5',
    image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=85',
    tagline: 'The ultimate luxury driving experience',
    startingPrice: 210,
  },
  {
    id: 'porsche',
    brand: 'Porsche',
    displayTitle: ['Porsche'],
    textColor: 'dark',
    model: '911 Carrera & Taycan',
    image: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=800&q=85',
    tagline: 'Precision engineered German dynamics',
    startingPrice: 320,
  },
];


export const WHY_CHOOSE_US_ITEMS: WhyChooseUsItem[] = [
  {
    id: 'find-cars',
    title: 'Find cars near you instantly.',
    description: 'Browse available vehicles by city, date, and budget in just a few taps.',
    badges: ['Zion Lark • 5km', 'Larkin • 35m', 'Remi • 55m'],
    carImage: '/cars/car-3-corolla-transparent.png',
    gridArea: 'location',
  },
  {
    id: 'simple-plans',
    title: 'Simple plans with no hidden fees.',
    description: 'Choose daily, weekly, or monthly rentals with clear pricing every time.',
    badges: ['Transparent Pricing', 'Flexible Plans'],
    carImage: '/cars/car-1-fortuner-transparent.png',
    gridArea: 'pricing',
  },
  {
    id: 'verified-cars',
    title: 'Drive verified, well-maintained cars.',
    description: 'Every vehicle is quality-checked, cleaned, and ready for your trip.',
    badges: ['Inspected', 'Cleaned', 'Road-ready'],
    carImage: '/why-choose-us/card-3-bronze-car.png',
    gridArea: 'verification',
  },
  {
    id: 'support-trip',
    title: 'Get support before and during your trip.',
    description: 'Book with confidence and get help anytime with 24/7 customer support.',
    badges: ['24/7 Customer Support', 'Assistance On The Road'],
    carImage: '/cars/car-2-elantra-transparent.png',
    gridArea: 'support',
  },
];

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    id: 1,
    title: 'Search',
    description: 'Enter your location and rental dates to find available cars.',
    badge: 'Step 01',
    iconType: 'choose',
    image: '/how-it-works/step-1-search.png',
  },
  {
    id: 2,
    title: 'Choose',
    description: 'Enter your location and rental dates to find available cars.',
    badge: 'Step 02',
    iconType: 'scan',
    image: '/how-it-works/step-2-choose.png',
  },
  {
    id: 3,
    title: 'Book & Drive',
    description: 'Confirm your booking, pick up your car, and hit the road.',
    badge: 'Step 03',
    iconType: 'drive',
    image: '/how-it-works/step-3-composite.png',
  },
];




export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-1',
    question: 'What documents do I need to rent a car?',
    answer: 'You will need a valid government-issued driver license held for at least one year, an accepted payment method (credit/debit card), and an identification document (passport or national ID card). International visitors will also need an International Driving Permit (IDP) if their domestic license is not in English.',
  },
  {
    id: 'faq-2',
    question: 'Can another driver be added to my contract?',
    answer: 'Yes! Additional drivers can be added during online booking or at vehicle pickup. Every additional driver must meet standard age requirements and present a valid driver license and identification.',
  },
  {
    id: 'faq-3',
    question: 'How does the AI inspection system work?',
    answer: 'Before pickup and after return, open the Finovo mobile app and take a 360-degree walkaround scan of the car. Our computer vision AI model automatically detects any preexisting scratches or dings, calculates confidence scores, and saves a cryptographically timestamped report for complete deposit protection.',
  },
  {
    id: 'faq-4',
    question: 'What is the policy for cancellation and refunds?',
    answer: 'We offer free cancellations with a 100% full refund up to 24 hours before your scheduled reservation start time. Cancellations made within 24 hours incur a nominal processing fee.',
  },
  {
    id: 'faq-5',
    question: 'Is there a security deposit required?',
    answer: 'A small temporary hold is placed on your card at pickup to cover incidentals, fuel discrepancies, or tolls. This hold is automatically released within 24–48 hours of vehicle return following your verified AI inspection scan.',
  },
  {
    id: 'faq-6',
    question: 'Can I pick up in one city and drop off in another?',
    answer: 'Yes, our one-way rental service lets you pick up at any participating branch or airport and drop off at another. Simply select "Return to a different location" in the search form to view available routes and transparent relocation pricing.',
  },
];
