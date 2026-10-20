import { Cog, Gauge, Fuel, DoorOpen, Briefcase, Network } from "lucide-react";
import { SectionHead } from "@/components/SectionHead";

const specs = [
  [Cog, "Engine", "2.0L Turbo"], [Gauge, "Horsepower", "250 HP"], [Fuel, "Mileage", "15 km/l"], [DoorOpen, "Doors", "4"],
  [Briefcase, "Luggage", "2 Bags"], [Network, "Drive Type", "AWD"], [Gauge, "Top Speed", "250 km/h"], [Fuel, "Fuel Tank", "60 L"],
] as const;

export function Specs() {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-24">
      <SectionHead title="Car Specifications" sub="Technical details at a glance" tag="PRECISION IN EVERY DETAIL" />
      <div className="grid grid-cols-4 gap-3 md:grid-cols-8">
        {specs.map(([Icon, k, v]) => (
          <div key={k} className="hex bg-border p-px">
            <div className="hex flex aspect-[0.92] flex-col items-center justify-center bg-card text-center">
              <Icon size={30} className="text-plum-deep" />
              <span className="mt-1 text-[11px] text-muted-foreground">{k}</span>
              <b className="text-xs text-plum-deep">{v}</b>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
