import { createFileRoute } from "@tanstack/react-router";
import CarCatalog from "@/components/car-catalog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Available Cars | Finovo Premium Car Rental" },
      { name: "description", content: "Find your perfect drive from Finovo's premium collection of world-class vehicles. Explore daily, weekly, and monthly car rentals." },
      { property: "og:title", content: "Available Cars | Finovo Premium Car Rental" },
      { property: "og:description", content: "Explore premium vehicles for every journey with Finovo's daily, weekly, and monthly car rentals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CarCatalog,
});
