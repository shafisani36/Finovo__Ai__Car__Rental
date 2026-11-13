import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { formatCount, usePublicStats, useSiteInfo } from '../../hooks/usePublicSite';
import '../../styles/about-page.css';

import heroImg from '../../assets/about/finovo-hero.webp';
import steeringImg from '../../assets/about/finovo-steering.webp';
import missionImg from '../../assets/about/finovo-mission.webp';
import visionImg from '../../assets/about/finovo-vision.webp';
import shieldImg from '../../assets/about/finovo-shield.webp';
import carImg from '../../assets/about/finovo-car.webp';
import supportImg from '../../assets/about/finovo-support.webp';
import calendarImg from '../../assets/about/finovo-calendar.webp';
import teamOne from '../../assets/about/finovo-team-one.png';
import teamTwo from '../../assets/about/finovo-team-two.png';
import teamThree from '../../assets/about/finovo-team-three.webp';
import journeyImg from '../../assets/about/finovo-journey.webp';

export function AboutUsPage() {
  const { t } = useTranslation();
  const stats = usePublicStats();
  const site = useSiteInfo();
  const yearsInBusiness = site?.foundedYear ? new Date().getFullYear() - site.foundedYear : null;

  const benefits = [
    {
      title: t('about.b1Title'),
      desc: t('about.b1Desc'),
      img: shieldImg,
    },
    {
      title: t('about.b2Title'),
      desc: t('about.b2Desc'),
      img: carImg,
    },
    {
      title: t('about.b3Title'),
      desc: t('about.b3Desc'),
      img: supportImg,
    },
    {
      title: t('about.b4Title'),
      desc: t('about.b4Desc'),
      img: calendarImg,
    },
  ];

  const team = [
    { name: 'Ahmed Khan', role: t('about.role1'), img: teamOne },
    { name: 'Sarah Al-Mansoor', role: t('about.role2'), img: teamTwo },
    { name: 'Fariha Siddiqui', role: t('about.role3'), img: teamThree },
  ];

  return (
    <div className="finovo-about-page">
      {/* Hero Section */}
      <section className="intro-band" aria-labelledby="about-hero-title">
        <img className="hero-photo" src={heroImg} alt="Finovo luxury rental car experience" />
        <div className="intro-copy">
          <p className="eyebrow">{t('about.eyebrow')}</p>
          <h1 id="about-hero-title">
            {t('about.heroTitle1')}
            <br />
            {t('about.heroTitle2')}
          </h1>
          <p className="intro-description">{t('about.heroDesc')}</p>
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
            <span>{t('about.exploreFleet')}</span>
            <ArrowRight size={16} className="rtl-mirror-arrow" />
          </Link>
          {stats && (
            <div className="stats">
              <div>
                <strong>{formatCount(stats.customers)}</strong>
                <span>{t('about.stat1Label')}</span>
              </div>
              <div>
                <strong>{formatCount(stats.vehicles)}</strong>
                <span>{t('about.stat2Label')}</span>
              </div>
              <div>
                <strong>{formatCount(stats.branches)}</strong>
                <span>{t('about.stat3Label')}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Story Section */}
      <section className="story-section">
        <div className="story-copy">
          <p className="eyebrow">{t('about.storyEyebrow')}</p>
          <h2>{t('about.storyTitle')}</h2>
          <p>{t('about.storyP1')}</p>
          <p>{t('about.storyP2')}</p>
        </div>
        <div className="story-imagery">
          <img className="steering-photo" src={steeringImg} alt="Driver behind the wheel of a Finovo vehicle" />
          {yearsInBusiness !== null && yearsInBusiness > 0 && (
            <div className="experience-badge">
              <strong>{yearsInBusiness}+</strong>
              <span>{t('about.yearsExcellence')}</span>
            </div>
          )}
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="mission-section">
        <div className="section-heading">
          <p className="eyebrow" style={{ textAlign: 'center' }}>{t('about.purposeEyebrow')}</p>
          <h2>{t('about.missionVisionTitle')}</h2>
          <p>{t('about.missionVisionSubtitle')}</p>
        </div>
        <div className="purpose-panels">
          <div className="purpose-panel mission-panel">
            <img src={missionImg} alt={t('about.missionTitle')} />
            <div>
              <h3>{t('about.missionTitle')}</h3>
              <p>{t('about.missionDesc')}</p>
            </div>
          </div>
          <div className="purpose-panel vision-panel">
            <img src={visionImg} alt={t('about.visionTitle')} />
            <div>
              <h3>{t('about.visionTitle')}</h3>
              <p>{t('about.visionDesc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="why-section">
        <div className="section-heading">
          <p className="eyebrow" style={{ textAlign: 'center' }}>{t('about.benefitsEyebrow')}</p>
          <h2>{t('about.whyTitle')}</h2>
          <p>{t('about.whySubtitle')}</p>
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
          <p className="eyebrow" style={{ textAlign: 'center' }}>{t('about.teamEyebrow')}</p>
          <h2>{t('about.teamTitle')}</h2>
          <p>{t('about.teamSubtitle')}</p>
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
          <p className="eyebrow">{t('about.ctaEyebrow')}</p>
          <h2>{t('about.ctaTitle')}</h2>
          <p style={{ opacity: 0.85, marginBottom: '24px', fontSize: '15px' }}>
            {t('about.ctaDesc')}
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
              <span>{t('about.browseCars')}</span>
              <ArrowRight size={16} className="rtl-mirror-arrow" />
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
              {t('about.contactSupport')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
