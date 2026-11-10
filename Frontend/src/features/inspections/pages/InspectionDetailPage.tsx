import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { inspectionApi } from '../api/inspectionApi';
import type { InspectionRecord, DamageFinding } from '../api/inspectionApi';
import {
  InspectionAiEngine,
  type ClientComparisonReport,
} from '../services/inspectionAiEngine';
import { InspectionReportPdfModal } from '../components/InspectionReportPdfModal';
import {
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Eye,
  Check,
  X,
  Wrench,
  FileText,
  GitCompare,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { PageContainer, PageHeader, Button } from '../../../components/common';

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
  const [showAllAngleBoxes, setShowAllAngleBoxes] = useState<boolean>(false);

  // Interactive decision state
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewingDecision, setReviewingDecision] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{
    type: 'success' | 'info' | 'warning';
    text: string;
    showFleetLink?: boolean;
  } | null>(null);

  // PDF Comparison modal
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadInspection(id);
    }
  }, [id]);

  const loadInspection = async (inspectionId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await inspectionApi.getInspectionById(inspectionId);
      if (res.success && res.inspection) {
        setInspection(res.inspection);
      }
    } catch (err: unknown) {
      const e = err as { message?: string; response?: { data?: { message?: string } } };
      setError(e.message || e.response?.data?.message || 'Failed to load inspection details');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (
    finding: DamageFinding,
    decision: 'APPROVED_CLAIM' | 'REJECTED_FALSE_POSITIVE' | 'MAINTENANCE_SCHEDULED'
  ) => {
    if (!inspection) return;
    setError(null);
    setActionNotice(null);

    try {
      setReviewingId(finding.id);
      setReviewingDecision(decision);
      const res = await inspectionApi.reviewFinding(finding.id, {
        decision,
        notes: `Reviewed by inspector at ${new Date().toLocaleTimeString()}`,
      });

      if (res.success && res.finding) {
        setInspection((prev) =>
          prev
            ? {
                ...prev,
                findings: prev.findings.map((f) => (f.id === finding.id ? res.finding : f)),
              }
            : prev
        );

        const cost = getFindingCost(res.finding);
        if (decision === 'APPROVED_CLAIM') {
          setActionNotice({
            type: 'success',
            text: `Claim approved for "${finding.damageType}" ($${cost.toFixed(2)} synced to claim ledger).`,
          });
        } else if (decision === 'REJECTED_FALSE_POSITIVE') {
          setActionNotice({
            type: 'info',
            text: `"${finding.damageType}" dismissed as false positive and excluded from customer charges.`,
          });
        } else {
          setActionNotice({
            type: 'warning',
            text: `Workshop repair scheduled${res.maintenanceRecordId ? ` (#${res.maintenanceRecordId.slice(0, 8)})` : ''} for "${finding.damageType}"${res.vehicleStatus === 'MAINTENANCE' ? ' and vehicle status updated to MAINTENANCE' : ''}.`,
            showFleetLink: true,
          });
        }
      }
    } catch (err: unknown) {
      const e = err as { message?: string; response?: { data?: { message?: string } } };
      setError(e.message || e.response?.data?.message || 'Failed to update review decision. Please check your permissions.');
    } finally {
      setReviewingId(null);
      setReviewingDecision(null);
    }
  };

  // Compute Pickup vs Return comparison automatically when paired inspections exist on rental
  const comparisonData = useMemo<{
    pickupIns: InspectionRecord;
    returnIns: InspectionRecord;
    report: ClientComparisonReport;
    scoreDelta: number;
  } | null>(() => {
    if (!inspection?.rental?.inspections || inspection.rental.inspections.length < 2) {
      return null;
    }

    const pickupIns = inspection.rental.inspections.find((i) => i.type === 'PICKUP');
    const returnIns = [...inspection.rental.inspections].reverse().find((i) => i.type === 'RETURN');
    if (!pickupIns || !returnIns) return null;

    const vehicleMeta = {
      brand: inspection.vehicle.brand,
      model: inspection.vehicle.model,
      year: inspection.vehicle.year,
      registrationNumber: inspection.vehicle.registrationNumber,
      primaryImageUrl: inspection.vehicle.primaryImageUrl,
    };

    const pickupClient = InspectionAiEngine.fromServerRecord(pickupIns, vehicleMeta);
    const returnClient = InspectionAiEngine.fromServerRecord(returnIns, vehicleMeta);
    const depositAmt = Number(inspection.rental.booking?.depositAmount || 5000);
    const report = InspectionAiEngine.compareReports(pickupClient, returnClient, depositAmt);
    const scoreDelta = Number(((returnIns.overallScore ?? 100) - (pickupIns.overallScore ?? 100)).toFixed(1));

    return { pickupIns, returnIns, report, scoreDelta };
  }, [inspection]);

  // Review ledger metrics
  const ledgerSummary = useMemo(() => {
    const list = inspection?.findings || [];
    let approvedCount = 0;
    let approvedTotal = 0;
    let dismissedCount = 0;
    let workshopCount = 0;
    let pendingCount = 0;

    list.forEach((f) => {
      const st = getFindingStatus(f);
      const cost = getFindingCost(f);
      if (st === 'APPROVED_CLAIM') {
        approvedCount += 1;
        approvedTotal += cost;
      } else if (st === 'REJECTED_FALSE_POSITIVE') {
        dismissedCount += 1;
      } else if (st === 'MAINTENANCE_SCHEDULED') {
        workshopCount += 1;
      } else {
        pendingCount += 1;
      }
    });

    return { approvedCount, approvedTotal, dismissedCount, workshopCount, pendingCount };
  }, [inspection]);

  if (loading) {
    return (
      <div style={{ padding: '80px', textAlign: 'center', color: '#4A315A' }}>
        <RotateCcw size={28} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
        <div style={{ marginTop: '12px', fontWeight: 600 }}>Loading computer vision inspection findings...</div>
      </div>
    );
  }

  if (!inspection) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', textAlign: 'center' }}>
        <AlertTriangle size={48} color="#EF4444" style={{ marginBottom: '16px' }} />
        <h2 style={{ color: '#1E0432' }}>Inspection Not Found</h2>
        <p style={{ color: '#4A315A', marginBottom: '24px' }}>The requested inspection record could not be found.</p>
        <Link
          to="/admin/inspections"
          style={{
            padding: '10px 20px',
            backgroundColor: '#1E0432',
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
  const visibleFindingsOnCanvas = showAllAngleBoxes
    ? activeFindings
    : activeFindings.filter(
        (f) => InspectionAiEngine.inferFindingView(f.region, f.location) === currentPhoto.view
      );

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {comparisonData && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setIsPdfModalOpen(true)}
              >
                <FileText size={15} />
                <span>Comparison PDF Report</span>
              </Button>
            )}
            <div
              style={{
                backgroundColor: inspection.hasDamageDetected ? 'rgba(239, 68, 68, 0.1)' : 'rgba(5, 122, 85, 0.1)',
                border: `1px solid ${inspection.hasDamageDetected ? '#EF4444' : '#057A55'}`,
                borderRadius: '12px',
                padding: '10px 18px',
                textAlign: 'right',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4A315A' }}>AI CONDITION SCORE</div>
              <div
                style={{
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: inspection.hasDamageDetected ? '#B91C1C' : '#057A55',
                }}
              >
                {inspection.overallScore}%
              </div>
            </div>
          </div>
        }
      />

      {error && (
        <div
          style={{
            backgroundColor: '#FEE2E2',
            border: '1px solid #FECACA',
            borderRadius: '12px',
            padding: '14px 18px',
            color: '#B91C1C',
            fontSize: '0.875rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {actionNotice && (
        <div
          style={{
            backgroundColor:
              actionNotice.type === 'success'
                ? '#E8F9F0'
                : actionNotice.type === 'warning'
                ? '#FEF3C7'
                : '#F5EEF8',
            border: `1px solid ${
              actionNotice.type === 'success'
                ? '#A7F3D0'
                : actionNotice.type === 'warning'
                ? '#FDE68A'
                : '#E0D8E3'
            }`,
            borderRadius: '12px',
            padding: '12px 18px',
            color:
              actionNotice.type === 'success'
                ? '#057A55'
                : actionNotice.type === 'warning'
                ? '#B45309'
                : '#4A315A',
            fontSize: '0.875rem',
            fontWeight: 700,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <span>{actionNotice.text}</span>
          {actionNotice.showFleetLink && (
            <Link
              to={`/admin/fleet/${inspection.vehicleId}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: '#1E0432',
                fontWeight: 800,
                textDecoration: 'none',
                fontSize: '0.82rem',
              }}
            >
              <span>View Vehicle Maintenance Schedule</span>
              <ArrowRight size={14} />
            </Link>
          )}
        </div>
      )}

      {/* Pickup Baseline vs Return Comparison Banner (when both scans exist on Rental) */}
      {comparisonData && (
        <div
          style={{
            background: 'linear-gradient(135deg, #1E0432 0%, #2E0949 100%)',
            color: '#FFFFFF',
            borderRadius: '18px',
            padding: '22px 24px',
            border: '1.5px solid rgba(250, 184, 38, 0.28)',
            boxShadow: '0 8px 24px rgba(30, 4, 50, 0.14)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <GitCompare size={20} color="#FAB826" />
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#FAB826', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Pre-Handover vs Return Difference Report
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                  {comparisonData.report.newDamageCount > 0
                    ? `${comparisonData.report.newDamageCount} New Damage(s) Detected After Return`
                    : 'Zero New Damages — Identical to Key Handover Baseline'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {inspection.type === 'RETURN' ? (
                <Link
                  to={`/admin/inspections/${comparisonData.pickupIns.id}`}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  View Pickup Baseline Scan →
                </Link>
              ) : (
                <Link
                  to={`/admin/inspections/${comparisonData.returnIns.id}`}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  View Return Scan →
                </Link>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '12px' }}>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.7)' }}>Pickup Score</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34D399' }}>
                {comparisonData.pickupIns.overallScore ?? 100}%
              </div>
            </div>
            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '12px' }}>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.7)' }}>Return Score</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: comparisonData.scoreDelta < 0 ? '#FAB826' : '#34D399' }}>
                {comparisonData.returnIns.overallScore ?? 100}% ({comparisonData.scoreDelta >= 0 ? `+${comparisonData.scoreDelta}` : comparisonData.scoreDelta}%)
              </div>
            </div>
            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '12px' }}>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.7)' }}>Pre-Existing (Free)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF' }}>
                {comparisonData.report.preExistingCount}
              </div>
            </div>
            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '12px' }}>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.7)' }}>New Return Damages</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: comparisonData.report.newDamageCount > 0 ? '#F87171' : '#34D399' }}>
                {comparisonData.report.newDamageCount} (Est. ${comparisonData.report.totalProposedCharges.toLocaleString()})
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Interactive Inspector Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '24px', alignItems: 'start' }}>
        {/* Left: Interactive Photo Viewport with Bounding Boxes */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #EFEAEF',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Angle Switcher Tabs */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {inspection.photos.map((photo, index) => {
              const countForAngle = activeFindings.filter(
                (f) => InspectionAiEngine.inferFindingView(f.region, f.location) === photo.view
              ).length;
              return (
                <button
                  type="button"
                  key={photo.id}
                  onClick={() => setActivePhotoIndex(index)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    border: activePhotoIndex === index ? '1px solid #1E0432' : '1px solid #EFEAEF',
                    backgroundColor: activePhotoIndex === index ? '#1E0432' : '#FAF7FA',
                    color: activePhotoIndex === index ? '#FFFFFF' : '#4A315A',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Eye size={14} />
                  <span>{photo.view.replace(/_/g, ' ')}</span>
                  {countForAngle > 0 && (
                    <span
                      style={{
                        backgroundColor: activePhotoIndex === index ? '#FAB826' : '#FEE2E2',
                        color: activePhotoIndex === index ? '#1E0432' : '#B91C1C',
                        padding: '1px 6px',
                        borderRadius: '9999px',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                      }}
                    >
                      {countForAngle}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Viewport Canvas Container */}
          <div
            style={{
              position: 'relative',
              borderRadius: '14px',
              overflow: 'hidden',
              backgroundColor: '#140220',
              minHeight: '420px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={currentPhoto.imageUrl}
              alt={currentPhoto.view}
              style={{
                width: '100%',
                maxHeight: '520px',
                objectFit: 'cover',
                display: 'block',
              }}
            />

            {/* Bounding Boxes Overlay for active photo angle */}
            {inspection.hasDamageDetected && visibleFindingsOnCanvas.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                }}
              >
                {visibleFindingsOnCanvas.map((finding, idx) => {
                  let parsedBox = { x: 28, y: 35, width: 22, height: 26 };
                  if (finding.boundingBox) {
                    try {
                      parsedBox = JSON.parse(finding.boundingBox);
                    } catch {
                      parsedBox = { x: 25 + idx * 25, y: 35, width: 22, height: 26 };
                    }
                  }

                  const boxX = parsedBox.x <= 1 ? parsedBox.x * 100 : parsedBox.x;
                  const boxY = parsedBox.y <= 1 ? parsedBox.y * 100 : parsedBox.y;
                  const boxW = parsedBox.width <= 1 ? parsedBox.width * 100 : parsedBox.width;
                  const boxH = parsedBox.height <= 1 ? parsedBox.height * 100 : parsedBox.height;

                  const status = getFindingStatus(finding);
                  const isApproved = status === 'APPROVED_CLAIM';
                  const isRejected = status === 'REJECTED_FALSE_POSITIVE';
                  const isWorkshop = status === 'MAINTENANCE_SCHEDULED';
                  const cost = getFindingCost(finding);
                  const confidencePct = getFindingConfidence(finding);

                  const boxColor = isRejected
                    ? '#8A7090'
                    : isApproved
                    ? '#10B981'
                    : isWorkshop
                    ? '#FAB826'
                    : '#EF4444';

                  return (
                    <div
                      key={finding.id}
                      style={{
                        position: 'absolute',
                        left: `${boxX}%`,
                        top: `${boxY}%`,
                        width: `${boxW}%`,
                        height: `${boxH}%`,
                        border: `2px solid ${boxColor}`,
                        backgroundColor: isRejected ? 'rgba(138, 112, 144, 0.14)' : 'rgba(239, 68, 68, 0.18)',
                        borderRadius: '6px',
                        boxShadow: `0 0 12px ${boxColor}66`,
                        pointerEvents: 'auto',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      title={`${finding.damageType} at ${finding.location}`}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: '-24px',
                          left: '0',
                          backgroundColor: boxColor,
                          color: isWorkshop ? '#1E0432' : '#FFFFFF',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.73rem',
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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '0.8125rem', color: '#4A315A' }}>
            <span>View: {currentPhoto.view.replace(/_/g, ' ')} • Camera: High-Res Sensor #1</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setShowAllAngleBoxes((prev) => !prev)}
                style={{
                  background: '#FAF7FA',
                  border: '1px solid #E0D8E3',
                  borderRadius: '8px',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#1E0432',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Layers size={13} color="#6C1E84" />
                <span>{showAllAngleBoxes ? 'Filter By Angle' : 'Show All Angles'}</span>
              </button>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#057A55', fontWeight: 700 }}>
                <Sparkles size={14} /> Edge Anomaly Alignment Active
              </span>
            </div>
          </div>
        </div>

        {/* Right: AI Anomaly Findings & Interactive Staff Decisions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Summary Box */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #EFEAEF',
              padding: '20px',
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#1E0432' }}>
              Inspection Summary
            </h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#4A315A', lineHeight: 1.55 }}>
              {inspection.summary || 'Surface scan processed with zero critical frame structural anomalies.'}
            </p>
          </div>

          {/* Findings List */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #EFEAEF',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1E0432' }}>
                Detected Anomalies ({activeFindings.length})
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#8A7090', fontWeight: 600 }}>
                Click any action to switch decision
              </span>
            </div>

            {/* Live Decisions & Claims Ledger Summary */}
            {activeFindings.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                  gap: '8px',
                  padding: '10px',
                  backgroundColor: '#FAF6FC',
                  borderRadius: '12px',
                  border: '1px solid #E0D8E3',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.68rem', color: '#8A7090', fontWeight: 700 }}>APPROVED CLAIMS</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#057A55' }}>
                    {ledgerSummary.approvedCount} (${ledgerSummary.approvedTotal.toFixed(0)})
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.68rem', color: '#8A7090', fontWeight: 700 }}>WORKSHOP</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#6C1E84' }}>
                    {ledgerSummary.workshopCount}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.68rem', color: '#8A7090', fontWeight: 700 }}>DISMISSED</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#4A315A' }}>
                    {ledgerSummary.dismissedCount}
                  </div>
                </div>
                {ledgerSummary.pendingCount > 0 && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: '#8A7090', fontWeight: 700 }}>PENDING</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#B45309' }}>
                      {ledgerSummary.pendingCount}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeFindings.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#057A55' }}>
                <CheckCircle2 size={36} style={{ marginBottom: '8px' }} />
                <div style={{ fontWeight: 800 }}>Zero Damage Detected</div>
                <div style={{ fontSize: '0.8125rem', color: '#4A315A' }}>
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
                  const isBusy = reviewingId === finding.id;
                  const angleView = InspectionAiEngine.inferFindingView(finding.region, finding.location);

                  return (
                    <div
                      key={finding.id}
                      style={{
                        border: isMaintenance
                          ? '1.5px solid #6C1E84'
                          : isApproved
                          ? '1.5px solid #A7F3D0'
                          : '1px solid #EFEAEF',
                        borderRadius: '14px',
                        padding: '16px',
                        backgroundColor: isRejected ? '#F7F5F8' : '#FAF7FA',
                        opacity: isRejected ? 0.78 : 1,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '8px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 800, color: '#1E0432', fontSize: '0.95rem' }}>
                              {finding.damageType}
                            </span>
                            <span
                              style={{
                                padding: '2px 7px',
                                borderRadius: '6px',
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                backgroundColor:
                                  finding.severity === 'SEVERE' || finding.severity === 'HIGH'
                                    ? 'rgba(239, 68, 68, 0.14)'
                                    : 'rgba(250, 184, 38, 0.2)',
                                color:
                                  finding.severity === 'SEVERE' || finding.severity === 'HIGH'
                                    ? '#B91C1C'
                                    : '#B45309',
                              }}
                            >
                              {finding.severity}
                            </span>
                            <span
                              style={{
                                padding: '2px 7px',
                                borderRadius: '6px',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                backgroundColor: '#F5EEF8',
                                color: '#6C1E84',
                              }}
                            >
                              {angleView.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8125rem', color: '#4A315A', marginTop: '3px' }}>
                            Location: <strong>{finding.location}</strong>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.72rem', color: '#8A7090', fontWeight: 600 }}>Confidence</div>
                          <div style={{ fontWeight: 800, color: '#057A55', fontSize: '0.9rem' }}>
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
                          borderRadius: '10px',
                          marginBottom: '12px',
                          border: '1px solid #EFEAEF',
                        }}
                      >
                        <span style={{ fontSize: '0.8125rem', color: '#4A315A' }}>Est. Repair Cost</span>
                        <span
                          style={{
                            fontWeight: 800,
                            color: isRejected ? '#8A7090' : '#1E0432',
                            fontSize: '0.95rem',
                            textDecoration: isRejected ? 'line-through' : 'none',
                          }}
                        >
                          ${cost.toFixed(2)}
                        </span>
                      </div>

                      {/* Status indicator */}
                      <div style={{ marginBottom: '12px', fontSize: '0.8125rem' }}>
                        Status:{' '}
                        <span
                          style={{
                            fontWeight: 800,
                            color: isApproved
                              ? '#057A55'
                              : isRejected
                              ? '#8A7090'
                              : isMaintenance
                              ? '#6C1E84'
                              : '#B45309',
                          }}
                        >
                          {status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {/* Interactive Staff Decision Actions */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => handleReview(finding, 'APPROVED_CLAIM')}
                          disabled={isBusy || isApproved}
                          style={{
                            flex: 1,
                            minWidth: '100px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            padding: '8px 10px',
                            borderRadius: '10px',
                            backgroundColor: isApproved ? '#057A55' : '#FFFFFF',
                            color: isApproved ? '#FFFFFF' : '#057A55',
                            border: '1.5px solid #057A55',
                            fontWeight: 700,
                            fontSize: '0.76rem',
                            cursor: isBusy ? 'wait' : isApproved ? 'default' : 'pointer',
                            opacity: isBusy && reviewingDecision !== 'APPROVED_CLAIM' ? 0.6 : 1,
                          }}
                        >
                          <Check size={14} />
                          <span>
                            {isBusy && reviewingDecision === 'APPROVED_CLAIM'
                              ? 'Saving...'
                              : isApproved
                              ? 'Approved'
                              : 'Approve Claim'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleReview(finding, 'REJECTED_FALSE_POSITIVE')}
                          disabled={isBusy || isRejected}
                          style={{
                            flex: 1,
                            minWidth: '90px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            padding: '8px 10px',
                            borderRadius: '10px',
                            backgroundColor: isRejected ? '#4A315A' : '#FFFFFF',
                            color: isRejected ? '#FFFFFF' : '#4A315A',
                            border: '1.5px solid #C8BACF',
                            fontWeight: 700,
                            fontSize: '0.76rem',
                            cursor: isBusy ? 'wait' : isRejected ? 'default' : 'pointer',
                            opacity: isBusy && reviewingDecision !== 'REJECTED_FALSE_POSITIVE' ? 0.6 : 1,
                          }}
                        >
                          <X size={14} />
                          <span>
                            {isBusy && reviewingDecision === 'REJECTED_FALSE_POSITIVE'
                              ? 'Saving...'
                              : isRejected
                              ? 'Dismissed'
                              : 'Dismiss'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleReview(finding, 'MAINTENANCE_SCHEDULED')}
                          disabled={isBusy || isMaintenance}
                          style={{
                            flex: 1,
                            minWidth: '100px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            padding: '8px 10px',
                            borderRadius: '10px',
                            backgroundColor: isMaintenance ? '#6C1E84' : '#FFFFFF',
                            color: isMaintenance ? '#FFFFFF' : '#6C1E84',
                            border: '1.5px solid #6C1E84',
                            fontWeight: 700,
                            fontSize: '0.76rem',
                            cursor: isBusy ? 'wait' : isMaintenance ? 'default' : 'pointer',
                            opacity: isBusy && reviewingDecision !== 'MAINTENANCE_SCHEDULED' ? 0.6 : 1,
                          }}
                        >
                          <Wrench size={14} />
                          <span>
                            {isBusy && reviewingDecision === 'MAINTENANCE_SCHEDULED'
                              ? 'Scheduling...'
                              : isMaintenance
                              ? 'In Workshop'
                              : 'Workshop'}
                          </span>
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

      {/* Comparison PDF Report Modal */}
      {comparisonData && (
        <InspectionReportPdfModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          report={comparisonData.report.returnReport}
          comparisonReport={comparisonData.report}
        />
      )}
    </PageContainer>
  );
}
