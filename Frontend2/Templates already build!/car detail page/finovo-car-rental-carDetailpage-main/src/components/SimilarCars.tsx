import { ArrowLeft, ArrowRight, ChevronRight, Gauge, Tag } from "lucide-react";
import cardBg from "@/assets/card-bg.jpg";
import bmw from "@/assets/bmw.png";

const cars = Array.from({ length: 4 }, () => ({
  brand: "BMW", model: "BMW 520 i", year: "2026", mileage: "250 km", price: "SAR 500.00",
}));

function CarCard({ car }: { car: (typeof cars)[number] }) {
  return (
    <div className="overflow-hidden rounded-2xl border-2 border-plum-soft bg-card shadow-soft">
      <div className="relative px-4 pt-6">
        <img src={cardBg} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-plum-deep/40 to-blush/60" />
        <span className="absolute right-3 top-3 z-10 rounded-full bg-success px-2 py-0.5 text-[9px] font-semibold text-primary-foreground">Available</span>
        <img src={bmw} alt={car.model} loading="lazy" className="relative mx-auto h-32 object-contain drop-shadow-lg" />
      </div>
      <div className="flex items-center justify-between p-3 text-[10px]">
        <div className="flex items-start gap-2">
          <span className="mt-1 grid h-6 w-6 place-items-center rounded-full bg-foreground text-[7px] font-bold text-background">{car.brand}</span>
          <div>
            <b className="block">{car.model}</b><span className="text-muted-foreground">{car.year}</span>
            <div className="mt-1 flex gap-4">
              <span className="flex items-center gap-1"><Gauge size={12} /><span><b className="block">{car.mileage}</b><span className="text-[8px] text-muted-foreground">Mileage</span></span></span>
              <span className="flex items-center gap-1"><Tag size={12} /><span><b className="block">{car.price}</b><span className="text-[8px] text-muted-foreground">Daily Fee</span></span></span>
            </div>
          </div>
        </div>
        <button className="grid h-7 w-7 place-items-center rounded-full border-2 border-foreground" aria-label={`View ${car.model}`}><ChevronRight size={14} /></button>
      </div>
    </div>
  );
}

export function SimilarCars() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-8 flex items-end justify-between">
        <div><h2 className="text-3xl font-semibold md:text-4xl">Similar Cars You May Like</h2><p className="mt-3 text-sm text-muted-foreground">More exceptional vehicles for your next journey</p></div>
        <div className="flex gap-3">
          {[ArrowLeft, ArrowRight].map((I, i) => <button key={i} className="grid h-9 w-9 place-items-center rounded-full bg-card shadow-soft" aria-label={i === 0 ? "Previous cars" : "Next cars"}><I size={14} /></button>)}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cars.map((car, i) => <CarCard key={i} car={car} />)}
      </div>
    </section>
  );
}
