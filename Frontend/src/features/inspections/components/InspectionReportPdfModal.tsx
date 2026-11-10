import { useRef } from 'react';
import {
  Printer,
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Award,
} from 'lucide-react';
import type {
  ClientInspectionReport,
  ClientComparisonReport,
} from '../services/inspectionAiEngine';

interface InspectionReportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ClientInspectionReport | null;
  comparisonReport?: ClientComparisonReport | null;
}

export function InspectionReportPdfModal({
  isOpen,
  onClose,
  report,
  comparisonReport,
}: InspectionReportPdfModalProps) {
  const printableRef = useRef<HTMLDivElement>(null);

  if (!isOpen || (!report && !comparisonReport)) return null;

  const isComparison = Boolean(comparisonReport);
  const activeReport = comparisonReport?.returnReport || report!;


  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="pdf-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(20, 2, 32, 0.84)',
        backdropFilter: 'blur(8px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '960px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Controls Header (Hidden during print) */}
        <div
          className="no-print"
          style={{
            padding: '16px 24px',
            background: 'linear-gradient(135deg, #1E0432 0%, #2E0949 100%)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileCheck size={22} color="#FAB826" />
            <span style={{ fontFamily: "var(--font-family-display, 'Archivo', sans-serif)", fontWeight: 800, fontSize: '1.05rem' }}>
              {isComparison
                ? 'Official Return Damage Comparison Report (PDF)'
                : 'Official Vehicle Handover Pre-Inspection Certificate (PDF)'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={handlePrint}
              className="cp-btn-primary"
              style={{ padding: '8px 16px', fontSize: '13px', minHeight: '36px' }}
            >
              <Printer size={16} /> Print / Save as PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close PDF preview"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                borderRadius: '8px',
                color: 'rgba(255, 255, 255, 0.8)',
                cursor: 'pointer',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Document Container */}
        <div
          style={{
            overflowY: 'auto',
            padding: 'clamp(16px, 4vw, 36px)',
            backgroundColor: '#F7F5F8',
            flex: 1,
          }}
        >
          {/* Printable Sheet */}
          <div
            ref={printableRef}
            className="printable-certificate"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #EFEAEF',
              borderRadius: '16px',
              padding: 'clamp(20px, 4vw, 40px)',
              maxWidth: '820px',
              margin: '0 auto',
              boxShadow: '0 6px 20px rgba(30, 4, 50, 0.06)',
              fontFamily: "var(--font-family-sans, 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif)",
              color: '#1E0432',
            }}
          >
            {/* Certificate Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '16px',
                borderBottom: '2px solid #1E0432',
                paddingBottom: '24px',
                marginBottom: '28px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '9px',
                      backgroundColor: '#1E0432',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Award size={18} color="#FAB826" />
                  </div>
                  <h1 style={{ fontFamily: "var(--font-family-display, 'Archivo', sans-serif)", fontSize: '24px', fontWeight: 900, color: '#1E0432', margin: 0 }}>
                    FINOVO AI CAR RENTAL
                  </h1>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#4A315A', fontWeight: 600 }}>
                  Pre-Trained Computer Vision Vehicle Inspection & Handover Certificate
                </p>
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#8A7090' }}>
                  Standard ISO/SAE Automotive Inspection Compliance • Verification Hash: {activeReport.inspectionHash}
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    backgroundColor: isComparison ? '#FEE2E2' : '#E8F9F0',
                    color: isComparison ? '#B91C1C' : '#057A55',
                    border: isComparison ? '1px solid #FECACA' : '1px solid #A7F3D0',
                    fontWeight: 800,
                    fontSize: '12px',
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    display: 'inline-block',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {isComparison ? 'Return Damage Delta Audit' : 'Certified Pickup Baseline'}
                </span>
                <div style={{ fontSize: '12px', color: '#4A315A' }}>
                  Certificate ID: <strong>#{activeReport.id}</strong>
                </div>
                <div style={{ fontSize: '12px', color: '#8A7090' }}>Date: {activeReport.timestamp}</div>
              </div>
            </div>

            {/* Vehicle Profile & AI Diagnostics Ribbon */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '20px',
                backgroundColor: '#FAF7FA',
                padding: '20px',
                borderRadius: '14px',
                marginBottom: '28px',
                border: '1px solid #EFEAEF',
              }}
            >
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 10px', color: '#1E0432' }}>
                  {activeReport.vehicle.brand} {activeReport.vehicle.model} ({activeReport.vehicle.year})
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: '#8A7090' }}>Plate #:</span>{' '}
                    <strong>{activeReport.vehicle.registrationNumber}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#8A7090' }}>VIN:</span>{' '}
                    <strong>{activeReport.vehicle.vin || 'FIN-VIN-VERIFIED'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#8A7090' }}>Classification:</span>{' '}
                    <strong>Fleet Active</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#8A7090' }}>Detected Color:</span>
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: activeReport.detectedColor.hexCode,
                        border: '1px solid #E0D8E3',
                      }}
                    />
                    <strong>{activeReport.detectedColor.colorName}</strong>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-around',
                  borderLeft: '1px solid #E0D8E3',
                  paddingLeft: '16px',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#057A55', lineHeight: 1 }}>
                    {activeReport.overallScore}%
                  </div>
                  <div style={{ fontSize: '11px', color: '#8A7090', fontWeight: 700, marginTop: '4px' }}>
                    Body Integrity
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#B45309', lineHeight: 1 }}>
                    {activeReport.scratchesCount}
                  </div>
                  <div style={{ fontSize: '11px', color: '#8A7090', fontWeight: 700, marginTop: '4px' }}>
                    Scratches
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#B91C1C', lineHeight: 1 }}>
                    {activeReport.dentsCount}
                  </div>
                  <div style={{ fontSize: '11px', color: '#8A7090', fontWeight: 700, marginTop: '4px' }}>
                    Dents
                  </div>
                </div>
              </div>
            </div>

            {/* AI Summary Callout */}
            <div
              style={{
                backgroundColor: '#FAF6FC',
                borderLeft: '4px solid #6C1E84',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#1E0432',
                marginBottom: '28px',
                lineHeight: 1.5,
              }}
            >
              <strong>AI Neural Engine Assessment:</strong> {activeReport.summary}
            </div>

            {/* Return Damage Comparison Delta Section (If Comparison Mode) */}
            {isComparison && comparisonReport && (
              <div style={{ marginBottom: '28px' }}>
                <h4
                  style={{
                    fontSize: '14px',
                    fontWeight: 800,
                    color: '#1E0426',
                    textTransform: 'uppercase',
                    marginBottom: '12px',
                    letterSpacing: '0.5px',
                  }}
                >
                  Return Damage Comparison & Liability Settlement
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                  <div
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      backgroundColor: '#F0FDF4',
                      border: '1px solid #BBF7D0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontWeight: 700, fontSize: '13px' }}>
                      <CheckCircle2 size={16} /> Pre-Existing Baseline Damage (Renter Not Liable)
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#14532D' }}>
                      {comparisonReport.preExistingDamages.length} incident(s) cataloged at pickup checkout. Customer liability: <strong>PKR 0</strong>.
                    </p>
                  </div>

                  <div
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      backgroundColor: comparisonReport.newDamages.length > 0 ? '#FEF2F2' : '#F0FDF4',
                      border: comparisonReport.newDamages.length > 0 ? '1px solid #FECACA' : '1px solid #BBF7D0',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: comparisonReport.newDamages.length > 0 ? '#991B1B' : '#166534',
                        fontWeight: 700,
                        fontSize: '13px',
                      }}
                    >
                      <AlertTriangle size={16} /> Newly Detected Return Incidents
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: comparisonReport.newDamages.length > 0 ? '#7F1D1D' : '#14532D' }}>
                      {comparisonReport.newDamages.length} new damage incident(s) detected. Total assessed charges:{' '}
                      <strong>PKR {comparisonReport.totalProposedCharges.toLocaleString()}</strong>.
                    </p>
                  </div>
                </div>

                {/* Financial Deposit Breakdown Table */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #EFEAEF',
                    borderRadius: '10px',
                    padding: '14px 18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    fontSize: '13px',
                  }}
                >
                  <div>
                    <span style={{ color: '#8A7090' }}>Original Security Deposit:</span>{' '}
                    <strong style={{ color: '#1E0432' }}>PKR {comparisonReport.securityDeposit.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#8A7090' }}>Damage Deduction:</span>{' '}
                    <strong style={{ color: '#B91C1C' }}>
                      - PKR {comparisonReport.totalProposedCharges.toLocaleString()}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#8A7090' }}>Net Deposit Refund Authorized:</span>{' '}
                    <strong style={{ color: '#057A55', fontSize: '15px' }}>
                      PKR {comparisonReport.netRefundAmount.toLocaleString()}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Detailed Itemized Findings Table */}
            <div style={{ marginBottom: '28px' }}>
              <h4
                style={{
                  fontSize: '14px',
                  fontWeight: 800,
                  color: '#1E0426',
                  textTransform: 'uppercase',
                  marginBottom: '12px',
                  letterSpacing: '0.5px',
                }}
              >
                Itemized Damage Schedule & Bounding Bounding Box Coordinates
              </h4>

              {activeReport.findings.length === 0 ? (
                <div
                  style={{
                    padding: '16px',
                    textAlign: 'center',
                    backgroundColor: '#F0FDF4',
                    color: '#15803D',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                >
                  ✓ Pristine vehicle condition: 0 surface scratches, dents, or paint abrasions cataloged.
                </div>
              ) : (
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '12px',
                    textAlign: 'left',
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: '#FAF6FC', borderBottom: '2px solid #E0D8E3', color: '#1E0432' }}>
                      <th style={{ padding: '10px 12px' }}>#</th>
                      <th style={{ padding: '10px 12px' }}>Damage Classification</th>
                      <th style={{ padding: '10px 12px' }}>Location on Vehicle</th>
                      <th style={{ padding: '10px 12px' }}>Severity</th>
                      <th style={{ padding: '10px 12px' }}>AI Confidence</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Repair Estimate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeReport.findings.map((finding, idx) => (
                      <tr key={finding.id} style={{ borderBottom: '1px solid #EFEAEF' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700 }}>{idx + 1}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{finding.damageType}</td>
                        <td style={{ padding: '10px 12px', color: '#4A315A' }}>{finding.location}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            style={{
                              backgroundColor: finding.severity === 'LOW' ? '#FEF3C7' : '#FEE2E2',
                              color: finding.severity === 'LOW' ? '#92400E' : '#991B1B',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                            }}
                          >
                            {finding.severity}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{finding.confidence}%</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#1E0426' }}>
                          PKR {finding.estimatedRepairCost.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Inspection Photos Multi-Angle Evidence Grid */}
            <div style={{ marginBottom: '32px' }}>
              <h4
                style={{
                  fontSize: '14px',
                  fontWeight: 800,
                  color: '#1E0426',
                  textTransform: 'uppercase',
                  marginBottom: '12px',
                  letterSpacing: '0.5px',
                }}
              >
                Multi-Angle High-Resolution Visual Evidence Matrix
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {activeReport.photos.slice(0, 4).map((p, i) => (
                  <div
                    key={i}
                    style={{
                      borderRadius: '10px',
                      overflow: 'hidden',
                      border: '1px solid #E0D8E3',
                      backgroundColor: '#1E0432',
                    }}
                  >
                    <img
                      src={p.imageUrl}
                      alt={p.view}
                      style={{ width: '100%', height: '110px', objectFit: 'cover', display: 'block' }}
                    />
                    <div
                      style={{
                        padding: '6px 8px',
                        fontSize: '10px',
                        backgroundColor: '#FAF7FA',
                        fontWeight: 700,
                        color: '#4A315A',
                        textAlign: 'center',
                      }}
                    >
                      {p.view.replace('_', ' ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Legal Signatures & Cryptographic Stamp Footer */}
            <div
              style={{
                borderTop: '2px solid #EFEAEF',
                paddingTop: '24px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '24px',
                alignItems: 'flex-end',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <ShieldCheck size={20} color="#057A55" />
                  <strong style={{ fontSize: '13px', color: '#1E0432' }}>Digital Tamper-Proof Seal</strong>
                </div>
                <p style={{ margin: 0, fontSize: '11px', color: '#4A315A', lineHeight: 1.45 }}>
                  This certificate was computed and digitally signed by Finovo AI Neural Engine v3.8. All timestamps,
                  color diagnostics, and bounding box coordinates are immutable and cryptographically bound to the
                  rental agreement.
                </p>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#8A7090', marginBottom: '4px' }}>Fleet Inspector Sign-off:</div>
                <div
                  style={{
                    borderBottom: '1px solid #D4C8DA',
                    height: '36px',
                    fontFamily: 'cursive',
                    fontSize: '16px',
                    color: '#4A1270',
                    display: 'flex',
                    alignItems: 'flex-end',
                  }}
                >
                  Finovo Quality Assured
                </div>
                <div style={{ fontSize: '10px', color: '#8A7090', marginTop: '2px' }}>Authorized Staff Signature</div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#8A7090', marginBottom: '4px' }}>Customer Acknowledgment:</div>
                <div
                  style={{
                    borderBottom: '1px solid #D4C8DA',
                    height: '36px',
                    fontFamily: 'cursive',
                    fontSize: '16px',
                    color: '#4A1270',
                    display: 'flex',
                    alignItems: 'flex-end',
                  }}
                >
                  Verified & Accepted Digitally
                </div>
                <div style={{ fontSize: '10px', color: '#8A7090', marginTop: '2px' }}>Customer / Renter Signature</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .pdf-modal-overlay,
          .printable-certificate,
          .printable-certificate * {
            visibility: visible;
          }
          .pdf-modal-overlay {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            padding: 0 !important;
            background: #FFFFFF !important;
          }
          .no-print {
            display: none !important;
          }
          .printable-certificate {
            border: none !important;
            box-shadow: none !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 10mm !important;
          }
        }
      `}</style>
    </div>
  );
}
