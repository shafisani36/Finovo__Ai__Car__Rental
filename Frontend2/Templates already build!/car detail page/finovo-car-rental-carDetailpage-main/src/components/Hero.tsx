import { useState } from "react";
import {
  ShoppingCart, Heart, ShieldCheck, Calendar, MapPin, ChevronDown, ArrowRight,
  Check, Cog, Fuel, Users, Snowflake, Rotate3d,
} from "lucide-react";
import { Stars } from "@/components/Stars";
import carMain from "@/assets/car-main.jpg";
import lamboLogo from "@/assets/lambo-logo.jpg";
import t18 from "@/assets/thumb-18.jpg";
import t20 from "@/assets/thumb-20.jpg";
import t21 from "@/assets/thumb-21.jpg";
import interior from "@/assets/interior.jpg";

const plans = [
  { name: "Basic", price: "SAR 0/day", desc: "Basic Coverage" },
  { name: "Standard", price: "SAR 50/day", desc: "Popular Coverage" },
  { name: "Premium", price: "SAR 100/day", desc: "Full Coverage" },
];

const quickSpecs: [typeof Cog, string, string][] = [
  [Cog, "Transmission", "Automatic"],
  [Fuel, "Fuel", "Petrol"],
  [Users, "Seats", "4 Persons"],
  [Snowflake, "AC", "Yes"],
];

function Select({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <button className="flex w-full items-center justify-between rounded-md bg-card px-3 py-2.5 text-[11px] text-foreground">
      <span className="flex items-center gap-2">{icon}{text}</span><ChevronDown size={12} />
    </button>
  );
}

function BookingCard() {
  const [plan, setPlan] = useState("Standard");
  return (
    <aside className="self-start rounded-3xl border border-primary-foreground/20 bg-primary-foreground/10 p-6 shadow-soft backdrop-blur lg:mt-24">
      <div className="grid grid-cols-2 gap-4 rounded-xl bg-primary-foreground/10 p-4">
        {quickSpecs.map(([Icon, k, v]) => (
          <div key={k} className="flex items-center gap-3">
            <Icon size={22} />
            <div><p className="text-[10px] opacity-70">{k}</p><p className="text-sm font-semibold">{v}</p></div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-end justify-between border-b border-primary-foreground/30 pb-2">
        <h3 className="text-xl">Booking Details</h3><span className="text-[10px]">Plan your perfect journey</span>
      </div>
      <p className="mt-4 text-sm font-semibold">Insurance Plan</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {plans.map((p) => (
          <button key={p.name} onClick={() => setPlan(p.name)} className={`relative flex items-center gap-2 rounded-lg p-2.5 text-left text-foreground ${plan === p.name ? "border-2 border-gold bg-sand" : "border-2 border-transparent bg-card"}`}>
            {plan === p.name && <span className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full bg-success text-primary-foreground"><Check size={10} /></span>}
            <ShieldCheck size={22} className="text-plum-deep" />
            <span><b className="block text-xs text-plum-deep">{p.name}</b><span className="block text-[10px] font-semibold">{p.price}</span><span className="block text-[9px] text-muted-foreground">{p.desc}</span></span>
          </button>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-[10px]">
        <label className="space-y-1.5"><span className="opacity-80">Pick-up location</span><Select icon={<MapPin size={12} />} text="Select city" /></label>
        <label className="space-y-1.5"><span className="opacity-80">Pick-up Date &amp; time</span><Select icon={<Calendar size={12} />} text="Select Date & Time" /></label>
        <label className="space-y-1.5"><span className="opacity-80">Drop-off location</span><Select icon={<MapPin size={12} />} text="Select city" /></label>
        <label className="space-y-1.5"><span className="opacity-80">Drop-off Date &amp; time</span><Select icon={<Calendar size={12} />} text="Select Date & Time" /></label>
      </div>
      <div className="mt-4 flex items-center gap-5 rounded-lg bg-sand px-5 py-3 text-plum-deep">
        <Calendar size={22} />
        <div><p className="text-sm font-semibold">Rental Duration</p><p className="text-[11px]">2 Days (Apr 10, 2026 - Apr 12, 2026)</p></div>
      </div>
      <p className="mt-4 flex items-center gap-2 text-sm"><span className="grid h-4 w-4 place-items-center rounded-full bg-success"><Check size={10} /></span>Insurance Included: <b>{plan} Plan</b></p>
      <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3.5 text-sm font-bold text-gold-foreground transition hover:brightness-105">Book This Car <ArrowRight size={14} /></button>
      <div className="mt-3 flex gap-3">
        <button className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-plum-deep bg-sand py-3 text-sm font-semibold text-plum-deep"><ShoppingCart size={16} /> Add to Cart</button>
        <button className="grid w-12 place-items-center rounded-xl border-2 border-plum-deep bg-card text-plum-deep" aria-label="Wishlist"><Heart size={18} /></button>
      </div>
    </aside>
  );
}

function CarGallery() {
  const thumbs = [
    { src: carMain, l: "Front" }, { src: t18, l: "Back" }, { src: interior, l: "Interior" },
    { src: t20, l: "Side" }, { src: t21, l: "Dashboard" },
  ];
  const [active, setActive] = useState(0);
  return (
    <>
      <div className="relative mt-8 overflow-hidden rounded-2xl">
        <img src={thumbs[active]?.src ?? carMain} alt="Lamborghini 2026" className="aspect-[4/2.8] w-full object-cover" />
        <span className="absolute right-4 top-4 grid h-14 w-14 place-items-center rounded-full bg-success/80 text-center text-[9px] font-bold leading-tight"><Rotate3d size={14} className="mx-auto" />360°<br />View</span>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-plum-deep/60 to-transparent p-5 text-[10px] font-semibold tracking-[0.3em]">
          LAMBORGHINI<br />POWER · PRESTIGE · FREEDOM.
        </div>
      </div>
      <div className="mt-6 grid grid-cols-5 gap-3">
        {thumbs.map((t, i) => (
          <button key={t.l} onClick={() => setActive(i)} className={`overflow-hidden rounded-lg border-2 bg-card text-[10px] font-semibold text-foreground ${active === i ? "border-gold" : "border-primary-foreground"}`}>
            <img src={t.src} alt={t.l} className="aspect-[4/2.4] w-full object-cover" loading="lazy" />
            <span className="block py-1">{t.l}</span>
          </button>
        ))}
      </div>
    </>
  );
}

export function Hero() {
  return (
    <section className="bg-hero text-primary-foreground">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 pb-24 pt-12 lg:grid-cols-[1fr_420px]">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.25em] text-plum-deep/70">EXTRAORDINARY DRIVES · BRIGHTER TOMORROWS</p>
          <h1 className="mt-3 font-script text-5xl text-plum-deep">More Than a Ride</h1>
          <div className="mt-8 flex items-start gap-24">
            <div>
              <h2 className="text-3xl font-bold">Lamborghini 2026</h2>
              <p className="mt-1 text-sm opacity-90">Unleash extraordinary performance.</p>
              <div className="mt-4 flex items-center gap-2 text-sm"><Stars /><b>4.8</b><span className="text-xs opacity-80">120 Reviews</span></div>
            </div>
            <img src={lamboLogo} alt="Lamborghini" className="h-14 w-12 object-contain mix-blend-lighten" />
          </div>
          <p className="mt-6 text-4xl font-bold text-gold">SAR 1,000.00 <span className="ml-2 text-sm font-normal text-primary-foreground/80">/ Day</span></p>
          <CarGallery />
        </div>
        <BookingCard />
      </div>
    </section>
  );
}
