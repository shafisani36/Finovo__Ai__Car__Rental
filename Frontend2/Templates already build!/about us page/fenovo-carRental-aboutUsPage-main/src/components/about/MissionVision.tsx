import { Infinity } from "lucide-react";
import mission from "@/assets/finovo-mission.png";
import vision from "@/assets/finovo-vision.png";

export function MissionVision() {
  return (
    <section className="mission-section" aria-labelledby="mission-title">
        <div className="mission-backdrop" aria-hidden="true" />
        <div className="section-heading centered"><h2 id="mission-title">Our Mission & Vision</h2><p>Guided by purpose. Driven by a better tomorrow.</p></div>
        <p className="bright-note">A BRIGHT<br />JOURNEY<br />AHEAD</p>
        <div className="purpose-panels"><div className="purpose-panel mission-panel"><img src={mission} alt="" /><div><h3>Mission</h3><p>To provide seamless, affordable, and reliable car rental services that empower our customers to explore with confidence and comfort.</p></div></div><div className="infinity-mark" aria-hidden="true"><Infinity /></div><div className="purpose-panel vision-panel"><img src={vision} alt="" /><div><h3>Vision</h3><p>To become the most trusted and preferred mobility partner in the region, known for our exceptional fleet and customer-first approach.</p></div></div></div>
      </section>
  );
}
