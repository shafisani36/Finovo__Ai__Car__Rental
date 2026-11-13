import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Phone,
  Mail,
  MapPin,
  User,
  Calendar,
  MessageCircle,
  ArrowRight,
  Car,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { inquiryApi } from '../../api/services/inquiry.api';
import { telHref, useSiteInfo } from '../../hooks/usePublicSite';

import heroImg from '../../assets/contact/hero-car.webp';
import officeImg from '../../assets/contact/office-car.jpg';
import show1Img from '../../assets/contact/showroom-1.jpg';
import show2Img from '../../assets/contact/showroom-2.webp';

const contactLinkStyle: React.CSSProperties = { color: 'inherit', textDecoration: 'none', overflowWrap: 'anywhere' };

function ContactCard({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: React.ReactNode; note?: string | null }) {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.06)',
        border: '1px solid #ECEAEF',
        display: 'flex',
        gap: '18px',
        alignItems: 'center',
        minWidth: 0,
      }}
    >
      <div
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          backgroundColor: '#1E0426',
          color: '#FAB826',
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: '#6B7280', margin: 0 }}>{label}</p>
        <p style={{ fontSize: '17px', fontWeight: 800, color: '#1E0426', margin: '4px 0 2px', overflowWrap: 'anywhere' }}>{value}</p>
        {note && <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>{note}</p>}
      </div>
    </div>
  );
}

