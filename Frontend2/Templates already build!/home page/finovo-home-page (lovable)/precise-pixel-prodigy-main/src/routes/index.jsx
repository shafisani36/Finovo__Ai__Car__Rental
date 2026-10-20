import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Globe,
  MapPin,
  Menu,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { art } from "@/components/finovo/assets";
import {
  AISection,
  AppBanner,
  Benefits,
  Brand,
  CarCategories,
  Cars,
  FAQ,
  Footer,
  HowItWorks,
  Testimonials,
} from "@/components/finovo/sections";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Finovo | Find your perfect ride" },
      {
        name: "description",
        content:
          "Compare cars from trusted local showrooms, explore flexible rentals, and find your perfect ride with Finovo.",
      },
      { property: "og:title", content: "Finovo | Find your perfect ride" },
      {
        property: "og:description",
        content:
          "Explore trusted local car rentals with transparent pricing and flexible daily, weekly, and monthly plans.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});
function LocationField({ label, name, required = false }) {
  return (
    <label className="field-label">
      {label}
      <span className="field-shell">
        <MapPin />
        <select name={name} required={required} defaultValue="">
          <option value="" disabled>
            Select city
          </option>
          {["Dubai", "Abu Dhabi", "Sharjah", "Cairo", "Riyadh"].map((city) => (
            <option key={city}>{city}</option>
          ))}
        </select>
      </span>
    </label>
  );
}
function DateField({ label, name }) {
  const [active, setActive] = useState(false);
  return (
    <label className="field-label">
      {label}
      <span className="field-shell">
        <CalendarDays />
        <input
          name={name}
          aria-label={label}
          type={active ? "datetime-local" : "text"}
          placeholder="Select Date & Time"
          onFocus={() => setActive(true)}
          required
        />
      </span>
    </label>
  );
}
function Index() {
  const [period, setPeriod] = useState("Daily");
  const [stop, setStop] = useState(false);
  const [menu, setMenu] = useState(false);
  const [category, setCategory] = useState("");
  const [result, setResult] = useState("");
  const [dialog, setDialog] = useState("");
  const [error, setError] = useState("");
  function scrollCars() {
    document.getElementById("cars")?.scrollIntoView({ behavior: "smooth" });
  }
  return (
    <div id="home">
      <header className="site-header">
        <div className="header-inner page-container">
          <Brand />
          <nav className="header-nav" data-open={menu} aria-label="Main navigation">
            {[
              ["Home", "#home"],
              ["Cars", "#cars"],
              ["Insurance", "#insurance"],
              ["About Us", "#why-us"],
              ["AI-Inspection", "#ai-inspection"],
              ["Contact", "#contact"],
            ].map(([label, href]) => (
              <a key={label} href={href} onClick={() => setMenu(false)}>
                {label}
              </a>
            ))}
          </nav>
          <div className="header-actions">
            <span className="language">
              <Globe size={16} /> EN <ChevronDown size={13} />
            </span>
            <Button variant="plumGhost" size="sm" onClick={() => setDialog("Login / My Booking")}>
              <img className="avatar rounded-full" src={art.customer1} alt="" />
              <span className="login-label">Login / My Booking</span>
            </Button>
            <Button
              className="mobile-menu-toggle"
              variant="plumGhost"
              size="icon"
              aria-label="Toggle menu"
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
      </header>
      <main>
        <section className="hero-band">
          <div className="page-container hero-grid">
            <div className="hero-copy">
              <h1>
                Find your
                <br />
                Perfect Ride
              </h1>
              <p className="hero-description">
                Compare cars from trusted local showrooms, book in minutes,
                <br className="hidden md:block" /> and hit the road with transparent pricing – no
                surprises at pickup.
              </p>
              <p className="hero-rating">
                <span className="stars">★★★★★</span> &nbsp; 4.8 / 5 - 2,300+ reviews
              </p>
              <form
                className="search-panel"
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = new FormData(e.currentTarget);
                  const start = String(data.get("pickup-date"));
                  const end = String(data.get("dropoff-date"));
                  if (new Date(end) <= new Date(start)) {
                    setError("Drop-off must be after pick-up.");
                    return;
                  }
                  setError("");
                  setCategory("");
                  setResult(`${period} rentals available in ${data.get("pickup-city")}`);
                  scrollCars();
                }}
              >
                <div className="rental-tabs">
                  {["Daily", "Weekly", "Monthly"].map((tab) => (
                    <Button
                      type="button"
                      key={tab}
                      className="rental-tab"
                      variant="plumGhost"
                      data-active={period === tab}
                      aria-pressed={period === tab}
                      onClick={() => setPeriod(tab)}
                    >
                      {tab}
                    </Button>
                  ))}
                </div>
                <fieldset>
                  <legend>Pick-up</legend>
                  <div className="field-row">
                    <LocationField label="Pick-up location" name="pickup-city" required />
                    <DateField label="Pick-up Date & Time" name="pickup-date" />
                  </div>
                </fieldset>
                <fieldset>
                  <legend>Drop-off</legend>
                  <div className="field-row">
                    <LocationField label="Drop-off location" name="dropoff-city" required />
                    <DateField label="Drop-off Date & Time" name="dropoff-date" />
                  </div>
                </fieldset>
                <Button
                  type="button"
                  variant="secondary"
                  className="additional-stop"
                  onClick={() => setStop(!stop)}
                >
                  <Plus /> {stop ? "Remove additional stop" : "Add additional stop"}
                  <ChevronDown className="ml-auto" />
                </Button>
                {stop && <LocationField label="Additional stop" name="additional-stop" />}
                <div className="booking-promises">
                  {["Free cancellation", "No hidden charges", "24/7 support"].map((text) => (
                    <span key={text}>
                      <CheckCircle2 />
                      {text}
                    </span>
                  ))}
                </div>
                {error && (
                  <p role="alert" className="text-sunshine text-xs mb-3">
                    {error}
                  </p>
                )}
                <Button variant="sunshine" className="search-button" type="submit">
                  Search Cars
                </Button>
              </form>
            </div>
            <img
              className="hero-photo"
              src={art.hero}
              alt="Silver Audi rental car on a scenic mountain road"
              fetchPriority="high"
            />
          </div>
        </section>
        <CarCategories
          onSelect={(name) => {
            setCategory(name);
            setResult(`Explore ${name} rentals`);
            scrollCars();
          }}
        />
        <Cars
          result={result}
          category={category}
          onReset={() => {
            setCategory("");
            setResult("");
          }}
        />
        <AISection />
        <Benefits />
        <HowItWorks />
        <Testimonials />
        <section className="insurance-banner page-container" id="insurance">
          <h2>Car insurance Banner</h2>
        </section>
        <FAQ />
        <AppBanner />
      </main>
      <Footer onLegal={setDialog} />
      <Dialog
        open={Boolean(dialog)}
        onOpenChange={(open) => {
          if (!open) setDialog("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog}</DialogTitle>
            <DialogDescription>
              {dialog === "Login / My Booking"
                ? "Online account access and booking management are coming soon. Contact support@finovo.com for booking assistance."
                : "This document has not been provided yet. Contact support@finovo.com for more information."}
            </DialogDescription>
          </DialogHeader>
          <Button asChild>
            <a href="mailto:support@finovo.com">Contact support</a>
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
