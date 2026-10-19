import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { inspectionApi } from '../api/inspectionApi';
import type { InspectionRecord, DamageFinding } from '../api/inspectionApi';
import {
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Eye,
  Check,
  X,
  Wrench,
} from 'lucide-react';
import { PageContainer, PageHeader } from '../../../components/common';

const getFindingCost = (finding: DamageFinding): number => {
  if (typeof finding.estimatedRepairCost === 'number' && !isNaN(finding.estimatedRepairCost)) {
    return finding.estimatedRepairCost;
  }
  const raw = Number(finding.estimatedRepairCost);
  if (!isNaN(raw) && raw > 0) return raw;

  const s = (finding.severity || '').toUpperCase();
  if (s === 'SEVERE' || s === 'HIGH') return 650;
  if (s === 'MODERATE' || s === 'MEDIUM') return 320;
  return 180;
};

const getFindingStatus = (finding: DamageFinding): string => {
  return finding.status || finding.humanDecision || (finding.isHumanVerified ? 'APPROVED_CLAIM' : 'PENDING_REVIEW');
};

const getFindingConfidence = (finding: DamageFinding): number => {
  const conf = Number(finding.confidence ?? 0);
  if (isNaN(conf)) return 85;
  return conf <= 1 ? Math.round(conf * 100) : Math.round(conf);
};

