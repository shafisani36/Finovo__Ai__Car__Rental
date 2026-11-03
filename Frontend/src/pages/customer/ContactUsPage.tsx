import { useState } from 'react';
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

import heroImg from '../../assets/contact/hero-car.jpg';
import officeImg from '../../assets/contact/office-car.jpg';
import show1Img from '../../assets/contact/showroom-1.jpg';
import show2Img from '../../assets/contact/showroom-2.jpg';

export function ContactUsPage() {
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
    {
      q: 'How do I modify my booking?',
      a: 'You can modify your booking by signing in to your account and visiting your customer dashboard, or by reaching out to our support team at least 24 hours prior to scheduled pickup.',
    },
    {
      q: 'What documents are required to rent a car?',
      a: 'A valid driver license, national identity card or international passport, and a valid credit or debit card registered under the primary driver name.',
    },
    {
      q: 'Do you offer airport pickup and drop-off?',
      a: 'Yes, we provide 24/7 designated airport valet drop-off and pickup across all major airports in the region.',
    },
    {
      q: 'Can I cancel a reservation for free?',
      a: 'Free cancellation is available on all standard bookings up to 24 hours before your scheduled pickup time with instant refund processing.',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      setErrorMessage('Please fill in all required fields (Name, Email, Subject, Message).');
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
        setSuccessMessage('Thank you! Your inquiry has been sent to our support desk. We will respond within 24 hours.');
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      } else {
        setErrorMessage(res.message || 'Failed to submit inquiry. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || err?.message || 'Failed to deliver inquiry. Please check your connection.'
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
            right: 0,
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
            WE'RE ALWAYS HERE FOR YOU
          </p>
          <h1 style={{ fontSize: '46px', fontWeight: 800, lineHeight: 1.15, marginBottom: '16px' }}>
            Get in touch
          </h1>
          <p style={{ fontSize: '16px', lineHeight: 1.6, opacity: 0.9, marginBottom: '32px' }}>
            We're here to help with your bookings, vehicle selections, and questions — our support team replies fast, every day of the week.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ padding: '10px', borderRadius: '50%', backgroundColor: 'rgba(250, 184, 38, 0.15)', color: '#FAB826' }}>
                <Car size={22} />
              </span>
              <div>
                <p style={{ fontWeight: 700, fontSize: '14px', margin: 0 }}>Real people, real help</p>
                <p style={{ fontSize: '12px', opacity: 0.8, margin: 0 }}>Dedicated mobility advisors</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ padding: '10px', borderRadius: '50%', backgroundColor: 'rgba(250, 184, 38, 0.15)', color: '#FAB826' }}>
                <CalendarClock size={22} />
              </span>
              <div>
                <p style={{ fontWeight: 700, fontSize: '14px', margin: 0 }}>Within 24 hours</p>
                <p style={{ fontSize: '12px', opacity: 0.8, margin: 0 }}>Prompt email & phone reply</p>
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
          padding: '0 24px',
          position: 'relative',
          zIndex: 5,
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {/* Card 1 */}
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
              <Phone size={22} />
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#6B7280', margin: 0 }}>Call Us</p>
              <p style={{ fontSize: '17px', fontWeight: 800, color: '#1E0426', margin: '4px 0 2px' }}>+1 (123) 456-7890</p>
              <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>Mon–Sat, 8am – 10pm</p>
            </div>
          </div>

          {/* Card 2 */}
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
              <Mail size={22} />
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#6B7280', margin: 0 }}>Email Us</p>
              <p style={{ fontSize: '17px', fontWeight: 800, color: '#1E0426', margin: '4px 0 2px' }}>support@finovo.com</p>
              <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>24/7 Support Desk</p>
            </div>
          </div>

          {/* Card 3 */}
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
              <MapPin size={22} />
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#6B7280', margin: 0 }}>Headquarters</p>
              <p style={{ fontSize: '17px', fontWeight: 800, color: '#1E0426', margin: '4px 0 2px' }}>123 Finovo Lane</p>
              <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>Suite 100 · City Center</p>
            </div>
          </div>
        </div>
      </section>

      {/* Form + Head Office Section */}
      <section style={{ maxWidth: '1200px', margin: '0 auto 70px', padding: '0 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '40px' }}>
          {/* Inquiry Form */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              padding: '36px',
              boxShadow: '0 10px 35px rgba(0, 0, 0, 0.05)',
              border: '1px solid #ECEAEF',
            }}
          >
            <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#1E0426', marginBottom: '8px' }}>
              Send us a Message
            </h2>
            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px' }}>
              Fill out this form and our customer inquiries team will respond to your registered email.
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
                <CheckCircle2 size={18} />
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
                <AlertCircle size={18} />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                    Full Name <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: '#9CA3AF' }} />
                    <input
                      type="text"
                      placeholder="e.g. Jordan Ahmed"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '12px 14px 12px 36px',
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
                    Email Address <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: '#9CA3AF' }} />
                    <input
                      type="email"
                      placeholder="e.g. jordan@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '12px 14px 12px 36px',
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                    Phone Number
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: '#9CA3AF' }} />
                    <input
                      type="tel"
                      placeholder="e.g. +1 (123) 456-7890"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 14px 12px 36px',
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
                    Subject <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: '#9CA3AF' }} />
                    <input
                      type="text"
                      placeholder="e.g. Booking Enquiry or Fleet Questions"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '12px 14px 12px 36px',
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
                  Message <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <MessageCircle size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: '#9CA3AF' }} />
                  <textarea
                    rows={4}
                    placeholder="Tell us how we can assist you with your rental or reservation..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 36px',
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
                    <span>Submitting Message...</span>
                  </>
                ) : (
                  <>
                    <span>Send Message</span>
                    <ArrowRight size={16} />
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
              minHeight: '480px',
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
                left: '24px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '14px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
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
                }}
              >
                <MapPin size={20} />
              </div>
              <div>
                <p style={{ fontWeight: 800, fontSize: '14px', margin: 0, color: '#1E0426' }}>Finovo Head Office</p>
                <p style={{ fontSize: '12px', color: '#6B7280', margin: '2px 0 0' }}>123 Finovo Lane, Suite 100</p>
              </div>
            </div>

            <div style={{ position: 'absolute', bottom: '28px', left: '28px', right: '28px', color: '#FFFFFF' }}>
              <p style={{ fontSize: '26px', fontWeight: 800, lineHeight: 1.25, margin: 0 }}>
                Premium service starts here
              </p>
              <p style={{ fontSize: '14px', opacity: 0.85, marginTop: '8px', lineHeight: 1.5 }}>
                Visit our central operations showroom or any of our city branches for instant vehicle handovers and bespoke rental consultations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Showroom Locations Section */}
      <section style={{ backgroundColor: '#ECE5DB', padding: '70px 6%' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px', marginBottom: '36px' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: '#1E0426', opacity: 0.8, textTransform: 'uppercase' }}>
                OUR LOCATIONS
              </p>
              <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#1E0426', margin: '6px 0 0' }}>
                Find Us Across the City
              </h2>
              <p style={{ fontSize: '15px', color: '#4B5563', margin: '6px 0 0' }}>
                Experience Finovo in person at our dedicated customer hubs and airport pickup zones.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {/* Showroom 1 */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 8px 25px rgba(0,0,0,0.06)' }}>
              <img src={show1Img} alt="Downtown Showroom" style={{ width: '100%', height: '220px', objectFit: 'cover' }} />
              <div style={{ padding: '22px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#FAB826', backgroundColor: '#1E0426', padding: '4px 10px', borderRadius: '20px' }}>
                  CENTRAL HUB
                </span>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#1E0426', margin: '12px 0 6px' }}>
                  Downtown Luxury Showroom
                </h3>
                <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 16px' }}>
                  Financial Center Boulevard, Tower 4 · Open 24/7
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <a
                    href="tel:+11234567890"
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
                    Direct Line
                  </a>
                </div>
              </div>
            </div>

            {/* Showroom 2 */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 8px 25px rgba(0,0,0,0.06)' }}>
              <img src={show2Img} alt="Airport Terminal Showroom" style={{ width: '100%', height: '220px', objectFit: 'cover' }} />
              <div style={{ padding: '22px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#FAB826', backgroundColor: '#1E0426', padding: '4px 10px', borderRadius: '20px' }}>
                  AIRPORT TERMINAL
                </span>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#1E0426', margin: '12px 0 6px' }}>
                  Airport Express Valet Hub
                </h3>
                <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 16px' }}>
                  Terminal 3 Arrival Concourse · Fast Track Key Pickup
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <a
                    href="tel:+11234567890"
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
                    Direct Line
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section style={{ maxWidth: '960px', margin: '70px auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: '#FAB826', textTransform: 'uppercase' }}>
            FREQUENT QUESTIONS
          </p>
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#1E0426', margin: '6px 0 0' }}>
            Frequently Asked Questions
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={faq.q}
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
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#1E0426' }}>{faq.q}</span>
                  {isOpen ? <ChevronUp size={20} color="#1E0426" /> : <ChevronDown size={20} color="#9CA3AF" />}
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
    </div>
  );
}
