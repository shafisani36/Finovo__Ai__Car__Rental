import { useState } from "react";
import logo from "../../assets/finovo-logo.png";
import mercedes from "../../assets/finovo-mercedes.png"
import audi from "../../assets/finovo-audi.png"
import bmw from "../../assets/finovo-bmw.png"
import porsche from "../../assets/finovo-porsche.png"
import whiteSuv from "../../assets/finovo-car-white-suv.png"
import red from "../../assets/finovo-car-red.png"
import blue from "../../assets/finovo-car-blue.png"
import white from "../../assets/finovo-car-white.png"
import sand from "../../assets/finovo-sand.png"
import damage from "../../assets/finovo-ai-damage.png"
import health from "../../assets/finovo-ai-health.png"
import claims from "../../assets/finovo-ai-claims.png"
import avatar1 from "../../assets/finovo-avatar-1.png"
import avatar2 from "../../assets/finovo-avatar-2.png"
import avatar3 from "../../assets/finovo-avatar-3.png"
import top from "../../assets/finovo-car-top.png"
import search from "../../assets/finovo-step-search.png"
import choose from "../../assets/finovo-step-choose.png"
import book from "../../assets/finovo-step-book.png"
import customer1 from "../../assets/finovo-customer-1.png"
import customer2 from "../../assets/finovo-customer-2.png"
import customer3 from "../../assets/finovo-customer-3.png"
import customer4 from "../../assets/finovo-customer-4.png"
import phones from "../../assets/finovo-phones.png"


import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Battery,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Fuel,
  Gauge,
  HeartPulse,
  Instagram,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wallet,
  Wrench,
  X,
  Youtube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { art } from "./assets";
