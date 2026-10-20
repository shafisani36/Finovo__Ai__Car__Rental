import teamOne from "@/assets/finovo-team-one.png";
import teamTwo from "@/assets/finovo-team-two.png";
import teamThree from "@/assets/finovo-team-three.png";
import ribbon from "@/assets/finovo-team-ribbon.png";

export function TeamSection() {
  return (
    <section className="team-section" aria-labelledby="team-title"><div className="section-heading"><h2 id="team-title">The People Behind Your Perfect Ride</h2><p>A passionate team dedicated to making every journey extraordinary.</p></div><p className="handwritten team-note">Great People<br />Greater Journeys</p><div className="team-portraits"><img className="team-ribbon" src={ribbon} alt="" /><div className="polaroid-row">{[teamOne, teamTwo, teamThree].map((person, i) => <figure className={`polaroid polaroid-${i}`} key={person}><span className="tape" aria-hidden="true" /><img src={person} alt={`Finovo team member ${i + 1}`} /><figcaption><strong>Ahmed Khan</strong><span>CEO & Founder</span></figcaption></figure>)}</div></div><p className="handwritten destination-note">Different People<br />Same Destination</p></section>
  );
}