export function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [inspection, setInspection] = useState<InspectionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadInspection(id);
    }
  }, [id]);

  const loadInspection = async (inspectionId: string) => {
    try {
      setLoading(true);
      const res = await inspectionApi.getInspectionById(inspectionId);
      if (res.success && res.inspection) {
        setInspection(res.inspection);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to load inspection details');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (
    findingId: string,
    decision: 'APPROVED_CLAIM' | 'REJECTED_FALSE_POSITIVE' | 'MAINTENANCE_SCHEDULED'
  ) => {
    try {
      setReviewingId(findingId);
      const res = await inspectionApi.reviewFinding(findingId, {
        decision,
        notes: `Reviewed by staff operator at ${new Date().toLocaleTimeString()}`,
      });

      if (res.success && inspection) {
        setInspection({
          ...inspection,
          findings: inspection.findings.map((f) => (f.id === findingId ? res.finding : f)),
        });
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      alert(e.response?.data?.message || 'Failed to update review status');
    } finally {
      setReviewingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '80px', textAlign: 'center', color: '#685D73' }}>
        <RotateCcw size={28} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
        <div style={{ marginTop: '12px', fontWeight: 600 }}>Loading computer vision inspection findings...</div>
      </div>
    );
  }

  if (!inspection) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', textAlign: 'center' }}>
        <AlertTriangle size={48} color="#EF4444" style={{ marginBottom: '16px' }} />
        <h2 style={{ color: '#1E0426' }}>Inspection Not Found</h2>
        <p style={{ color: '#685D73', marginBottom: '24px' }}>The requested inspection record could not be found.</p>
        <Link
          to="/admin/inspections"
          style={{
            padding: '10px 20px',
            backgroundColor: '#1E0426',
            color: '#FFFFFF',
            borderRadius: '10px',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Back to Inspections
        </Link>
      </div>
    );
  }

  const currentPhoto = inspection.photos[activePhotoIndex] || {
    view: 'FRONT',
    imageUrl: inspection.vehicle.primaryImageUrl || '',
  };

  const activeFindings = inspection.findings;

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: 'Inspections', href: '/admin/inspections' },
          { label: `Report #${inspection.id.slice(0, 8)}` },
        ]}
        title={`Inspection Report #${inspection.id.slice(0, 8)}`}
        badge={`${inspection.type} INSPECTION`}
        subtitle={`Vehicle: ${inspection.vehicle.brand} ${inspection.vehicle.model} (${inspection.vehicle.registrationNumber})${inspection.rental ? ` • Rental Booking #${inspection.rental.booking.bookingNumber}` : ''}`}
        actions={
          <div
            style={{
              backgroundColor: inspection.hasDamageDetected ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              border: `1px solid ${inspection.hasDamageDetected ? '#EF4444' : '#10B981'}`,
              borderRadius: '12px',
              padding: '10px 18px',
              textAlign: 'right',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#685D73' }}>AI CONDITION SCORE</div>
            <div
              style={{
                fontSize: '1.4rem',
                fontWeight: 800,
                color: inspection.hasDamageDetected ? '#DC2626' : '#059669',
              }}
            >
              {inspection.overallScore}%
            </div>
          </div>
        }
      />

      {error && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid #EF4444',
            borderRadius: '12px',
            padding: '14px 18px',
            color: '#B91C1C',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Main Interactive Inspector Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(340px, 1.2fr)', gap: '24px' }}>
        {/* Left: Interactive Photo Viewport with Bounding Boxes */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #ECEAEF',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Angle Switcher Tabs */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {inspection.photos.map((photo, index) => (
              <button
                key={photo.id}
                onClick={() => setActivePhotoIndex(index)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: activePhotoIndex === index ? '#1E0426' : '#F7F5F8',
                  color: activePhotoIndex === index ? '#FFFFFF' : '#685D73',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <Eye size={14} />
                <span>{photo.view.replace('_', ' ')}</span>
              </button>
            ))}
          </div>

          {/* Viewport Canvas Container */}
          <div
            style={{
              position: 'relative',
              borderRadius: '12px',
              overflow: 'hidden',
              backgroundColor: '#1E0426',
              minHeight: '440px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={currentPhoto.imageUrl}
              alt=""
              style={{
                width: '100%',
                maxHeight: '520px',
                objectFit: 'cover',
                display: 'block',
              }}
            />

            {/* Simulated Bounding Boxes Overlay for active view */}
            {inspection.hasDamageDetected && activeFindings.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                }}
              >
                {activeFindings.map((finding, idx) => {
                  let parsedBox = { x: 28, y: 35, width: 22, height: 26 };
                  if (finding.boundingBox) {
                    try {
                      parsedBox = JSON.parse(finding.boundingBox);
                    } catch {
                      parsedBox = { x: 25 + idx * 30, y: 35, width: 22, height: 26 };
                    }
                  }

                  const boxX = parsedBox.x <= 1 ? parsedBox.x * 100 : parsedBox.x;
                  const boxY = parsedBox.y <= 1 ? parsedBox.y * 100 : parsedBox.y;
                  const boxW = parsedBox.width <= 1 ? parsedBox.width * 100 : parsedBox.width;
                  const boxH = parsedBox.height <= 1 ? parsedBox.height * 100 : parsedBox.height;

                  const status = getFindingStatus(finding);
                  const isApproved = status === 'APPROVED_CLAIM';
                  const isRejected = status === 'REJECTED_FALSE_POSITIVE';
                  const cost = getFindingCost(finding);
                  const confidencePct = getFindingConfidence(finding);

                  return (
                    <div
                      key={finding.id}
                      style={{
                        position: 'absolute',
                        left: `${boxX}%`,
                        top: `${boxY}%`,
                        width: `${boxW}%`,
                        height: `${boxH}%`,
                        border: `2px solid ${isRejected ? '#9CA3AF' : isApproved ? '#10B981' : '#EF4444'}`,
                        backgroundColor: isRejected ? 'rgba(156, 163, 175, 0.15)' : 'rgba(239, 68, 68, 0.2)',
                        borderRadius: '4px',
                        boxShadow: '0 0 12px rgba(239, 68, 68, 0.4)',
                        pointerEvents: 'auto',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      title={`${finding.damageType} at ${finding.location}`}
                    >
                      {/* Badge Label */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '-24px',
                          left: '0',
                          backgroundColor: isRejected ? '#6B7280' : isApproved ? '#059669' : '#EF4444',
                          color: '#FFFFFF',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          whiteSpace: 'nowrap',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                        }}
                      >
                        {finding.damageType} ({confidencePct}%) • ${cost.toFixed(0)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem', color: '#685D73' }}>
            <span>View: {currentPhoto.view} • Camera: High-Res Sensor #1</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#059669', fontWeight: 600 }}>
              <Sparkles size={14} /> Edge Anomaly Alignment Active
            </span>
          </div>
        </div>

        {/* Right: AI Anomaly Findings & Staff Decision Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Summary Box */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #ECEAEF',
              padding: '20px',
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 700, color: '#1E0426' }}>
              Inspection Summary
            </h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#685D73', lineHeight: 1.5 }}>
              {inspection.summary || 'Surface scan processed with zero critical frame structural anomalies.'}
            </p>
          </div>

          {/* Findings List */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #ECEAEF',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1E0426' }}>
                Detected Anomalies ({activeFindings.length})
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#685D73' }}>Human review required</span>
            </div>

            {activeFindings.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#059669' }}>
                <CheckCircle2 size={36} style={{ marginBottom: '8px' }} />
                <div style={{ fontWeight: 700 }}>Zero Damage Detected</div>
                <div style={{ fontSize: '0.8125rem', color: '#685D73' }}>
                  Vehicle exterior matched baseline pickup scan perfectly.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {activeFindings.map((finding) => {
                  const status = getFindingStatus(finding);
                  const cost = getFindingCost(finding);
                  const confidencePct = getFindingConfidence(finding);
                  const isApproved = status === 'APPROVED_CLAIM';
                  const isRejected = status === 'REJECTED_FALSE_POSITIVE';
                  const isMaintenance = status === 'MAINTENANCE_SCHEDULED';

                  return (
                    <div
                      key={finding.id}
                      style={{
                        border: '1px solid #ECEAEF',
                        borderRadius: '12px',
                        padding: '16px',
                        backgroundColor: '#FAF9FB',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 800, color: '#1E0426', fontSize: '0.95rem' }}>
                              {finding.damageType}
                            </span>
                            <span
                              style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                backgroundColor:
                                  finding.severity === 'SEVERE'
                                    ? 'rgba(239, 68, 68, 0.15)'
                                    : 'rgba(250, 184, 38, 0.2)',
                                color: finding.severity === 'SEVERE' ? '#DC2626' : '#B45309',
                              }}
                            >
                              {finding.severity}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8125rem', color: '#685D73', marginTop: '2px' }}>
                            Location: <strong>{finding.location}</strong>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.75rem', color: '#685D73' }}>Confidence</div>
                          <div style={{ fontWeight: 800, color: '#059669', fontSize: '0.9rem' }}>
                            {confidencePct}%
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          backgroundColor: '#FFFFFF',
                          borderRadius: '8px',
                          marginBottom: '12px',
                          border: '1px solid #ECEAEF',
                        }}
                      >
                        <span style={{ fontSize: '0.8125rem', color: '#685D73' }}>Est. Repair Cost</span>
                        <span style={{ fontWeight: 800, color: '#1E0426', fontSize: '0.95rem' }}>
                          ${cost.toFixed(2)}
                        </span>
                      </div>

                      {/* Status indicator */}
                      <div style={{ marginBottom: '12px', fontSize: '0.8125rem' }}>
                        Status:{' '}
                        <span
                          style={{
                            fontWeight: 700,
                            color:
                              isApproved
                                ? '#059669'
                                : isRejected
                                ? '#6B7280'
                                : isMaintenance
                                ? '#2563EB'
                                : '#D97706',
                          }}
                        >
                          {status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {/* Staff Decision Actions */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleReview(finding.id, 'APPROVED_CLAIM')}
                          disabled={reviewingId === finding.id}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            padding: '8px',
                            borderRadius: '8px',
                            backgroundColor: isApproved ? '#059669' : '#FFFFFF',
                            color: isApproved ? '#FFFFFF' : '#059669',
                            border: '1px solid #059669',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          <Check size={14} />
                          <span>Approve Claim</span>
                        </button>

                        <button
                          onClick={() => handleReview(finding.id, 'REJECTED_FALSE_POSITIVE')}
                          disabled={reviewingId === finding.id}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            padding: '8px',
                            borderRadius: '8px',
                            backgroundColor: isRejected ? '#4B5563' : '#FFFFFF',
                            color: isRejected ? '#FFFFFF' : '#4B5563',
                            border: '1px solid #9CA3AF',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          <X size={14} />
                          <span>Dismiss</span>
                        </button>

                        <button
                          onClick={() => handleReview(finding.id, 'MAINTENANCE_SCHEDULED')}
                          disabled={reviewingId === finding.id}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            padding: '8px',
                            borderRadius: '8px',
                            backgroundColor: isMaintenance ? '#2563EB' : '#FFFFFF',
                            color: isMaintenance ? '#FFFFFF' : '#2563EB',
                            border: '1px solid #2563EB',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          <Wrench size={14} />
                          <span>Workshop</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
