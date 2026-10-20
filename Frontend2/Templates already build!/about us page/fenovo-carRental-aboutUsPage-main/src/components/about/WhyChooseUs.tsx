import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import shield from "@/assets/finovo-shield.png";
import car from "@/assets/finovo-car.png";
import support from "@/assets/finovo-support.png";
import calendar from "@/assets/finovo-calendar.png";

export const benefits = [
  { title: "Trust & Transparency", text: "No hidden fees, clear pricing, and honest service every step of the way.", image: shield, className: "trust" },
  { title: "Premium Fleet", text: "Well-maintained, latest models, and fully insured vehicles.", image: car, className: "fleet" },
  { title: "24/7 Support", text: "Our team is always available to help you, anywhere on the road.", image: support, className: "support" },
  { title: "Easy Booking", text: "Quick, hassle-free booking with flexible plans and instant confirmation.", image: calendar, className: "booking" },
];

export function WhyChooseUs({ setNotice }: { setNotice: (notice: string) => void }) {
  return (
    <section id="why-us" className="why-section" aria-labelledby="why-title"><div className="section-heading"><h2 id="why-title">Why Choose Us</h2><p>More than a rental. A better way to travel.</p></div><p className="handwritten why-note">Small Details<br />Big Journeys</p><div className="benefit-grid">{benefits.map(item => <article className={`benefit ${item.className}`} key={item.title}><img src={item.image} alt="" /><div><h3>{item.title}</h3><p>{item.text}</p></div><Button variant="ghost" size="icon" className="benefit-arrow" aria-label={`Learn about ${item.title}`} onClick={() => setNotice(item.title)}><ArrowRight /></Button></article>)}</div></section>
  );
}
