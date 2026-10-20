import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import journey from "@/assets/finovo-journey.png";

export function JourneyCTA({ setNotice }: { setNotice: (notice: string) => void }) {
  return (
    <section id="get-moving" className="journey-section" aria-labelledby="journey-title"><img className="journey-photo" src={journey} alt="A silver Porsche on a sunlit coastal road" /><div className="journey-copy"><p className="eyebrow">• LET’S GET MOVING</p><h2 id="journey-title">Ready to hit the<br />road? Book your<br />dream car today.</h2><Button variant="journey" size="lg" onClick={() => setNotice("Explore Cars")}>Explore Cars <ArrowRight /></Button><div className="traveler-proof"><div className="avatar-stack"><span>AK</span><span>SA</span><span>UT</span></div><p>Join thousands of happy travelers across the region.</p></div></div></section>
  );
}
