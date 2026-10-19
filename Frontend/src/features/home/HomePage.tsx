import { HeroSection } from './sections/HeroSection';
import { CarCategorySection } from './sections/CarCategorySection';
import { BrowseCarTypeSection } from './sections/BrowseCarTypeSection';
import { AiInspectionBannerSection } from './sections/AiInspectionBannerSection';
import { WhyChooseUsSection } from './sections/WhyChooseUsSection';
import { HowItWorksSection } from './sections/HowItWorksSection';
import { StatsCounterSection } from './sections/StatsCounterSection';
import { TestimonialsSection } from './sections/TestimonialsSection';
import { InsuranceBannerSection } from './sections/InsuranceBannerSection';
import { FaqSection } from './sections/FaqSection';
import { AppDownloadSection } from './sections/AppDownloadSection';

export function HomePage() {
  return (
    <main id="main-content">
      <HeroSection />
      <CarCategorySection />
      <BrowseCarTypeSection />
      <AiInspectionBannerSection />
      <WhyChooseUsSection />
      <HowItWorksSection />
      <StatsCounterSection />
      <TestimonialsSection />
      <InsuranceBannerSection />
      <FaqSection />
      <AppDownloadSection />
    </main>
  );
}
