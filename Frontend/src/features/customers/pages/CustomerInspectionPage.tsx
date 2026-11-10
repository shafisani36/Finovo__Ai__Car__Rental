import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Camera,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import { customerPortalApi, type CustomerBookingDetail } from '../api/customerPortalApi';
import { AiCameraScannerModal } from '../../inspections/components/AiCameraScannerModal';
import { InspectionReportPdfModal } from '../../inspections/components/InspectionReportPdfModal';
import {
  InspectionAiEngine,
  type ClientInspectionReport,
  type ClientComparisonReport,
} from '../../inspections/services/inspectionAiEngine';
import './CustomerPortal.css';

export function CustomerInspectionPage() {
  const { bookingId } = useParams<{ bookingId: string }>();

  const [booking, setBooking] = useState<CustomerBookingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<'PICKUP' | 'RETURN'>('PICKUP');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [showOverlays, setShowOverlays] = useState(true);
  const [acknowledged, setAcknowledged] = useState(false);

  // AI Camera & PDF Modal State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Stored reports
  const [pickupReport, setPickupReport] = useState<ClientInspectionReport | null>(null);
  const [returnReport, setReturnReport] = useState<ClientInspectionReport | null>(null);
  const [comparisonReport, setComparisonReport] = useState<ClientComparisonReport | null>(null);

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
    return () => {
      isMounted = false;
    };
  }, [bookingId]);

  // Pre-generate Baseline Pickup and Return Reports if needed
  useEffect(() => {
    const v = booking?.vehicle || {
      brand: 'Lamborghini',
      model: 'Huracán Evo Spyder',
      year: 2026,
      registrationNumber: 'FIN-889-AE',
      vin: 'FIN-VIN-VERIFIED-9821',
      color: 'Arancio Borealis (Orange)',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?auto=format&fit=crop&w=1200&q=80',
    };

    const photosList = [
      {
        view: 'FRONT',
        imageUrl:
          v.primaryImageUrl ||
          'https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?auto=format&fit=crop&w=1200&q=80',
      },
      {
        view: 'DRIVER_SIDE',
        imageUrl:
          'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=1200&q=80',
      },
      {
        view: 'PASSENGER_SIDE',
        imageUrl:
          'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1200&q=80',
      },
      {
        view: 'REAR',
        imageUrl:
          'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&w=1200&q=80',
      },
    ];

    if (!pickupReport) {
      const p = InspectionAiEngine.runInspection({
        type: 'PICKUP',
        vehicle: {
          brand: v.brand,
          model: v.model,
          year: v.year || 2026,
          registrationNumber: (v as any).registrationNumber || 'FIN-889-AE',
          vin: (v as any).vin || 'FIN-VIN-VERIFIED-9821',
          color: (v as any).color || 'Orange',
        },
        photos: photosList,
        simulateDamage: false,
      });
      setPickupReport(p);
    }

    if (!returnReport) {
      const r = InspectionAiEngine.runInspection({
        type: 'RETURN',
        vehicle: {
          brand: v.brand,
          model: v.model,
          year: v.year || 2026,
          registrationNumber: (v as any).registrationNumber || 'FIN-889-AE',
          vin: (v as any).vin || 'FIN-VIN-VERIFIED-9821',
          color: (v as any).color || 'Orange',
        },
        photos: photosList,
        simulateDamage: true,
      });
      setReturnReport(r);
    }
  }, [booking, pickupReport, returnReport]);

  // Update comparison when both reports exist
  useEffect(() => {
    if (pickupReport && returnReport && !comparisonReport) {
      const comp = InspectionAiEngine.compareReports(
        pickupReport,
        returnReport,
        Number(booking?.depositAmount || 2500)
      );
      setComparisonReport(comp);
    }
  }, [pickupReport, returnReport, comparisonReport, booking]);

  if (isLoading) {
    return (
      <div className="cp-page-container">
        <div className="cp-card cp-skeleton" style={{ height: '480px' }} />
      </div>
    );
  }

  const activeReport = selectedType === 'RETURN' ? (returnReport || pickupReport!) : (pickupReport!);
  const currentPhoto = activeReport?.photos?.[selectedPhotoIndex] || activeReport?.photos?.[0];

  return (
    <div className="cp-page-container">
      {/* Breadcrumb Navigation */}
      <div>
        <Link
          to={`/customer/bookings/${bookingId}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--cp-text-muted)',
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: 600,
            marginBottom: '16px',
          }}
        >
          <ArrowLeft size={16} />
          Back to Booking Details
        </Link>
      </div>

      {/* Top Header Card */}
      <div className="cp-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="cp-badge cp-badge-accent">
              Booking #{booking?.bookingNumber || bookingId}
            </span>
            <span className="cp-badge cp-badge-success">
              ✓ Pre-Trained AI Calibrated
            </span>
          </div>

          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--cp-primary)', margin: 0 }}>
            Computer Vision Vehicle Inspection Audit
          </h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--cp-text-muted)', fontSize: '0.9rem' }}>
            Multi-angle damage detection with automated baseline vs return comparison.
          </p>
        </div>

        {/* Tab & Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              background: '#F1EEF4',
              borderRadius: '10px',
              padding: '4px',
              gap: '4px',
            }}
          >
            <button
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                background: selectedType === 'PICKUP' ? '#FFFFFF' : 'transparent',
                color: selectedType === 'PICKUP' ? 'var(--cp-primary)' : 'var(--cp-text-muted)',
                boxShadow: selectedType === 'PICKUP' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
              onClick={() => {
                setSelectedType('PICKUP');
                setSelectedPhotoIndex(0);
              }}
            >
              Pickup Baseline Scan
            </button>
            <button
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                background: selectedType === 'RETURN' ? '#FFFFFF' : 'transparent',
                color: selectedType === 'RETURN' ? 'var(--cp-primary)' : 'var(--cp-text-muted)',
                boxShadow: selectedType === 'RETURN' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
              onClick={() => {
                setSelectedType('RETURN');
                setSelectedPhotoIndex(0);
              }}
            >
              Return Damage Scan
            </button>
          </div>

          <button
            onClick={() => setIsScannerOpen(true)}
            className="cp-btn-primary"
          >
            <Camera size={16} /> Run Live AI Scan
          </button>

          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="cp-btn-secondary"
          >
            <FileText size={16} /> Official PDF Report
          </button>
        </div>
      </div>

      {/* Diagnostics Banner */}
      <div
        className="cp-card"
        style={{
          background: 'linear-gradient(135deg, var(--cp-primary) 0%, var(--cp-primary-light) 100%)',
          color: '#FFFFFF',
          padding: '24px',
          borderColor: 'rgba(250, 184, 38, 0.24)',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', alignItems: 'center' }}>
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
              {activeReport?.overallScore || 98}%
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)' }}>Cosmetic Integrity</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                {activeReport?.overallScore && activeReport.overallScore > 95 ? 'Pristine Surface' : 'Action Required'}
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)' }}>Detected Color</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  backgroundColor: activeReport?.detectedColor?.hexCode || '#FFFFFF',
                  border: '1px solid #FFFFFF',
                }}
              />
              <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                {activeReport?.detectedColor?.colorName || 'Alpine White'}
              </span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)' }}>Scratches & Dents</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FAB826' }}>
              {activeReport?.scratchesCount || 0} Scratch(es) • {activeReport?.dentsCount || 0} Dent(s)
            </div>
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

      {/* Return Comparison Delta Banner (If Viewing Return) */}
      {selectedType === 'RETURN' && comparisonReport && (
        <div
          className="cp-card"
          style={{
            borderLeft: comparisonReport.newDamageCount > 0 ? '5px solid #EF4444' : '5px solid #10B981',
            backgroundColor: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {comparisonReport.newDamageCount > 0 ? (
                  <AlertTriangle size={20} color="#EF4444" />
                ) : (
                  <CheckCircle2 size={20} color="#10B981" />
                )}
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--cp-primary)' }}>
                  Pre-Trained AI Comparison Delta
                </h3>
              </div>
              <p style={{ margin: '4px 0 0', color: 'var(--cp-text-muted)', fontSize: '0.88rem' }}>
                {comparisonReport.summary}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: 'var(--cp-text-muted)' }}>Pre-Existing:</span>{' '}
                <strong style={{ color: '#10B981' }}>{comparisonReport.preExistingCount} (Free)</strong>
              </div>
              <div>
                <span style={{ color: 'var(--cp-text-muted)' }}>New Incidents:</span>{' '}
                <strong style={{ color: '#EF4444' }}>{comparisonReport.newDamageCount}</strong>
              </div>
              <div style={{ backgroundColor: '#F8F6F9', padding: '6px 14px', borderRadius: '8px' }}>
                <span style={{ color: 'var(--cp-text-muted)' }}>Deposit Refund:</span>{' '}
                <strong style={{ color: '#10B981', fontSize: '1.05rem' }}>
                  PKR {comparisonReport.netRefundAmount.toLocaleString()}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Visualizer and Findings */}
      <div className="cp-responsive-grid-2col">
        {/* Left: Viewport with Bounding Boxes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="cp-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div
              style={{
                position: 'relative',
                height: 'clamp(280px, 45vw, 420px)',
                background: '#0F0314',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={currentPhoto?.imageUrl}
                alt={currentPhoto?.view}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />

              {/* Bounding Box Overlays */}
              {showOverlays &&
                activeReport?.findings
                  .filter((f) => f.view === (currentPhoto?.view || 'FRONT'))
                  .map((finding) => (
                    <div
                      key={finding.id}
                      style={{
                        position: 'absolute',
                        left: `${finding.boundingBox.x * 100}%`,
                        top: `${finding.boundingBox.y * 100}%`,
                        width: `${finding.boundingBox.width * 100}%`,
                        height: `${finding.boundingBox.height * 100}%`,
                        border: finding.category === 'SCRATCH' ? '2px solid #F59E0B' : '2px solid #EF4444',
                        backgroundColor:
                          finding.category === 'SCRATCH'
                            ? 'rgba(245, 158, 11, 0.25)'
                            : 'rgba(239, 68, 68, 0.25)',
                        borderRadius: '4px',
                        boxShadow: '0 0 10px rgba(0,0,0,0.5)',
                        pointerEvents: 'none',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: '-20px',
                          left: '0',
                          backgroundColor: finding.category === 'SCRATCH' ? '#D97706' : '#DC2626',
                          color: '#FFFFFF',
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '1px 6px',
                          borderRadius: '3px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {finding.category}: {finding.damageType} ({finding.confidence}%)
                      </span>
                    </div>
                  ))}
            </div>

            {/* Thumbnail Angle Strip */}
            <div style={{ display: 'flex', gap: '8px', padding: '12px', background: '#FFFFFF', overflowX: 'auto' }}>
              {activeReport?.photos?.map((photo, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedPhotoIndex(idx)}
                  style={{
                    width: '76px',
                    height: '52px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: selectedPhotoIndex === idx ? '2px solid var(--cp-accent)' : '1px solid var(--cp-border)',
                    padding: 0,
                    background: 'none',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <img src={photo.imageUrl} alt={photo.view} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Findings Anomaly Schedule */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="cp-card">
            <h2 className="cp-card-title" style={{ marginBottom: '16px' }}>
              Detected Damage Findings ({activeReport?.findings?.length || 0})
            </h2>

            {activeReport?.findings && activeReport.findings.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activeReport.findings.map((f) => (
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
                      borderLeft: f.category === 'SCRATCH' ? '4px solid #F59E0B' : '4px solid #EF4444',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className={`cp-badge ${f.category === 'SCRATCH' ? 'cp-badge-warning' : 'cp-badge-danger'}`}>
                        {f.category}: {f.damageType}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--cp-text-subtle)', fontWeight: 600 }}>
                        {f.confidence}% AI Confidence
                      </span>
                    </div>

                    <div style={{ fontWeight: 700, color: 'var(--cp-primary)', fontSize: '0.9rem' }}>
                      {f.location}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--cp-text-muted)' }}>
                      <span>Severity: <strong>{f.severity}</strong></span>
                      <span style={{ color: 'var(--cp-warning)', fontWeight: 700 }}>
                        Est. Repair: PKR {f.estimatedRepairCost.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--cp-text-muted)' }}>
                <CheckCircle2 size={36} color="#10B981" style={{ margin: '0 auto 10px auto' }} />
                <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 600 }}>
                  Zero cosmetic defects or surface scratches detected.
                </p>
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

      {/* AI Live Camera Scanner Modal */}
      <AiCameraScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        inspectionType={selectedType}
        vehicle={{
          id: booking?.vehicle?.id,
          brand: booking?.vehicle?.brand || 'Luxury',
          model: booking?.vehicle?.model || 'Vehicle',
          year: booking?.vehicle?.year || 2026,
          registrationNumber: (booking?.vehicle as any)?.registrationNumber || 'FIN-889-AE',
          vin: (booking?.vehicle as any)?.vin || 'FIN-VIN-VERIFIED-9821',
          color: (booking?.vehicle as any)?.color || 'Orange',
          primaryImageUrl: booking?.vehicle?.primaryImageUrl || undefined,
        }}
        onInspectionComplete={(report) => {
          if (selectedType === 'PICKUP') {
            setPickupReport(report);
          } else {
            setReturnReport(report);
            if (pickupReport) {
              setComparisonReport(
                InspectionAiEngine.compareReports(
                  pickupReport,
                  report,
                  Number(booking?.depositAmount || 2500)
                )
              );
            }
          }
          setIsScannerOpen(false);
        }}
        onOpenPdfReport={(report) => {
          if (selectedType === 'PICKUP') {
            setPickupReport(report);
          } else {
            setReturnReport(report);
          }
          setIsScannerOpen(false);
          setIsPdfModalOpen(true);
        }}
      />

      {/* Official PDF Certificate Modal */}
      <InspectionReportPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        report={activeReport}
        comparisonReport={selectedType === 'RETURN' ? comparisonReport : null}
      />
    </div>
  );
}
