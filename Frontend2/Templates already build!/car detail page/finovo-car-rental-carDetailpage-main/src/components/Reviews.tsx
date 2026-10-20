import { ArrowRight, Quote } from "lucide-react";
import { Stars } from "@/components/Stars";
import avatar from "@/assets/avatar.jpg";

const reviews = Array.from({ length: 3 }, () => ({
  name: "Ahmed",
  text: "Smooth booking and the car was exactly as shown. Highly recommended! The service was impeccable from start to finish.",
}));

export function Reviews() {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-16">
      <div className="mb-8 flex items-end justify-between">
        <div><h2 className="text-3xl font-semibold md:text-4xl">What Our Customers Say</h2><p className="mt-3 text-sm text-muted-foreground">Real experiences from our valued drivers</p></div>
        <a href="#" className="flex items-center gap-2 text-sm font-semibold text-plum">View All Reviews <ArrowRight size={14} /></a>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {reviews.map((r, i) => (
          <div key={i} className="relative flex items-center gap-4 rounded-l-[3rem] rounded-r-2xl bg-plum-gradient p-3 pr-6 text-primary-foreground">
            <img src={avatar} alt={r.name} loading="lazy" className="h-16 w-16 shrink-0 rounded-full border-2 border-primary-foreground object-cover" />
            <div>
              <b className="text-[11px]">{r.name}</b><Stars size={12} />
              <p className="mt-1 text-[10px] leading-snug opacity-85">{r.text}</p>
            </div>
            <Quote size={22} fill="currentColor" className="absolute right-4 top-3 opacity-40" />
          </div>
        ))}
      </div>
    </section>
  );
}
