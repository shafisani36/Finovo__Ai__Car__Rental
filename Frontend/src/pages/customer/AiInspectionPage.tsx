import { Link } from 'react-router-dom';
import {
  Camera,
  Cpu,
  ArrowRight,
  Sparkles,
  Zap,
  Lock,
  Activity,
} from 'lucide-react';
import carMain from '../../assets/car-detail/car-main.jpg';

export function AiInspectionPage() {
  const steps = [
    {
      num: '01',
      title: 'Guided 360° Photo Capture',
      desc: 'At vehicle handover, take 6 rapid guided photos around the perimeter using our progressive web app.',
      icon: Camera,
    },
    {
      num: '02',
      title: 'Deep Neural Visual Analysis',
      desc: 'Our proprietary computer vision models segment vehicle body panels, isolating scratches, paint scuffs, and panel gaps down to millimeter precision.',
      icon: Cpu,
    },
    {
      num: '03',
      title: 'Immutable Baseline Certificate',
      desc: 'A cryptographic condition report is saved to your account. Both customer and fleet manager receive identical timestamps.',
      icon: Lock,
    },
    {
      num: '04',
      title: 'Zero-Dispute Return & Refund',
      desc: 'Upon drop-off, a second 30-second scan verifies condition against the baseline. Your security deposit is unblocked instantly.',
      icon: Zap,
    },
  ];

  return (
    <div style={{ backgroundColor: '#F9F8FA', minHeight: '100vh', color: '#1E0426', fontFamily: 'var(--font-family-sans, "Manrope", sans-serif)' }}>
      {/* Hero Section */}
      <section
        style={{
          backgroundColor: '#1E0426',
          color: '#FFFFFF',
          padding: '60px 6% 70px',
        }}
      >
        <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '48px', alignItems: 'center' }}>
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '20px',
                backgroundColor: 'rgba(250, 184, 38, 0.15)',
                color: '#FAB826',
                fontSize: '12px',
                fontWeight: 800,
                marginBottom: '16px',
                border: '1px solid rgba(250, 184, 38, 0.3)',
              }}
            >
              <Sparkles size={14} />
              <span>FINOVO COMPUTER VISION 3.0</span>
            </div>

            <h1 style={{ fontSize: '46px', fontWeight: 800, lineHeight: 1.15, margin: '0 0 16px' }}>
              Say Goodbye to Rental Deposit Disputes.
            </h1>
            <p style={{ fontSize: '16px', lineHeight: 1.6, opacity: 0.9, margin: '0 0 32px' }}>
              Finovo replaces subjective human walk-arounds with automated AI computer-vision damage scanning.
              Your car condition is scientifically verified before you drive away and at return.
            </p>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
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
                  fontWeight: 800,
                  fontSize: '15px',
                  textDecoration: 'none',
                  boxShadow: '0 4px 15px rgba(250, 184, 38, 0.4)',
                }}
              >
                Book AI-Verified Car <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* Interactive Inspection Scanner Mockup */}
          <div
            style={{
              position: 'relative',
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
              border: '2px solid rgba(250, 184, 38, 0.4)',
              backgroundColor: '#0A010D',
            }}
          >
            <img src={carMain} alt="AI Inspection Visual Scan" style={{ width: '100%', height: '380px', objectFit: 'cover', opacity: 0.85 }} />

            {/* Scanning line animation */}
            <div
              style={{
                position: 'absolute',
                top: '30%',
                left: 0,
                right: 0,
                height: '2px',
                backgroundColor: '#FAB826',
                boxShadow: '0 0 15px 4px #FAB826',
              }}
            />

            {/* Detection Box 1 */}
            <div
              style={{
                position: 'absolute',
                top: '42%',
                left: '25%',
                width: '90px',
                height: '70px',
                border: '2px dashed #FAB826',
                borderRadius: '8px',
                backgroundColor: 'rgba(250, 184, 38, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '4px',
              }}
            >
              <span style={{ fontSize: '9px', fontWeight: 800, backgroundColor: '#FAB826', color: '#1E0426', padding: '1px 4px', borderRadius: '4px', alignSelf: 'flex-start' }}>
                HOOD: OK
              </span>
              <span style={{ fontSize: '8px', color: '#FAB826', fontWeight: 700 }}>CONFIDENCE 99.8%</span>
            </div>

            {/* Detection Box 2 */}
            <div
              style={{
                position: 'absolute',
                top: '55%',
                right: '28%',
                width: '110px',
                height: '65px',
                border: '2px solid #10B981',
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '4px',
              }}
            >
              <span style={{ fontSize: '9px', fontWeight: 800, backgroundColor: '#10B981', color: '#FFFFFF', padding: '1px 4px', borderRadius: '4px', alignSelf: 'flex-start' }}>
                BUMPER: VERIFIED
              </span>
              <span style={{ fontSize: '8px', color: '#10B981', fontWeight: 700 }}>NO DEFECTS FOUND</span>
            </div>

            {/* Bottom HUD */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '16px 20px',
                backgroundColor: 'rgba(30, 4, 38, 0.85)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: '#FFFFFF',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={16} color="#10B981" />
                <span style={{ fontSize: '12px', fontWeight: 700 }}>Vision Engine Active · 6 Angles Verified</span>
              </div>
              <span style={{ fontSize: '11px', color: '#FAB826', fontWeight: 800 }}>DEFECT SCORE: 0.0</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works 4 Steps */}
      <section style={{ maxWidth: '1240px', margin: '70px auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: '#FAB826', textTransform: 'uppercase' }}>
            TRANSPARENT INSPECTION LIFECYCLE
          </p>
          <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#1E0426', margin: '4px 0 0' }}>
            How AI Vehicle Inspection Works
          </h2>
          <p style={{ fontSize: '15px', color: '#6B7280', margin: '8px 0 0' }}>
            From departure to return, the entire inspection workflow takes under 60 seconds.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.num}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '20px',
                  padding: '32px 28px',
                  border: '1px solid #ECEAEF',
                  boxShadow: '0 8px 25px rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#1E0426', color: '#FAB826', display: 'grid', placeItems: 'center' }}>
                      <Icon size={22} />
                    </div>
                    <span style={{ fontSize: '28px', fontWeight: 800, color: '#E5E7EB' }}>{s.num}</span>
                  </div>
                  <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#1E0426', margin: '0 0 10px' }}>{s.title}</h3>
                  <p style={{ fontSize: '14px', color: '#6B7280', margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Customer Trust Callout */}
      <section style={{ maxWidth: '1240px', margin: '0 auto 80px', padding: '0 24px' }}>
        <div
          style={{
            backgroundColor: '#1E0426',
            color: '#FFFFFF',
            borderRadius: '24px',
            padding: '48px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '32px',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ fontSize: '30px', fontWeight: 800, margin: '0 0 12px' }}>
              Never Argue Over a Rental Car Scratch Again.
            </h3>
            <p style={{ fontSize: '15px', opacity: 0.85, margin: 0, lineHeight: 1.6 }}>
              Every vehicle rented with Finovo is safeguarded with objective, mathematically provable condition records.
              Zero surprises, zero unverified charges.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Link
              to="/cars"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 32px',
                backgroundColor: '#FAB826',
                color: '#1E0426',
                borderRadius: '30px',
                fontWeight: 800,
                fontSize: '15px',
                textDecoration: 'none',
                boxShadow: '0 4px 15px rgba(250, 184, 38, 0.4)',
              }}
            >
              Find an Inspected Car <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
