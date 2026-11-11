import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

  const steps = [
    {
      num: '01',
      title: t('aiInspection.step1Title'),
      desc: t('aiInspection.step1Desc'),
      icon: Camera,
    },
    {
      num: '02',
      title: t('aiInspection.step2Title'),
      desc: t('aiInspection.step2Desc'),
      icon: Cpu,
    },
    {
      num: '03',
      title: t('aiInspection.step3Title'),
      desc: t('aiInspection.step3Desc'),
      icon: Lock,
    },
    {
      num: '04',
      title: t('aiInspection.step4Title'),
      desc: t('aiInspection.step4Desc'),
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
        <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '48px', alignItems: 'center' }}>
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
              <span>{t('aiInspection.badge')}</span>
            </div>

            <h1 style={{ fontSize: 'clamp(1.9rem, 4.5vw, 2.85rem)', fontWeight: 800, lineHeight: 1.15, margin: '0 0 16px' }}>
              {t('aiInspection.heroTitle')}
            </h1>
            <p style={{ fontSize: '16px', lineHeight: 1.6, opacity: 0.9, margin: '0 0 32px' }}>
              {t('aiInspection.heroDesc')}
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
                <span>{t('aiInspection.ctaButton')}</span>
                <ArrowRight size={16} className="rtl-mirror-arrow" />
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
            <img src={carMain} alt="AI Inspection Visual Scan" style={{ width: '100%', height: 'clamp(240px, 42vw, 380px)', objectFit: 'cover', opacity: 0.85 }} />

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
                top: '36%',
                insetInlineStart: '12%',
                width: '100px',
                height: '72px',
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
                {t('aiInspection.hudHood')}
              </span>
              <span style={{ fontSize: '8px', color: '#FAB826', fontWeight: 700 }}>{t('aiInspection.hudConfidence')}</span>
            </div>

            {/* Detection Box 2 */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                insetInlineEnd: '14%',
                width: '115px',
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
                {t('aiInspection.hudBumper')}
              </span>
              <span style={{ fontSize: '8px', color: '#10B981', fontWeight: 700 }}>{t('aiInspection.hudNoDefects')}</span>
            </div>

            {/* Bottom HUD */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '14px 18px',
                backgroundColor: 'rgba(30, 4, 38, 0.85)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: '#FFFFFF',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={16} color="#10B981" />
                <span style={{ fontSize: '12px', fontWeight: 700 }}>{t('aiInspection.hudActive')}</span>
              </div>
              <span style={{ fontSize: '11px', color: '#FAB826', fontWeight: 800 }}>{t('aiInspection.hudScore')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works 4 Steps */}
      <section style={{ maxWidth: '1240px', margin: '70px auto', padding: '0 clamp(16px, 4vw, 24px)' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: '#FAB826', textTransform: 'uppercase' }}>
            {t('aiInspection.lifecycleEyebrow')}
          </p>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3.8vw, 2.25rem)', fontWeight: 800, color: '#1E0426', margin: '4px 0 0' }}>
            {t('aiInspection.lifecycleTitle')}
          </h2>
          <p style={{ fontSize: '15px', color: '#6B7280', margin: '8px 0 0' }}>
            {t('aiInspection.lifecycleSubtitle')}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '24px' }}>
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
      <section style={{ maxWidth: '1240px', margin: '0 auto 80px', padding: '0 clamp(16px, 4vw, 24px)' }}>
        <div
          style={{
            backgroundColor: '#1E0426',
            color: '#FFFFFF',
            borderRadius: '24px',
            padding: 'clamp(24px, 5vw, 48px)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            gap: '32px',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ fontSize: 'clamp(1.4rem, 3.2vw, 1.875rem)', fontWeight: 800, margin: '0 0 12px' }}>
              {t('aiInspection.trustTitle')}
            </h3>
            <p style={{ fontSize: '15px', opacity: 0.85, margin: 0, lineHeight: 1.6 }}>
              {t('aiInspection.trustDesc')}
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
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
              <span>{t('aiInspection.findInspectedBtn')}</span>
              <ArrowRight size={16} className="rtl-mirror-arrow" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
