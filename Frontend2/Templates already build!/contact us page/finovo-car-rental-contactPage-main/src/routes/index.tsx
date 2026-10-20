import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Phone, Mail, MapPin, User, Calendar, MessageCircle, ArrowRight, Car, CalendarClock,
  Globe, ChevronDown, Plus, X, Instagram, Twitter, Music2, Sun,
} from "lucide-react";
import hero from "@/assets/hero-car.jpg";
import office from "@/assets/office-car.jpg";
import show1 from "@/assets/showroom-1.jpg";
import show2 from "@/assets/showroom-2.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Contact Finovo — Get in touch" },
      { name: "description", content: "Contact Finovo car rental support, visit our head office or find a showroom near you." },
      { property: "og:title", content: "Contact Finovo — Get in touch" },
      { property: "og:description", content: "Call, email or visit Finovo. Our team replies within 24 hours." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Logo({ big = false }: { big?: boolean }) {
  return (
    <div className={`grid place-items-center rounded-lg bg-background text-plum font-black ${big ? "h-24 w-24 rounded-2xl text-5xl" : "h-7 w-7 text-sm"}`}>
      F
    </div>
  );
}

const faqs = [
  { q: "How do I modify my booking?", a: "You can modify your booking by logging into your account or contacting our support team at least 24 hours in advance. Changes made after that window may incur a small fee." },
  { q: "What documents are required to rent a car?", a: "A valid driving licence, a government-issued ID and a credit card in the driver's name." },
  { q: "Do you offer airport pickup and drop-off?", a: "Yes, we offer pickup and drop-off at all major airports in the city." },
  { q: "Can I cancel a reservation for free?", a: "Free cancellation is available up to 24 hours before your pickup time." },
];

function Index() {
  const [open, setOpen] = useState(0);
  return (
    <div className="min-h-screen bg-soft font-sans text-plum-deep">
      {/* Hero */}
      <section className="relative bg-hero text-primary-foreground">
        <nav className="relative z-20 flex items-center justify-between bg-plum-deep px-6 py-3 lg:px-16">
          <div className="flex items-center gap-2 text-lg"><Logo /> Finovo</div>
          <ul className="hidden gap-6 text-xs md:flex">
            {["Home", "Cars", "Insurance", "About Us", "AI-Inspection"].map((l) => <li key={l}>{l}</li>)}
            <li className="font-semibold underline underline-offset-4">Contact</li>
          </ul>
          <div className="flex items-center gap-5 text-xs">
            <div className="flex h-6 w-12 items-center rounded-full bg-field/80 px-1"><span className="grid h-4 w-4 place-items-center rounded-full bg-plum-deep"><Sun className="h-3 w-3" /></span></div>
            <span className="flex items-center gap-1"><Globe className="h-4 w-4" /> EN <ChevronDown className="h-4 w-4" /></span>
            <span className="hidden items-center gap-2 sm:flex"><span className="h-6 w-6 rounded-full bg-field" /> Login / My Booking</span>
          </div>
        </nav>
        <div className="relative overflow-hidden pb-24">
          <img src={hero} alt="Car in front of showroom" width={1280} height={768}
            className="absolute right-0 top-0 hidden h-full w-[66%] object-cover lg:block"
            style={{ clipPath: "ellipse(70% 115% at 85% 0%)" }} />
          <div className="relative z-10 max-w-xl px-6 pt-12 lg:px-10">
            <p className="text-xs font-semibold tracking-[0.2em] text-sand">WE'RE ALWAYS HERE FOR YOU</p>
            <h1 className="mt-4 text-5xl font-bold">Get in touch</h1>
            <p className="mt-6 max-w-sm text-lg leading-relaxed">We're here to help with your bookings and questions — our team replies fast, every day of the week.</p>
            <div className="mt-8 flex flex-wrap gap-6">
              {[[Car, "Real people, real help", "Friendly support team"], [CalendarClock, "Within 24 hours", "Quick response"], [Globe, "Your journey", "Is our priority"]].map(([I, t, s]: any) => (
                <div key={t} className="flex items-center gap-3">
                  <I className="h-9 w-9 text-sand" />
                  <div><p className="font-semibold">{t}</p><p className="text-sm opacity-90">{s}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact cards */}
      <div className="relative z-10 mx-auto -mt-10 grid max-w-6xl gap-6 px-6 md:grid-cols-3">
        {[[Phone, "Call Us", "+1 (123) 456-7890", "Mon–Sat, 9am – 8pm"], [Mail, "Email Us", "support@finovo.com", "We reply within 24 hours"], [MapPin, "Visit Us", "123 Finovo Lane, Suite 100", "Head Office · City, State, ZIP"]].map(([I, t, v, s]: any) => (
          <div key={t} className="flex gap-5 rounded-2xl border border-border bg-card p-6 shadow-card">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-plum-deep text-primary-foreground"><I className="h-5 w-5" /></span>
            <div>
              <p className="font-serif font-bold">{t}</p>
              <p className="mt-1 text-lg font-medium text-plum">{v}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Form + office */}
      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-24 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <h2 className="text-4xl font-bold text-plum-deep">Send us a Message</h2>
          <p className="mt-4 text-muted-foreground">Fill out the form and our team will get back to you shortly.</p>
          <form className="mt-8 rounded-3xl bg-card p-10 shadow-card" onSubmit={(e) => e.preventDefault()}>
            <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2">
              <Field label="Full Name" req icon={User} ph="Jordan Ahmed" />
              <Field label="Email Address" req icon={Mail} ph="jordan@email.com" />
              <Field label="Phone Number" icon={Phone} ph="+1 (123) 456-7890" />
              <Field label="Subject" req icon={Calendar} ph="Booking enquiry" />
            </div>
            <label className="mt-8 block text-sm font-semibold">Message <span className="text-gold">*</span></label>
            <div className="mt-3 flex gap-3 rounded-lg bg-field p-4">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <textarea rows={4} placeholder="Tell us how we can help you..." className="w-full resize-none bg-transparent outline-none placeholder:text-muted-foreground" />
            </div>
            <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-gold py-4 font-semibold text-plum-deep shadow-card">Send Message <ArrowRight className="h-4 w-4" /></button>
          </form>
        </div>
        <div>
          <h2 className="text-4xl font-bold text-plum-deep">Head Office</h2>
          <p className="mt-4 text-muted-foreground">Drop by or find us at our main location.</p>
          <div className="relative mt-8 h-[500px] overflow-hidden rounded-3xl">
            <img src={office} alt="Head office showroom" loading="lazy" width={1024} height={960} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-overlay" />
            <div className="absolute left-6 top-6 flex gap-4 rounded-lg bg-card p-4">
              <span className="grid h-12 w-12 place-items-center rounded-lg bg-plum-deep text-gold"><MapPin className="h-5 w-5" /></span>
              <div><p className="font-serif text-sm font-bold">Finovo Head Office</p><p className="mt-1 text-xs text-muted-foreground">123 Finovo Lane, Suite 100,<br />City, State</p></div>
            </div>
            <div className="absolute bottom-6 left-7 text-primary-foreground">
              <p className="font-serif text-2xl font-bold">Premium service starts here</p>
              <p className="mt-3 max-w-56 text-sm">Visit our office or any showroom across the city.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Locations */}
      <section className="bg-sand px-6 py-14 lg:px-12">
        <p className="text-sm font-semibold tracking-[0.15em] text-plum-deep/80">OUR LOCATIONS</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-4xl font-bold">Find Us Across the City</h2>
            <p className="mt-2 text-plum-deep/80">Visit your nearest showroom and experience Finovo in person.</p>
          </div>
          <button className="flex items-center gap-3 rounded-full bg-plum-deep px-8 py-4 font-semibold text-primary-foreground">View All Locations <ArrowRight className="h-4 w-4" /></button>
        </div>
        <div className="mt-10 grid gap-4 px-0 lg:grid-cols-[0.87fr_1fr] lg:px-6">
          <div className="flex overflow-hidden rounded-xl bg-card">
            <div className="relative w-[60%]"><img src={show1} alt="Downtown showroom" loading="lazy" width={1024} height={896} className="h-full w-full object-cover" /><Badge /></div>
            <div className="flex flex-1 flex-col p-4"><LocInfo /><DirBtn big /></div>
          </div>
          <div className="grid gap-4">
            {[show2, show1].map((img, i) => (
              <div key={i} className="flex overflow-hidden rounded-xl bg-card">
                <div className="relative w-[34%]"><img src={img} alt="Showroom" loading="lazy" width={1024} height={640} className="h-full w-full object-cover" /><Badge /></div>
                <div className="flex flex-1 items-end justify-between gap-3 p-4"><LocInfo /><DirBtn /></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:grid-cols-[0.8fr_1fr] lg:px-12">
        <div>
          <p className="text-sm font-semibold tracking-[0.15em]">FREQUENTLY ASKED QUESTIONS</p>
          <h2 className="mt-5 text-5xl font-bold leading-tight">Still Have<br />Questions?</h2>
          <p className="mt-6 max-w-sm text-lg text-muted-foreground">Find quick answers to common questions about our services, bookings, and policies.</p>
          <p className="mt-8 flex items-center gap-2 text-lg font-semibold text-plum"><MessageCircle className="h-5 w-5" /> Chat with support</p>
        </div>
        <div className="border-t border-border">
          {faqs.map((f, i) => (
            <div key={i} className="border-b border-border py-6">
              <button className="flex w-full items-center gap-5 text-left" onClick={() => setOpen(open === i ? -1 : i)}>
                <span className={`grid h-8 w-8 place-items-center rounded-full text-sm font-semibold ${open === i ? "bg-gold" : "bg-field"}`}>{i + 1}</span>
                <span className="flex-1 text-xl font-medium">{f.q}</span>
                <span className={`grid h-8 w-8 place-items-center rounded-full ${open === i ? "bg-gold" : "bg-field"}`}>{open === i ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}</span>
              </button>
              {open === i && <p className="mt-6 pl-14 pr-6 text-lg leading-relaxed text-muted-foreground">{f.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-0 rounded-t-[6rem] bg-footer px-10 pb-10 pt-16 text-primary-foreground lg:px-28">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_0.5fr_0.8fr_1.1fr]">
          <div>
            <Logo big />
            <p className="mt-6 text-2xl font-medium">Social Links</p>
            <div className="mt-4 flex gap-2">
              {[Instagram, Twitter, Music2].map((I, i) => <span key={i} className="grid h-12 w-12 place-items-center rounded-lg border border-primary-foreground/40 bg-primary-foreground/15"><I className="h-5 w-5" /></span>)}
            </div>
          </div>
          <div><p className="text-2xl font-medium">Quick Links</p><ul className="mt-4 space-y-2 text-sm">{["Home", "About", "Features", "Contact"].map((l) => <li key={l}>{l}</li>)}</ul></div>
          <div><p className="text-2xl font-medium">Contact</p><ul className="mt-4 space-y-3 text-sm"><li>support@finovo.com</li><li>+1 (123) 456-7890</li><li>123 Finovo Lane, Suite 100, City, State, ZIP</li></ul></div>
          <div>
            <p className="text-2xl font-medium">App Coming Soon</p>
            <p className="mt-4 text-sm">Get our car rental app soon to search, book, and manage your ride anytime, anywhere.</p>
            <div className="mt-3 flex gap-3">
              {[["Available on the", "App Store"], ["Get it on", "Google Play"]].map(([a, b]) => (
                <span key={b} className="rounded-xl border-2 border-primary-foreground/60 bg-plum-deep px-5 py-2 leading-tight"><span className="block text-[9px]">{a}</span><span className="text-sm font-semibold">{b}</span></span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-16 flex flex-wrap justify-between gap-4 border-t border-primary-foreground/30 px-8 pt-8 text-sm">
          <p>© 2026 <b>Finovo.</b> All Rights Reserved.</p>
          <p className="flex gap-10"><span>Privacy Policy</span><span>Terms &amp; Conditions</span></p>
        </div>
      </footer>
    </div>
  );
}

function Field({ label, req, icon: I, ph }: { label: string; req?: boolean; icon: any; ph: string }) {
  return (
    <div>
      <label className="text-sm font-semibold">{label} {req && <span className="text-gold">*</span>}</label>
      <div className="mt-3 flex items-center gap-3 rounded-lg bg-field px-4 py-4">
        <I className="h-4 w-4 text-muted-foreground" />
        <input placeholder={ph} className="w-full bg-transparent outline-none placeholder:text-muted-foreground" />
      </div>
    </div>
  );
}
const Badge = () => <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-xs font-semibold"><span className="h-2 w-2 rounded-full bg-chart-2" /> Open Now</span>;
function LocInfo() {
  return (
    <div className="space-y-2 text-sm">
      <p className="font-semibold text-plum">Downtown Showroom</p>
      <p className="flex gap-2"><MapPin className="h-4 w-4 text-gold" /> 45 Main Boulevard, Downtown, City</p>
      <p className="flex gap-2"><Phone className="h-4 w-4 text-gold" /> +1 (123) 456-7890</p>
      <span className="inline-flex items-center gap-2 rounded-full bg-field px-4 py-1.5 text-xs font-semibold text-plum"><Car className="h-3 w-3" /> 15+ Cars Available</span>
    </div>
  );
}
const DirBtn = ({ big }: { big?: boolean }) => (
  <button className={`flex shrink-0 items-center gap-2 rounded-lg border-2 border-plum font-semibold text-plum ${big ? "mt-auto w-fit px-4 py-2" : "px-4 py-1.5 text-xs"}`}>Get Directions <ArrowRight className="h-3 w-3" /></button>
);
