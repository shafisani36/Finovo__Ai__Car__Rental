import { useState } from "react";
import { UserRound, ShieldCheck, Fuel, Clock, ChevronDown, ChevronUp, Quote } from "lucide-react";
import { SectionHead } from "@/components/SectionHead";
import orangeCar from "@/assets/orange-car.jpg";

const terms = [
  [UserRound, "Minimum age — 21 years", "Drives must be at least 21 years old and have a valid driver's license for minimum of 1 year."],
  [ShieldCheck, "Security Deposit — SAR 500 (Refundable)", "The deposit is fully refunded after the car is returned in its original condition."],
  [Fuel, "Fuel Policy — Full to Full", "Receive the car with a full tank and return it full."],
  [Clock, "Late Return Fee — SAR 50/hour", "Late returns are charged per started hour."],
] as const;

export function Terms() {
  const [open, setOpen] = useState(0);
  return (
    <section className="mx-auto max-w-6xl px-6 pt-16">
      <SectionHead title="Rental Terms & Conditions" sub="Important information for your rental" tag="CLEAR TERMS. A BETTER JOURNEY" />
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          {terms.map(([Icon, t, d], i) => (
            <div key={t} className="overflow-hidden rounded-xl border shadow-soft">
              <button onClick={() => setOpen(open === i ? -1 : i)} className={`flex w-full items-center justify-between px-5 py-3.5 text-left text-sm font-semibold ${open === i ? "bg-blush" : "bg-card"}`}>
                <span className="flex items-center gap-3"><span className={i === 0 ? "grid h-7 w-7 place-items-center rounded-full bg-plum-deep text-primary-foreground" : "text-plum-deep"}><Icon size={i === 0 ? 14 : 22} /></span>{t}</span>
                {open === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {open === i && <p className="bg-card px-16 py-4 text-xs font-semibold leading-relaxed">{d}</p>}
            </div>
          ))}
        </div>
        <div className="relative overflow-hidden rounded-3xl shadow-soft">
          <img src={orangeCar} alt="Orange sports car" loading="lazy" width={1024} height={768} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-plum-deep/80 via-plum-deep/20 to-transparent" />
          <div className="absolute bottom-6 left-6 text-primary-foreground">
            <Quote size={28} fill="currentColor" className="opacity-80" />
            <p className="mt-1 text-xl font-medium leading-tight">Great Cars<br />Brighter Journeys</p>
            <p className="mt-4 text-[10px] font-semibold tracking-[0.2em] opacity-80">SAME ROADS.<br />A MORE EXTRAORDINARY YOU.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
