import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowRight,
  FileCheck,
  PhoneCall,
} from 'lucide-react';

export function InsurancePage() {
  const plans = [
    {
      name: 'Basic Coverage',
      price: 'Included Free',
      tag: 'STANDARD',
      desc: 'Essential legal coverage for domestic and city driving.',
      highlight: false,
      features: [
        { text: 'Third-Party Property Damage Liability', included: true },
        { text: 'Third-Party Bodily Injury Coverage', included: true },
        { text: '24/7 Standard Breakdown Assistance', included: true },
        { text: 'Collision Damage Waiver (CDW)', included: false },
        { text: 'Theft & Total Loss Protection', included: false },
        { text: 'Zero Deductible Waiver', included: false },
        { text: 'Windshield & Tire Hazard Waiver', included: false },
      ],
      deductible: 'SAR 3,000 Excess',
    },
    {
      name: 'Standard Shield',
      price: 'SAR 50 / day',
      tag: 'MOST POPULAR',
      desc: 'Balanced comprehensive protection against accidental damages.',
      highlight: true,
      features: [
        { text: 'Third-Party Property Damage Liability', included: true },
        { text: 'Third-Party Bodily Injury Coverage', included: true },
        { text: '24/7 Priority Roadside Assistance', included: true },
        { text: 'Collision Damage Waiver (CDW)', included: true },
        { text: 'Theft & Total Loss Protection', included: true },
        { text: 'Zero Deductible Waiver', included: false },
        { text: 'Windshield & Tire Hazard Waiver', included: false },
      ],
      deductible: 'SAR 500 Reduced Excess',
    },
    {
      name: 'Premium Zero Shield',
      price: 'SAR 100 / day',
      tag: 'TOTAL PEACE OF MIND',
      desc: 'Full zero-liability security covering all minor and major events.',
      highlight: false,
      features: [
        { text: 'Third-Party Property Damage Liability', included: true },
        { text: 'Third-Party Bodily Injury Coverage', included: true },
        { text: '24/7 VIP Dedicated Roadside Recovery', included: true },
        { text: 'Collision Damage Waiver (CDW)', included: true },
        { text: 'Theft & Total Loss Protection', included: true },
        { text: 'Zero Deductible (SAR 0 Excess)', included: true },
        { text: 'Windshield, Glass & Tire Hazard Waiver', included: true },
      ],
      deductible: 'SAR 0 Zero Deductible',
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
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <p
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '2px',
              color: '#FAB826',
              textTransform: 'uppercase',
              marginBottom: '10px',
            }}
          >
            COMPREHENSIVE MOBILITY PROTECTION
          </p>
          <h1 style={{ fontSize: '44px', fontWeight: 800, lineHeight: 1.15, marginBottom: '16px' }}>
            Drive With Total Peace of Mind
          </h1>
          <p style={{ fontSize: '16px', lineHeight: 1.6, opacity: 0.9, marginBottom: '32px' }}>
            Every Finovo vehicle is backed by licensed insurance underwriters. Pick the tier that matches your itinerary and travel with zero worries.
          </p>
          <Link
            to="/cars"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 26px',
              backgroundColor: '#FAB826',
              color: '#1E0426',
              borderRadius: '30px',
              fontWeight: 800,
              fontSize: '14px',
              textDecoration: 'none',
              boxShadow: '0 4px 15px rgba(250, 184, 38, 0.4)',
            }}
          >
            Explore Protected Cars <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Insurance Tiers Comparison */}
      <section style={{ maxWidth: '1240px', margin: '-30px auto 60px', padding: '0 24px', position: 'relative', zIndex: 5 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {plans.map((p) => (
            <div
              key={p.name}
              style={{
                backgroundColor: p.highlight ? '#1E0426' : '#FFFFFF',
                color: p.highlight ? '#FFFFFF' : '#1E0426',
                borderRadius: '24px',
                padding: '36px',
                border: p.highlight ? '2px solid #FAB826' : '1px solid #ECEAEF',
                boxShadow: p.highlight ? '0 15px 40px rgba(30, 4, 38, 0.25)' : '0 8px 30px rgba(0, 0, 0, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '1px',
                    backgroundColor: p.highlight ? '#FAB826' : '#F3F4F6',
                    color: p.highlight ? '#1E0426' : '#6B7280',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    display: 'inline-block',
                    marginBottom: '16px',
                  }}
                >
                  {p.tag}
                </span>
                <h3 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 6px' }}>{p.name}</h3>
                <p style={{ fontSize: '13px', opacity: 0.8, margin: '0 0 20px', lineHeight: 1.5 }}>{p.desc}</p>

                <div style={{ paddingBottom: '20px', borderBottom: p.highlight ? '1px solid rgba(255,255,255,0.15)' : '1px solid #F3F4F6', marginBottom: '24px' }}>
                  <span style={{ fontSize: '32px', fontWeight: 800, color: p.highlight ? '#FAB826' : '#1E0426' }}>
                    {p.price}
                  </span>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: p.highlight ? '#FAB826' : '#059669', margin: '6px 0 0' }}>
                    {p.deductible}
                  </p>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {p.features.map((f) => (
                    <li key={f.text} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px' }}>
                      {f.included ? (
                        <CheckCircle2 size={18} color="#10B981" style={{ flexShrink: 0 }} />
                      ) : (
                        <XCircle size={18} color={p.highlight ? 'rgba(255,255,255,0.3)' : '#D1D5DB'} style={{ flexShrink: 0 }} />
                      )}
                      <span style={{ opacity: f.included ? 1 : 0.45 }}>{f.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                to="/cars"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: p.highlight ? '#FAB826' : '#1E0426',
                  color: '#1E0426',
                  fontWeight: 800,
                  fontSize: '14px',
                  padding: '14px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  boxShadow: p.highlight ? '0 4px 15px rgba(250, 184, 38, 0.4)' : 'none',
                }}
              >
                <span style={{ color: p.highlight ? '#1E0426' : '#FAB826' }}>Choose With Vehicle</span>
                <ArrowRight size={16} color={p.highlight ? '#1E0426' : '#FAB826'} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Claims Process Section */}
      <section style={{ maxWidth: '1240px', margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '40px', border: '1px solid #ECEAEF', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.05)' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#1E0426', textAlign: 'center', marginBottom: '8px' }}>
            Fast 3-Step Incident Resolution
          </h2>
          <p style={{ fontSize: '15px', color: '#6B7280', textAlign: 'center', marginBottom: '40px' }}>
            In the rare event of damage or a minor parking scratch, resolution is seamless and fair.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '30px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#1E0426', color: '#FAB826', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
                <PhoneCall size={26} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1E0426', margin: '0 0 8px' }}>1. Notify Support</h3>
              <p style={{ fontSize: '14px', color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
                Tap emergency call in your app or call our 24/7 hotline. We immediately arrange towing or vehicle exchange.
              </p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#1E0426', color: '#FAB826', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
                <ShieldCheck size={26} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1E0426', margin: '0 0 8px' }}>2. AI Computer Scan</h3>
              <p style={{ fontSize: '14px', color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
                Our AI inspection model objectively records the damage and compares against your check-out baseline.
              </p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#1E0426', color: '#FAB826', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
                <FileCheck size={26} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1E0426', margin: '0 0 8px' }}>3. Instant Settlement</h3>
              <p style={{ fontSize: '14px', color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
                Your selected coverage takes care of repair costs. With Premium Shield, your deductible liability is SAR 0.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
