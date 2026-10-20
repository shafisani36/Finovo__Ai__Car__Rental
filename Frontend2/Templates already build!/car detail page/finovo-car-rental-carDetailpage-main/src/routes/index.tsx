import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Specs } from "@/components/Specs";
import { Features } from "@/components/Features";
import { Terms } from "@/components/Terms";
import { Reviews } from "@/components/Reviews";
import { SimilarCars } from "@/components/SimilarCars";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lamborghini 2026 Rental | Finovo" },
      { name: "description", content: "Rent the Lamborghini 2026 from SAR 1,000/day with insurance, free cancellation and unlimited mileage." },
      { property: "og:title", content: "Lamborghini 2026 Rental | Finovo" },
      { property: "og:description", content: "Unleash extraordinary performance. Book the Lamborghini 2026 today." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CarDetail,
});

function CarDetail() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <Specs />
      <Features />
      <Terms />
      <Reviews />
      <SimilarCars />
      <Footer />
    </div>
  );
}
