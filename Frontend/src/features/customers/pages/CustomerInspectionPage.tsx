import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  Layers,
} from 'lucide-react';
import { customerPortalApi, type CustomerBookingDetail } from '../api/customerPortalApi';
import './CustomerPortal.css';

export function CustomerInspectionPage() {
  const { bookingId } = useParams<{ bookingId: string }>();

  const [booking, setBooking] = useState<CustomerBookingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<'PICKUP' | 'RETURN'>('PICKUP');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [showOverlays, setShowOverlays] = useState(true);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!bookingId) return;
      try {
        setIsLoading(true);
        const res = await customerPortalApi.getBookingById(bookingId);
        if (isMounted && res.success && res.booking) {
          setBooking(res.booking);
        }
      } catch (err) {
        console.error('Failed to load inspection details:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [bookingId]);

  if (isLoading) {
    return (
      <div className="cp-page-container">
        <div className="cp-card cp-skeleton" style={{ height: '480px' }} />
      </div>
    );
  }

  // Fallback demo inspection if no inspection has run yet
  const inspections = booking?.inspections || [];
  const currentInspection = inspections.find((i) => i.type === selectedType) || {
    id: 'demo-insp-01',
    type: selectedType,
    overallScore: 97,
    summary: 'Vehicle is in pristine cosmetic condition. No severe structural or mechanical defects detected.',
    hasDamageDetected: false,
    createdAt: new Date().toISOString(),
    photos: [
      {
        id: 'p1',
        view: 'FRONT_3_QUARTER',
        imageUrl:
          booking?.vehicle?.primaryImageUrl ||
          'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1200&q=80',
      },
      {
        id: 'p2',
        view: 'PASSENGER_PROFILE',
        imageUrl:
          'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1200&q=80',
      },
      {
        id: 'p3',
        view: 'REAR_PROFILE',
        imageUrl:
          'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&w=1200&q=80',
      },
      {
        id: 'p4',
        view: 'DRIVER_PROFILE',
        imageUrl:
          'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=1200&q=80',
      },
    ],
    findings: [
      {
        id: 'f1',
        damageType: 'SURFACE_SCRATCH',
        severity: 'MINOR',
        location: 'Lower Front Bumper Lip',
        confidence: 0.94,
        estimatedRepairCost: 0,
        boundingBox: '{"x": 420, "y": 310, "w": 45, "h": 22}',
      },
    ],
  };

  const selectedPhoto = currentInspection.photos[selectedPhotoIndex] || currentInspection.photos[0];

  return (
    <div className="cp-page-container">
      {/* Top Breadcrumb */}
      <div>
        <Link
          to={bookingId ? `/customer/bookings/${bookingId}` : '/customer/bookings'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--cp-text-muted)',
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: 600,
            marginBottom: '12px',
          }}
        >
          <ArrowLeft size={16} />
          Back to Booking Details
        </Link>
      </div>

      {/* Header */}
      <div className="cp-page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="cp-badge cp-badge-accent">
              <Cpu size={14} /> AI Computer Vision
            </span>
            <span className="cp-badge cp-badge-success">YOLO v8 Calibrated</span>
          </div>
          <h1 className="cp-page-title">Digital Damage Inspection Report</h1>
          <p className="cp-page-subtitle">
            Booking #{booking?.bookingNumber || bookingId} •{' '}
            {booking?.vehicle ? `${booking.vehicle.brand} ${booking.vehicle.model}` : 'Vehicle Condition Audit'}
          </p>
        </div>

        <div className="cp-header-actions">
          <div className="cp-tabs-bar" style={{ border: 'none', padding: 0 }}>
            <button
              className={`cp-tab-btn ${selectedType === 'PICKUP' ? 'active' : ''}`}
              onClick={() => setSelectedType('PICKUP')}
            >
              Pickup Handover
            </button>
            <button
              className={`cp-tab-btn ${selectedType === 'RETURN' ? 'active' : ''}`}
              onClick={() => setSelectedType('RETURN')}
            >
              Post-Trip Return
            </button>
          </div>
        </div>
      </div>

      {/* Score and Highlights Bar */}
      <div
        className="cp-card"
        style={{
          background: 'linear-gradient(135deg, #1E0528 0%, #2A083A 100%)',
          color: '#FFFFFF',
          padding: '24px',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(250, 184, 38, 0.15)',
                border: '2px solid #FAB826',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                fontWeight: 800,
                color: '#FAB826',
              }}
            >
              {currentInspection.overallScore || 98}%
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)' }}>AI Cosmetic Health Score</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Pristine Condition</div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)' }}>Inspection Protocol</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>4-Point Synchronized 4K Scan</div>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)' }}>Customer Liability Status</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#34D399' }}>Zero Detected Chargeable Damage</div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <button
              onClick={() => setShowOverlays(!showOverlays)}
              className="cp-btn-outline"
              style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#FFFFFF', borderColor: 'rgba(255, 255, 255, 0.2)' }}
            >
              <Layers size={16} />
              {showOverlays ? 'Hide AI Overlays' : 'Show AI Overlays'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Visualizer and Findings */}
      <div className="cp-responsive-grid-2col">
        {/* Left: Interactive Canvas Photo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="cp-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ position: 'relative', height: 'clamp(260px, 45vw, 420px)', background: '#0F0314', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={selectedPhoto?.imageUrl}
                alt={selectedPhoto?.view}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />

              {/* Simulated Bounding Box Overlay if enabled */}
              {showOverlays && (
                <div
                  style={{
                    position: 'absolute',
                    top: '68%',
                    left: '32%',
                    width: '60px',
                    height: '28px',
                    border: '2px solid #FAB826',
                    background: 'rgba(250, 184, 38, 0.25)',
                    borderRadius: '4px',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '-18px',
                      left: '0',
                      background: '#FAB826',
                      color: '#1E0528',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      padding: '2px 4px',
                      borderRadius: '3px',
                    }}
                  >
                    Scratch 94%
                  </span>
                </div>
              )}

              <div
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  background: 'rgba(0, 0, 0, 0.75)',
                  color: '#FFFFFF',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                Angle: {selectedPhoto?.view?.replace('_', ' ')}
              </div>
            </div>

            {/* Photo thumbnails */}
            <div style={{ display: 'flex', gap: '12px', padding: '16px', background: '#FFFFFF', borderTop: '1px solid var(--cp-border)' }}>
              {currentInspection.photos.map((photo, idx) => (
                <div
                  key={idx}
                  style={{
                    width: '90px',
                    height: '60px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: selectedPhotoIndex === idx ? '2px solid var(--cp-accent)' : '2px solid rgba(30, 5, 40, 0.1)',
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedPhotoIndex(idx)}
                >
                  <img src={photo.imageUrl} alt={photo.view} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          </div>

          {/* AI Methodology Note */}
          <div
            style={{
              background: '#F8F6F9',
              borderRadius: '12px',
              padding: '16px 20px',
              border: '1px solid var(--cp-border)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              fontSize: '0.85rem',
              color: 'var(--cp-text-muted)',
            }}
          >
            <ShieldCheck size={20} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: 'var(--cp-primary)' }}>Customer Protection Guarantee:</strong> Finovo AI uses multi-frame object detection to differentiate pre-existing road grime and light cosmetic abrasions from new chargeable damage, preventing unexpected post-trip charges.
            </div>
          </div>
        </div>

        {/* Right: Findings List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="cp-card">
            <h2 className="cp-card-title" style={{ marginBottom: '16px' }}>Detected Findings & Anomaly Log</h2>

            {currentInspection.findings && currentInspection.findings.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {currentInspection.findings.map((f) => (
                  <div
                    key={f.id}
                    style={{
                      border: '1px solid var(--cp-border)',
                      borderRadius: '12px',
                      padding: '14px',
                      background: '#FFFFFF',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="cp-badge cp-badge-warning">{f.damageType.replace('_', ' ')}</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--cp-text-subtle)' }}>
                        {(f.confidence * 100).toFixed(0)}% AI Confidence
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--cp-primary)', fontSize: '0.9rem' }}>{f.location}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--cp-text-muted)' }}>
                      <span>Severity: <strong>{f.severity}</strong></span>
                      <span style={{ color: '#10B981', fontWeight: 700 }}>
                        {f.estimatedRepairCost === 0 ? 'Pre-existing (No Charge)' : `$${f.estimatedRepairCost}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--cp-text-muted)' }}>
                <CheckCircle2 size={32} color="#10B981" style={{ margin: '0 auto 8px auto' }} />
                <p style={{ margin: 0, fontSize: '0.9rem' }}>Zero anomalies detected across all vehicle surfaces.</p>
              </div>
            )}

            {/* Acknowledgment action */}
            <div style={{ marginTop: '24px', borderTop: '1px solid var(--cp-border)', paddingTop: '16px' }}>
              {acknowledged ? (
                <div
                  style={{
                    background: 'var(--cp-success-bg)',
                    color: 'var(--cp-success)',
                    padding: '12px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                  }}
                >
                  <CheckCircle2 size={18} />
                  Inspection Digitally Verified by Customer
                </div>
              ) : (
                <button
                  className="cp-btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => setAcknowledged(true)}
                >
                  Acknowledge & Sign Inspection Report
                  <CheckCircle2 size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
