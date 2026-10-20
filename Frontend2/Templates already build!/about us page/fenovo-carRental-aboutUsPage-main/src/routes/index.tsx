import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/about/SiteHeader";
import { HeroStory } from "@/components/about/HeroStory";
import { MissionVision } from "@/components/about/MissionVision";
import { WhyChooseUs, benefits } from "@/components/about/WhyChooseUs";
import { TeamSection } from "@/components/about/TeamSection";
import { JourneyCTA } from "@/components/about/JourneyCTA";
import { SiteFooter } from "@/components/about/SiteFooter";
import hero from "@/assets/finovo-hero.png";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "About Finovo | Driven by People. Built for Better Journeys." },
    { name: "description", content: "Meet Finovo, your trusted mobility partner. Discover our story, mission, premium fleet, and the people behind your perfect ride." },
    { property: "og:title", content: "About Finovo | Better Journeys" },
    { property: "og:description", content: "Driven by people. Discover the story and team behind Finovo's reliable car rental experience." },
    { property: "og:type", content: "website" },
    { property: "og:image", content: hero },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:image", content: hero },
  ] }),
  component: Index,
});

function Index() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="finovo-page" id="top">
      <SiteHeader menuOpen={menuOpen} setMenuOpen={setMenuOpen} setNotice={setNotice} />
      <main>
        <HeroStory />
        <MissionVision />
        <WhyChooseUs setNotice={setNotice} />
        <TeamSection />
        <JourneyCTA setNotice={setNotice} />
      </main>
      <SiteFooter setNotice={setNotice} />
      {notice && <div className="dialog-backdrop" onClick={() => setNotice(null)}><section className="notice-dialog" role="dialog" aria-modal="true" aria-labelledby="notice-title" onClick={e => e.stopPropagation()}><Button variant="ghost" size="icon" className="dialog-close" aria-label="Close dialog" onClick={() => setNotice(null)}><X /></Button><h2 id="notice-title">{notice}</h2>{notice === "Language" ? <p>English</p> : notice === "App Coming Soon" ? <p>Our Finovo app is coming soon.</p> : <><p>{benefits.find(item => item.title === notice)?.text ?? "Contact our team for more information."}</p><Button variant="journey" asChild><a href="mailto:support@finovo.com">Contact Finovo <ArrowRight /></a></Button></>}</section></div>}
    </div>
  );
}
