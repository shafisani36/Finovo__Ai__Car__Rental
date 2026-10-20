import {
  Cog, Bluetooth, Navigation, Video, Sun, Armchair, CirclePlay,
  ShieldCheck, Wrench, CalendarX, Gauge, Baby,
} from "lucide-react";
import { SectionHead } from "@/components/SectionHead";
import interior from "@/assets/interior.jpg";

const featuresL = [
  [Bluetooth, "Bluetooth", "Stay connected on the go"], [Navigation, "GPS Navigation", "Find your way with ease"],
  [Video, "Backup Camera", "Drive with confidence"], [Sun, "Sunroof", "Enjoy the open sky"],
  [Armchair, "Leather Seats", "Premium comfort"], [CirclePlay, "Apple CarPlay", "Seamless iPhone integration"],
] as const;
const featuresR = [
  [ShieldCheck, "Insurance Included", "Drive with peace of mind"], [Wrench, "24/7 Roadside Assistance", "We're always here for you"],
  [CalendarX, "Free Cancellation", "Flexible travel plans"], [Gauge, "Unlimited Mileage", "Go further, worry less"],
  [Baby, "Child Seat Available", "Travel safely with your little ones"],
] as const;

function FeatureList({ items }: { items: readonly (readonly [typeof Cog, string, string])[] }) {
  return (
    <ul className="space-y-3">
      {items.map(([Icon, t, d]) => (
        <li key={t} className="flex items-start gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-plum-deep text-primary-foreground"><Icon size={15} /></span>
          <span><b className="block text-sm font-semibold">{t}</b><span className="text-xs text-muted-foreground">{d}</span></span>
        </li>
      ))}
    </ul>
  );
}

export function Features() {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-16">
      <SectionHead title="Features & Amenities" sub="Everything you need for a seamless journey" tag="LUXURY MEETS CONVENIENCE" />
      <div className="grid items-center gap-8 lg:grid-cols-[1fr_0.7fr_0.8fr]">
        <div className="relative overflow-hidden rounded-[2rem]">
          <img src={interior} alt="Car interior" loading="lazy" width={1024} height={768} className="h-72 w-full object-cover" />
          <div className="absolute inset-y-0 left-0 flex w-1/2 flex-col justify-center rounded-r-[50%] bg-plum-gradient p-5 text-primary-foreground">
            <p className="text-base font-semibold leading-tight">Premium Features for Extraordinary Journeys.</p>
            <span className="my-2 h-0.5 w-8 bg-gold" />
            <p className="text-[9px] font-semibold tracking-[0.15em] opacity-80">COMFORT<br />TECHNOLOGY<br />FREEDOM</p>
          </div>
        </div>
        <FeatureList items={featuresL} />
        <div className="border-l pl-6"><FeatureList items={featuresR} /></div>
      </div>
    </section>
  );
}
