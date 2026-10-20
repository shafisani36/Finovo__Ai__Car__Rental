import hero from "@/assets/finovo-hero.png";
import steering from "@/assets/finovo-steering.png";
import road from "@/assets/finovo-road.png";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function HeroStory() {
  return (
    <section className="intro-band" aria-labelledby="about-title">
        <img className="hero-photo" src={hero} alt="A traveler beside a premium Finovo rental car" />
        <div className="intro-copy"><p className="eyebrow">ABOUT FINOVO</p><h1 id="about-title">Driven by People.<br />Built for Better Journeys.</h1><p className="intro-description">At Finovo, we believe every journey should be simple, safe and extraordinary.<br className="desktop-break" /> We’re more than a car rental platform — we’re your trusted mobility partner.</p><Button variant="journey" asChild><a href="#story">Our Story <ArrowRight /></a></Button><div className="stats"><div><strong>10K+</strong><span>Happy customers</span></div><div><strong>500+</strong><span>Premium cars</span></div><div><strong>25+</strong><span>Cities & locations</span></div></div></div>
        <div id="story" className="story-copy"><p className="eyebrow">OUR STORY</p><h2>A Smarter Way to<br />Move Forward</h2><p>Finovo was founded with a simple idea — to make car rentals effortless, reliable, and accessible for everyone. What started as a small team with a big vision has now grown into a trusted brand, serving thousands of happy customers across the region.</p></div>
        <img className="road-photo" src={road} alt="An open road through a scenic mountain landscape" />
        <img className="steering-photo" src={steering} alt="A comfortable journey behind the wheel" />
        <div className="experience"><span>Year of<br />Experience</span><strong>8+</strong><p>Eight years of helping travelers explore more with trust, comfort, and convenience.</p></div>
        <p className="possibilities">PEOPLE<br />PLACES<br />POSSIBILITIES</p>
      </section>
  );
}