export function ContactUsPage() {
  const { t } = useTranslation();
  const site = useSiteInfo();
  const branches = site?.branches ?? [];

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    { q: t('contact.q1'), a: t('contact.a1') },
    { q: t('contact.q2'), a: t('contact.a2') },
    { q: t('contact.q3'), a: t('contact.a3') },
    { q: t('contact.q4'), a: t('contact.a4') },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      setErrorMessage(t('contact.errorRequired'));
      return;
    }

    try {
      setSubmitting(true);
      const res = await inquiryApi.submitInquiry({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        subject: formData.subject,
        message: formData.message,
      });

      if (res.success) {
        setSuccessMessage(t('contact.successSent'));
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      } else {
        setErrorMessage(res.message || t('contact.errorSubmit'));
      }
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || err?.message || t('contact.errorNetwork')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#F9F8FA', minHeight: '100vh', color: '#1E0426', fontFamily: 'var(--font-family-sans, "Manrope", sans-serif)' }}>
      {/* Hero Section */}
      <section
        style={{
          position: 'relative',
          backgroundColor: '#1E0426',
          color: '#FFFFFF',
          padding: '60px 6% 70px',
          overflow: 'hidden',
        }}
      >
        <img
          src={heroImg}
          alt="Finovo customer showroom car"
          style={{
            position: 'absolute',
            top: 0,
            insetInlineEnd: 0,
            width: '55%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.85,
            clipPath: 'polygon(20% 0, 100% 0, 100% 100%, 0% 100%)',
          }}
          className="contact-hero-img"
        />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: '580px' }}>
          <p
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '2px',
              color: '#FAB826',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            {t('contact.eyebrow')}
          </p>
          <h1 style={{ fontSize: 'clamp(1.9rem, 5vw, 2.85rem)', fontWeight: 800, lineHeight: 1.15, marginBottom: '16px' }}>
            {t('contact.heroTitle')}
          </h1>
          <p style={{ fontSize: '16px', lineHeight: 1.6, opacity: 0.9, marginBottom: '32px' }}>
            {t('contact.heroDesc')}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ padding: '10px', borderRadius: '50%', backgroundColor: 'rgba(250, 184, 38, 0.15)', color: '#FAB826', flexShrink: 0 }}>
                <Car size={22} />
              </span>
              <div>
                <p style={{ fontWeight: 700, fontSize: '14px', margin: 0 }}>{t('contact.badge1Title')}</p>
                <p style={{ fontSize: '12px', opacity: 0.8, margin: 0 }}>{t('contact.badge1Sub')}</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ padding: '10px', borderRadius: '50%', backgroundColor: 'rgba(250, 184, 38, 0.15)', color: '#FAB826', flexShrink: 0 }}>
                <CalendarClock size={22} />
              </span>
              <div>
                <p style={{ fontWeight: 700, fontSize: '14px', margin: 0 }}>{t('contact.badge2Title')}</p>
                <p style={{ fontSize: '12px', opacity: 0.8, margin: 0 }}>{t('contact.badge2Sub')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Cards Row */}
      <section
        style={{
          maxWidth: '1200px',
          margin: '-35px auto 40px',
          padding: '0 clamp(16px, 4vw, 24px)',
          position: 'relative',
          zIndex: 5,
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '20px' }}>
          {site?.supportPhone && (
            <ContactCard
              icon={<Phone size={22} />}
              label={t('contact.callUs')}
              value={<a className="phone-number" href={telHref(site.supportPhone)} style={contactLinkStyle}>{site.supportPhone}</a>}
              note={site.openingHours}
            />
          )}
          {site?.supportEmail && (
            <ContactCard
              icon={<Mail size={22} />}
              label={t('contact.emailUs')}
              value={<a href={`mailto:${site.supportEmail}`} style={contactLinkStyle}>{site.supportEmail}</a>}
              note={t('contact.emailSub')}
            />
          )}
          {site?.address && (
            <ContactCard icon={<MapPin size={22} />} label={t('contact.hqLabel')} value={site.address} />
          )}
        </div>
      </section>

      {/* Form + Head Office Section */}
      <section style={{ maxWidth: '1200px', margin: '0 auto 70px', padding: '0 clamp(16px, 4vw, 24px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '40px' }}>
          {/* Inquiry Form */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              padding: 'clamp(22px, 4vw, 36px)',
              boxShadow: '0 10px 35px rgba(0, 0, 0, 0.05)',
              border: '1px solid #ECEAEF',
            }}
          >
            <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 1.75rem)', fontWeight: 800, color: '#1E0426', marginBottom: '8px' }}>
              {t('contact.formTitle')}
            </h2>
            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px' }}>
              {t('contact.formSubtitle')}
            </p>

            {successMessage && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  backgroundColor: '#ECFDF5',
                  color: '#065F46',
                  border: '1px solid #A7F3D0',
                  marginBottom: '20px',
                  fontSize: '14px',
                }}
              >
                <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  backgroundColor: '#FEF2F2',
                  color: '#991B1B',
                  border: '1px solid #FECACA',
                  marginBottom: '20px',
                  fontSize: '14px',
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                    {t('contact.nameLabel')} <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', insetInlineStart: '12px', top: '14px', color: '#9CA3AF' }} />
                    <input
                      type="text"
                      placeholder={t('contact.namePlaceholder')}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        paddingBlock: '12px',
                        paddingInlineStart: '36px',
                        paddingInlineEnd: '14px',
                        borderRadius: '10px',
                        border: '1px solid #D1D5DB',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                    {t('contact.emailLabel')} <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', insetInlineStart: '12px', top: '14px', color: '#9CA3AF' }} />
                    <input
                      type="email"
                      placeholder={t('contact.emailPlaceholder')}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        paddingBlock: '12px',
                        paddingInlineStart: '36px',
                        paddingInlineEnd: '14px',
                        borderRadius: '10px',
                        border: '1px solid #D1D5DB',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                    {t('contact.phoneLabel')}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={16} style={{ position: 'absolute', insetInlineStart: '12px', top: '14px', color: '#9CA3AF' }} />
                    <input
                      type="tel"
                      placeholder={t('contact.phonePlaceholder')}
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      style={{
                        width: '100%',
                        paddingBlock: '12px',
                        paddingInlineStart: '36px',
                        paddingInlineEnd: '14px',
                        borderRadius: '10px',
                        border: '1px solid #D1D5DB',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                    {t('contact.subjectLabel')} <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Calendar size={16} style={{ position: 'absolute', insetInlineStart: '12px', top: '14px', color: '#9CA3AF' }} />
                    <input
                      type="text"
                      placeholder={t('contact.subjectPlaceholder')}
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        paddingBlock: '12px',
                        paddingInlineStart: '36px',
                        paddingInlineEnd: '14px',
                        borderRadius: '10px',
                        border: '1px solid #D1D5DB',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                  {t('contact.messageLabel')} <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <MessageCircle size={16} style={{ position: 'absolute', insetInlineStart: '12px', top: '14px', color: '#9CA3AF' }} />
                  <textarea
                    rows={4}
                    placeholder={t('contact.messagePlaceholder')}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      paddingBlock: '12px',
                      paddingInlineStart: '36px',
                      paddingInlineEnd: '14px',
                      borderRadius: '10px',
                      border: '1px solid #D1D5DB',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: '#FAB826',
                  color: '#1E0426',
                  fontWeight: 800,
                  fontSize: '15px',
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 15px rgba(250, 184, 38, 0.35)',
                  transition: 'opacity 0.2s',
                  opacity: submitting ? 0.7 : 1,
                  marginTop: '6px',
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>{t('contact.submitting')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('contact.sendMessage')}</span>
                    <ArrowRight size={16} className="rtl-mirror-arrow" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Head Office Showcase */}
          <div
            style={{
              position: 'relative',
              borderRadius: '24px',
              overflow: 'hidden',
              minHeight: '420px',
              boxShadow: '0 10px 35px rgba(0, 0, 0, 0.08)',
            }}
          >
            <img
              src={officeImg}
              alt="Finovo Corporate Headquarters & Showroom"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(30, 4, 38, 0.92) 20%, rgba(30, 4, 38, 0.2) 60%)',
              }}
            />

            <div
              style={{
                position: 'absolute',
                top: '24px',
                insetInlineStart: '24px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '14px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                maxWidth: 'calc(100% - 48px)',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: '#1E0426',
                  color: '#FAB826',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <MapPin size={20} />
              </div>
              <div>
                <p style={{ fontWeight: 800, fontSize: '14px', margin: 0, color: '#1E0426' }}>{t('contact.officeBadgeTitle')}</p>
                <p style={{ fontSize: '12px', color: '#6B7280', margin: '2px 0 0' }}>{t('contact.officeBadgeSub')}</p>
              </div>
            </div>

            <div style={{ position: 'absolute', bottom: '28px', insetInlineStart: '28px', insetInlineEnd: '28px', color: '#FFFFFF' }}>
              <p style={{ fontSize: 'clamp(1.25rem, 3vw, 1.625rem)', fontWeight: 800, lineHeight: 1.25, margin: 0 }}>
                {t('contact.officeHeadline')}
              </p>
              <p style={{ fontSize: '14px', opacity: 0.85, marginTop: '8px', lineHeight: 1.5 }}>
                {t('contact.officeDesc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Showroom Locations Section (real branches only) */}
      {branches.length > 0 && (
      <section style={{ backgroundColor: '#ECE5DB', padding: '70px 6%' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px', marginBottom: '36px' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: '#1E0426', opacity: 0.8, textTransform: 'uppercase' }}>
                {t('contact.locationsEyebrow')}
              </p>
              <h2 style={{ fontSize: 'clamp(1.6rem, 3.8vw, 2.25rem)', fontWeight: 800, color: '#1E0426', margin: '6px 0 0' }}>
                {t('contact.locationsTitle')}
              </h2>
              <p style={{ fontSize: '15px', color: '#4B5563', margin: '6px 0 0' }}>
                {t('contact.locationsDesc')}
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '24px' }}>
            {branches.map((branch, index) => (
              <div
                key={branch.id}
                style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 8px 25px rgba(0,0,0,0.06)' }}
              >
                <img
                  src={index % 2 === 0 ? show1Img : show2Img}
                  alt={branch.name}
                  loading="lazy"
                  style={{ width: '100%', height: '220px', objectFit: 'cover' }}
                />
                <div style={{ padding: '22px' }}>
                  {index === 0 && (
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#FAB826', backgroundColor: '#1E0426', padding: '4px 10px', borderRadius: '20px' }}>
                      {t('contact.hub1Tag')}
                    </span>
                  )}
                  <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#1E0426', margin: '12px 0 6px', overflowWrap: 'anywhere' }}>
                    {branch.name}
                  </h3>
                  {branch.address && (
                    <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 6px' }}>{branch.address}</p>
                  )}
                  {branch.openingHours && (
                    <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '0 0 16px' }}>{branch.openingHours}</p>
                  )}
                  {branch.phone && (
                    <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                      <a
                        href={telHref(branch.phone)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          backgroundColor: '#F3F4F6',
                          color: '#1E0426',
                          fontWeight: 700,
                          fontSize: '12px',
                          textDecoration: 'none',
                        }}
                      >
                        {t('contact.directLine')}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* Frequently Asked Questions */}
      <section style={{ maxWidth: '960px', margin: '70px auto', padding: '0 clamp(16px, 4vw, 24px)' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: '#FAB826', textTransform: 'uppercase' }}>
            {t('contact.faqEyebrow')}
          </p>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3.4vw, 2rem)', fontWeight: 800, color: '#1E0426', margin: '6px 0 0' }}>
            {t('contact.faqTitle')}
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #E5E7EB',
                  overflow: 'hidden',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  style={{
                    width: '100%',
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'none',
                    border: 'none',
                    textAlign: 'start',
                    cursor: 'pointer',
                    gap: '12px',
                  }}
                >
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#1E0426' }}>{faq.q}</span>
                  {isOpen ? <ChevronUp size={20} color="#1E0426" style={{ flexShrink: 0 }} /> : <ChevronDown size={20} color="#9CA3AF" style={{ flexShrink: 0 }} />}
                </button>
                {isOpen && (
                  <div style={{ padding: '0 24px 20px', color: '#4B5563', fontSize: '14px', lineHeight: 1.6 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <style>{`
        [dir='rtl'] .contact-hero-img {
          clip-path: polygon(0 0, 80% 0, 100% 100%, 0 100%) !important;
        }
        @media (max-width: 900px) {
          .contact-hero-img {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
