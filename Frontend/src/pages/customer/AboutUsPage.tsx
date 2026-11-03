import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import '../../styles/about-page.css';

import heroImg from '../../assets/about/finovo-hero.png';
import steeringImg from '../../assets/about/finovo-steering.png';
import missionImg from '../../assets/about/finovo-mission.png';
import visionImg from '../../assets/about/finovo-vision.png';
import shieldImg from '../../assets/about/finovo-shield.png';
import carImg from '../../assets/about/finovo-car.png';
import supportImg from '../../assets/about/finovo-support.png';
import calendarImg from '../../assets/about/finovo-calendar.png';
import teamOne from '../../assets/about/finovo-team-one.png';
import teamTwo from '../../assets/about/finovo-team-two.png';
import teamThree from '../../assets/about/finovo-team-three.png';
import journeyImg from '../../assets/about/finovo-journey.png';

export function AboutUsPage() {
  const benefits = [
    {
      title: 'Trust & Transparency',
      desc: 'No hidden fees, honest pricing, and full clarity before you step behind the wheel.',
      img: shieldImg,
    },
    {
      title: 'Premium Fleet',
      desc: 'Extensive line-up of world-class, meticulously maintained luxury and economy vehicles.',
      img: carImg,
    },
    {
      title: '24/7 Roadside Support',
      desc: 'Our dedicated customer success team is on standby 24/7 for help across any city.',
      img: supportImg,
    },
    {
      title: 'Seamless Digital Booking',
      desc: 'Pick your dates, choose your insurance, and get instant digital key access.',
      img: calendarImg,
    },
  ];

  const team = [
    { name: 'Ahmed Khan', role: 'CEO & Founder', img: teamOne },
    { name: 'Sarah Al-Mansoor', role: 'Head of Operations', img: teamTwo },
    { name: 'Fariha Siddiqui', role: 'Customer Experience Lead', img: teamThree },
  ];

  return (
    <div className="finovo-about-page">
      {/* Hero Section */}
      <section className="intro-band" aria-labelledby="about-hero-title">
        <img className="hero-photo" src={heroImg} alt="Finovo luxury rental car experience" />
        <div className="intro-copy">
          <p className="eyebrow">ABOUT FINOVO</p>
          <h1 id="about-hero-title">Driven by People.<br />Built for Better Journeys.</h1>
          <p className="intro-description">
            At Finovo, we believe every journey should be simple, safe, and extraordinary.
            We are more than a car rental platform — we are your trusted mobility partner.
          </p>
          <Link
            to="/cars"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              backgroundColor: '#FAB826',
              color: '#1E0426',
              borderRadius: '30px',
              fontWeight: 700,
              fontSize: '14px',
              textDecoration: 'none',
              boxShadow: '0 4px 15px rgba(250, 184, 38, 0.4)',
            }}
          >
            Explore Fleet <ArrowRight size={16} />
          </Link>
          <div className="stats">
            <div>
              <strong>10K+</strong>
              <span>Happy customers</span>
            </div>
            <div>
              <strong>500+</strong>
              <span>Premium cars</span>
            </div>
            <div>
              <strong>25+</strong>
              <span>Cities & locations</span>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="story-section">
        <div className="story-copy">
          <p className="eyebrow">OUR STORY</p>
          <h2>A Smarter Way to Move Forward</h2>
          <p>
            Finovo was founded with a single mission: to eliminate friction from car rental. What started
            as a boutique fleet with a vision for transparency has grown into a premier mobility platform
            trusted by thousands of business travelers, families, and automotive enthusiasts.
          </p>
          <p>
            With integrated AI computer-vision damage inspections, automated transparent pricing, and instant
            approvals, we ensure that your vehicle pickup and return take minutes, not hours.
          </p>
        </div>
        <div className="story-imagery">
          <img className="steering-photo" src={steeringImg} alt="Driver behind the wheel of a Finovo vehicle" />
          <div className="experience-badge">
            <strong>8+</strong>
            <span>Years of Excellence</span>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="mission-section">
        <div className="section-heading">
          <p className="eyebrow" style={{ textAlign: 'center' }}>PURPOSE</p>
          <h2>Our Mission & Vision</h2>
          <p>Guided by purpose. Driven by a better tomorrow.</p>
        </div>
        <div className="purpose-panels">
          <div className="purpose-panel mission-panel">
            <img src={missionImg} alt="Mission icon" />
            <div>
              <h3>Our Mission</h3>
              <p>
                To provide seamless, affordable, and reliable car rental services that empower our
                customers to explore with complete confidence and supreme comfort.
              </p>
            </div>
          </div>
          <div className="purpose-panel vision-panel">
            <img src={visionImg} alt="Vision icon" />
            <div>
              <h3>Our Vision</h3>
              <p>
                To become the most trusted mobility partner in the region, recognized for transparent pricing,
                cutting-edge AI inspection technology, and an exceptional luxury fleet.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="why-section">
        <div className="section-heading">
          <p className="eyebrow" style={{ textAlign: 'center' }}>BENEFITS</p>
          <h2>Why Choose Finovo</h2>
          <p>More than a rental. A elevated way to travel.</p>
        </div>
        <div className="benefit-grid">
          {benefits.map((b) => (
            <div className="benefit" key={b.title}>
              <img src={b.img} alt={b.title} />
              <div>
                <h3>{b.title}</h3>
                <p>{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Leadership & Team */}
      <section className="team-section">
        <div className="section-heading">
          <p className="eyebrow" style={{ textAlign: 'center' }}>OUR LEADERSHIP</p>
          <h2>The People Behind Your Perfect Ride</h2>
          <p>A passionate team dedicated to making every journey memorable and secure.</p>
        </div>
        <div className="polaroid-row">
          {team.map((member, i) => (
            <div key={member.name} className={`polaroid polaroid-${i}`}>
              <img src={member.img} alt={member.name} />
              <strong>{member.name}</strong>
              <span>{member.role}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="journey-section">
        <img className="journey-photo" src={journeyImg} alt="Finovo vehicle journey" />
        <div className="journey-copy">
          <p className="eyebrow">• LET'S GET MOVING</p>
          <h2>Ready to hit the road? Book your dream car today.</h2>
          <p style={{ opacity: 0.85, marginBottom: '24px', fontSize: '15px' }}>
            Choose from hundreds of premium sedans, SUVs, and exotics ready for instant departure.
          </p>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <Link
              to="/cars"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 28px',
                backgroundColor: '#FAB826',
                color: '#1E0426',
                borderRadius: '30px',
                fontWeight: 700,
                fontSize: '15px',
                textDecoration: 'none',
              }}
            >
              Browse Cars <ArrowRight size={16} />
            </Link>
            <Link
              to="/contact"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 28px',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                color: '#FFFFFF',
                borderRadius: '30px',
                fontWeight: 600,
                fontSize: '15px',
                textDecoration: 'none',
                border: '1px solid rgba(255, 255, 255, 0.25)',
              }}
            >
              Contact Support
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