export function Brand({ large = false }) {
  return (
    <a href="#home" className="brand" aria-label="Finovo home">
      <img className="brand-mark" src={logo} alt="" />
      {!large && "Finovo"}
    </a>
  );
}
export function CarCategories({ onSelect }) {
  return (
    <section className="finovo-section page-container" id="categories">
      <h2 className="section-title">Car Category</h2>
      <div className="category-grid">
        {[
          { name: "Mercedes-Benz", image:mercedes, light: true },
          { name: "Audi", image:audi, light: false },
          { name: "BMW", image: bmw, light: true },
          { name: "Porsche", image: porsche, light: false },
        ].map((item) => (
          <article className="category-card" key={item.name}>
            <div className="category-image" data-light={item.light}>
              <img src={item.image} alt={item.name} loading="lazy" />
              <h3>
                {item.name === "Mercedes-Benz" ? (
                  <>
                    Mercedes-
                    <br />
                    Benz
                  </>
                ) : (
                  item.name
                )}
              </h3>
            </div>
            <Button
              className="category-arrow"
              size="icon"
              aria-label={`Browse ${item.name} cars`}
              onClick={() => onSelect(item.name)}
            >
              <ArrowUpRight />
            </Button>
          </article>
        ))}
      </div>
    </section>
  );
}
export function Cars({ result, category, onReset }) {
  return (
    <section className="browse-band" id="cars">
      <div className="page-container">
        <div className="browse-heading">
          <h2 className="section-title">Browse by Car Type</h2>
          <Button variant="plumGhost" size="sm" onClick={onReset}>
            View All Cars <ArrowUpRight />
          </Button>
        </div>
        {result && (
          <p className="search-result" role="status">
            {result}
          </p>
        )}
        <div className="car-grid">
          {[whiteSuv, red, white, blue].map((image, i) => (
            <article className="car-item" key={image}>
              <img
                className="car-image"
                src={image}
                alt={`${category || "Mercedes-AMG"} rental car ${i + 1}`}
                loading="lazy"
              />
              <h3>{category ? `${category} GTR` : "Mercedes-AMG GTR"}</h3>
              <p className="car-model">CABRIOLET</p>
              <div className="car-specs">
                <span>
                  <Wrench />
                  Automatic
                </span>
                <span>
                  <Fuel />
                  Petrol
                </span>
                <span>
                  <Gauge />
                  163 HP
                </span>
                <span>
                  <Battery />
                  2WD
                </span>
              </div>
              <div className="car-price">
                <span className="stars" aria-label="5 stars">
                  ★★★★★
                </span>
                <strong>
                  $789 <small>/ day</small>
                </strong>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
export function AISection() {
  return (
    <section className="ai-section page-container" id="ai-inspection">
      <div className="ai-panel">
        <img className="ai-landscape" src={sand} alt="" loading="lazy" />
        <div className="ai-intro">
          <div className="ai-eyebrow">
            <Sparkles size={20} />
            POWERED BY AI
          </div>
          <h2>
            Smarter Cars
            <br />
            Safer Journeys
          </h2>
          <p>Advanced AI solutions to keep your fleet safer, healthier and more efficient.</p>
          <Button variant="sunshine" className="learn-button" asChild>
            <a href="#why-us">
              Learn More <ArrowRight />
            </a>
          </Button>
        </div>
        <article className="ai-card">
          <img src={damage} alt="AI damage inspection of a car" loading="lazy" />
          <div className="ai-card-body">
            <h3>
              <CalendarCheck />
              AI Damage
            </h3>
            <p>Automatically detect and assess vehicle damages from photos using AI.</p>
            <span className="scan-label">
              Scan &amp; Detect <ArrowRight size={10} />
            </span>
          </div>
        </article>
        <article className="ai-card">
          <img src={health} alt="AI-powered fleet health monitoring" loading="lazy" />
          <div className="ai-card-body">
            <h3>
              <HeartPulse />
              Inspection Fleet Health
            </h3>
            <p>Monitor fleet condition, service status and overall vehicle health.</p>
            {[
              ["Engine", "100%"],
              ["Brakes", "99%"],
              ["Tires", "92%"],
              ["Battery", "98%"],
            ].map(([name, value]) => (
              <div className="health-row" key={name}>
                <span>{name}</span>
                <span className="health-track" />
                <span>{value}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="ai-card">
          <img src={claims} alt="AI-verified vehicle claims" loading="lazy" />
          <div className="ai-card-body">
            <h3>
              <ShieldCheck />
              Distributor Claimer
            </h3>
            <p>Simplify and verify distributor or insurance claim processes with AI.</p>
            <span className="scan-label verified-label">
              <BadgeCheck size={11} />
              Claim Verified
            </span>
          </div>
        </article>
      </div>
    </section>
  );
}
export function Benefits() {
  return (
    <section id="why-us" className="benefits-section page-container">
      <div className="section-heading">
        <h2 className="section-title">Why Choose Us</h2>
        <p>
          Enjoy a seamless rental experience with insured cars, transparent pricing, and support
          whenever you need it.
        </p>
      </div>
      <div className="benefit-grid">
        <article className="benefit-item">
          <div className="benefit-copy">
            <h3>Find cars near you instantly.</h3>
            <p>Browse available vehicles by city, date, and budget in just a few taps.</p>
          </div>
          <img className="benefit-car" src={white} alt="White rental car" loading="lazy" />
          {[
            ["Zion Lark", avatar1, "chip-one"],
            ["Larkin", avatar2, "chip-two"],
            ["Rami", avatar3, "chip-three"],
          ].map(([name, image, cls]) => (
            <div key={name} className={`location-chip ${cls}`}>
              <img src={image} alt="" />
              <span>
                <strong>{name}</strong>
                <small>Nearby showroom</small>
              </span>
            </div>
          ))}
        </article>
        <article className="benefit-item">
          <div className="benefit-copy">
            <h3>Simple plans with no hidden fees.</h3>
            <p>Choose daily, weekly or monthly rentals with clear pricing every time.</p>
          </div>
          <div className="benefit-label">
            <Wallet />
            <span>
              <strong>Transparent Pricing</strong>
              <small>What you see is what you pay.</small>
            </span>
          </div>
          <div className="benefit-label label-second">
            <CalendarCheck />
            <span>
              <strong>Flexible Plans</strong>
              <small>Daily, weekly or monthly rentals.</small>
            </span>
          </div>
        </article>
        <article className="benefit-item">
          <div className="benefit-copy">
            <h3>Drive verified, well-maintained cars.</h3>
            <p>Every vehicle is quality-checked, cleaned, and ready for your trip.</p>
          </div>
          <div className="inspection-tags">
            {["Inspected", "Cleaned", "Road-ready"].map((label) => (
              <span key={label}>
                <CheckCircle2 />
                {label}
              </span>
            ))}
          </div>
          <img
            className="benefit-car car-top"
            src={top}
            alt="Top view of an inspected car"
            loading="lazy"
          />
        </article>
        <article className="benefit-item">
          <div className="benefit-copy">
            <h3>
              Get support before and during
              <br />
              your trip.
            </h3>
            <p>
              Book with confidence and get help anytime with
              <br />
              24/7 customer support.
            </p>
          </div>
          <div className="support-labels">
            <div className="benefit-label">
              <MessageCircle />
              <span>
                <strong>24/7 Customer Support</strong>
                <small>We're here for you.</small>
              </span>
            </div>
            <div className="benefit-label">
              <Smartphone />
              <span>
                <strong>Assistance On The Road</strong>
                <small>Help whenever you need it.</small>
              </span>
            </div>
          </div>
          <img className="benefit-car" src={red} alt="Red rental car" loading="lazy" />
        </article>
      </div>
    </section>
  );
}
export function HowItWorks() {
  return (
    <>
      <section className="steps-band" id="how-it-works">
        <div className="page-container">
          <div className="section-heading">
            <h2 className="section-title">How It Works</h2>
            <p>
              Find your perfect rental car in just a few simple steps – search, choose, book, and
              drive with ease.
            </p>
          </div>
          <div className="steps-grid">
            {[
              {
                title: "Search",
                text: "Enter your location and rental dates to find available cars.",
                image: search,
              },
              {
                title: "Choose",
                text: "Enter your location and rental dates to find available cars.",
                image: choose,
              },
              {
                title: "Book & Drive",
                text: "Confirm your booking, pick up your car, and hit the road.",
                image: book,
              },
            ].map((item) => (
              <article className="step-item" key={item.title}>
                <div className="step-copy">
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
                <img src={item.image} alt={`${item.title} illustration`} loading="lazy" />
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="stats-band">
        <div className="page-container stats-grid">
          {[
            ["Cars in Fleet", "500+"],
            ["Happy Customers", "10K+"],
            ["Locations", "15"],
            ["Customer Support", "24/7"],
          ].map(([label, value]) => (
            <div className="stat" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
export function Testimonials() {
  return (
    <section className="testimonials-section page-container">
      <div className="testimonials-title">
        <h2>What Our Customers Say</h2>
        <p>
          See why customers trust us for a smooth, reliable,
          <br />
          and stress-free rental experience.
        </p>
      </div>
      {[
        {
          name: "Ahmad",
          image: customer1,
          cls: "quote-main",
          text: "Smooth booking and the car was exactly as shown. Highly recommended. The service was impeccable from start to finish.",
        },
        {
          name: "Fatima S. (Dubai)",
          image:  customer2,
          cls: "quote-left",
          text: "24/7 support really helped during our trip. Will rent again!",
        },
        {
          name: "Fatima S. (Sudak)",
          image:  customer4,
          cls: "quote-middle",
          text: "24/7 support really helped during our trip. Will rent again!",
        },
        {
          name: "Khalid M. (Dubai)",
          image:  customer3,
          cls: "quote-right",
          text: "24/7 support really helped during our trip. Will rent again!",
        },
      ].map((item) => (
        <article className={`testimonial ${item.cls}`} key={item.cls}>
          <img src={item.image} alt={item.name} loading="lazy" />
          <div className="quote-body">
            <strong>{item.name}</strong>
            <span className="stars">★★★★★</span>
            <p>“{item.text}”</p>
          </div>
        </article>
      ))}
    </section>
  );
}
const faqs = [
  [
    "What documents do I need to rent a car?",
    "Document requirements depend on the showroom and destination. Contact support for the requirements for your rental.",
  ],
  [
    "Can I return the car at another location?",
    "Contact the showroom to confirm whether a different return location is available.",
  ],
  [
    "Is a security deposit required?",
    "Deposit requirements vary by vehicle and showroom. Confirm the details before booking.",
  ],
  [
    "What is the minimum age to rent a car?",
    "Age requirements depend on the vehicle and showroom. Contact support for details.",
  ],
  [
    "What is the cancellation policy?",
    "Check the cancellation terms for your selected rental before confirming your booking.",
  ],
  [
    "Is a security deposit required?",
    "Your selected showroom can confirm the deposit amount and accepted payment methods.",
  ],
  [
    "Is insurance included in the rental?",
    "Insurance coverage varies by rental. Confirm the included coverage with the showroom.",
  ],
];
export function FAQ() {
  const [open, setOpen] = useState(null);
  return (
    <section className="faq-band" id="faq">
      <div className="page-container">
        <h2>Frequently Asked Questions</h2>
        <div className="faq-grid">
          <aside className="faq-contact">
            <h3>Still have a question?</h3>
            <div>
              <p>
                Can't find the answer you're looking for? Our team is here to help. Get in touch and
                we'll be happy to assist you.
              </p>
              <Button className="email-button" asChild>
                <a href="mailto:support@finovo.com">Send email</a>
              </Button>
            </div>
          </aside>
          {faqs.map(([question, answer], i) => (
            <article className="faq-item" data-open={open === i} key={i}>
              <Button
                className="faq-question"
                variant="ghost"
                aria-expanded={open === i}
                aria-controls={`faq-answer-${i}`}
                onClick={() => setOpen(open === i ? null : i)}
              >
                {question}
                {open === i ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </Button>
              {open === i && (
                <p className="faq-answer" id={`faq-answer-${i}`}>
                  {answer}
                </p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
export function StoreLinks() {
  return (
    <div className="store-links">
      <a
        className="store-badge"
        href="mailto:support@finovo.com?subject=Finovo%20iOS%20app%20updates"
        aria-label="Request App Store launch updates"
      >
        <Smartphone />
        <span>
          <small>Available on the</small>App Store
        </span>
      </a>
      <a
        className="store-badge"
        href="mailto:support@finovo.com?subject=Finovo%20Android%20app%20updates"
        aria-label="Request Google Play launch updates"
      >
        <Youtube />
        <span>
          <small>Get it on</small>Google Play
        </span>
      </a>
    </div>
  );
}
export function AppBanner() {
  return (
    <section className="app-section page-container">
      <div className="app-panel">
        <img
          className="phone-image"
          src={phones}
          alt="Finovo mobile app phone mockups"
          loading="lazy"
        />
        <div className="app-copy">
          <h2>Drive Your Journey With Ease</h2>
          <p>
            Find nearby rental cars, compare options, and reserve your vehicle in just a few taps.
            Fast, reliable, and convenient car rental at your fingertips.
          </p>
          <StoreLinks />
        </div>
      </div>
    </section>
  );
}
export function Footer({ onLegal }) {
  return (
    <footer className="site-footer" id="contact">
      <div className="page-container footer-grid">
        <div className="footer-brand">
          <Brand large />
          <p>Social Links</p>
          <div className="social-links">
            {[
              [Instagram, "Instagram"],
              [X, "X"],
              [Youtube, "YouTube"],
            ].map(([Icon, label]) => {
              const Symbol = Icon;
              return (
                <a
                  key={String(label)}
                  href={`mailto:support@finovo.com?subject=${label}`}
                  aria-label={`Contact Finovo about ${label}`}
                >
                  <Symbol />
                </a>
              );
            })}
          </div>
        </div>
        <div>
          <h3>Quick Links</h3>
          <div className="footer-links">
            <a href="#home">Home</a>
            <a href="#why-us">About</a>
            <a href="#ai-inspection">Features</a>
            <a href="mailto:support@finovo.com">Contact</a>
          </div>
        </div>
        <div>
          <h3>Contact</h3>
          <p>
            <a href="mailto:support@finovo.com">support@finovo.com</a>
            <br />
            <a href="tel:+1234567890">+1 (23) 456-7890</a>
            <br />
            123 Finovo Lane, Suite 100,
            <br />
            City, State, ZIP
          </p>
        </div>
        <div className="footer-app">
          <h3>App Coming Soon</h3>
          <p>
            Get your rental car app soon to search, book, and manage your ride anytime, anywhere.
          </p>
          <StoreLinks />
        </div>
      </div>
      <div className="footer-bottom">
        <div className="page-container">
          <span>© 2026 Finovo. All Rights Reserved.</span>
          <span>
            <a
              href="#privacy"
              onClick={(e) => {
                e.preventDefault();
                onLegal("Privacy Policy");
              }}
            >
              Privacy Policy
            </a>
            <a
              href="#terms"
              onClick={(e) => {
                e.preventDefault();
                onLegal("Terms & Conditions");
              }}
            >
              Terms &amp; Conditions
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
