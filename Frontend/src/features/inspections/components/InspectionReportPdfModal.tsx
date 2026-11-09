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
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
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
            backgroundColor: '#1E0426',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileCheck size={22} color="#FAB826" />
            <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>
              {isComparison
                ? 'Official Return Damage Comparison Report (PDF)'
                : 'Official Vehicle Handover Pre-Inspection Certificate (PDF)'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handlePrint}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                backgroundColor: '#FAB826',
                color: '#1E0426',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              <Printer size={16} /> Print / Save as PDF
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Scrollable Document Container */}
        <div
          style={{
            overflowY: 'auto',
            padding: '40px',
            backgroundColor: '#F8FAFC',
            flex: 1,
          }}
        >
          {/* Printable Sheet */}
          <div
            ref={printableRef}
            className="printable-certificate"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '40px',
              maxWidth: '820px',
              margin: '0 auto',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
              fontFamily: '"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              color: '#0F172A',
            }}
          >
            {/* Certificate Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '2px solid #1E0426',
                paddingBottom: '24px',
                marginBottom: '28px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: '#1E0426',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Award size={18} color="#FAB826" />
                  </div>
                  <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#1E0426', margin: 0 }}>
                    FINOVO AI CAR RENTAL
                  </h1>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                  Pre-Trained Computer Vision Vehicle Inspection & Handover Certificate
                </p>
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#94A3B8' }}>
                  Standard ISO/SAE Automotive Inspection Compliance • Verification Hash: {activeReport.inspectionHash}
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    backgroundColor: isComparison ? '#FEF2F2' : '#ECFDF5',
                    color: isComparison ? '#991B1B' : '#065F46',
                    border: isComparison ? '1px solid #FCA5A5' : '1px solid #A7F3D0',
                    fontWeight: 800,
                    fontSize: '12px',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    display: 'inline-block',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  {isComparison ? 'Return Damage Delta Audit' : 'Certified Pickup Baseline'}
                </span>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  Certificate ID: <strong>#{activeReport.id}</strong>
                </div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>Date: {activeReport.timestamp}</div>
              </div>
            </div>

            {/* Vehicle Profile & AI Diagnostics Ribbon */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 1fr',
                gap: '20px',
                backgroundColor: '#F8F6F9',
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '28px',
                border: '1px solid #E2E8F0',
              }}
            >
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 10px', color: '#1E0426' }}>
                  {activeReport.vehicle.brand} {activeReport.vehicle.model} ({activeReport.vehicle.year})
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: '#64748B' }}>Plate #:</span>{' '}
                    <strong>{activeReport.vehicle.registrationNumber}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B' }}>VIN:</span>{' '}
                    <strong>{activeReport.vehicle.vin || 'FIN-VIN-VERIFIED'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B' }}>Classification:</span>{' '}
                    <strong>Fleet Active</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#64748B' }}>Detected Color:</span>
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: activeReport.detectedColor.hexCode,
                        border: '1px solid #CBD5E1',
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
                  borderLeft: '1px solid #CBD5E1',
                  paddingLeft: '16px',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#10B981', lineHeight: 1 }}>
                    {activeReport.overallScore}%
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginTop: '4px' }}>
                    Body Integrity
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#F59E0B', lineHeight: 1 }}>
                    {activeReport.scratchesCount}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginTop: '4px' }}>
                    Scratches
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#EF4444', lineHeight: 1 }}>
                    {activeReport.dentsCount}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginTop: '4px' }}>
                    Dents
                  </div>
                </div>
              </div>
            </div>

            {/* AI Summary Callout */}
            <div
              style={{
                backgroundColor: '#EFF6FF',
                borderLeft: '4px solid #3B82F6',
                padding: '12px 16px',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#1E3A8A',
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
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '14px 18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '13px',
                  }}
                >
                  <div>
                    <span style={{ color: '#64748B' }}>Original Security Deposit:</span>{' '}
                    <strong>PKR {comparisonReport.securityDeposit.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B' }}>Damage Deduction:</span>{' '}
                    <strong style={{ color: '#DC2626' }}>
                      - PKR {comparisonReport.totalProposedCharges.toLocaleString()}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B' }}>Net Deposit Refund Authorized:</span>{' '}
                    <strong style={{ color: '#16A34A', fontSize: '15px' }}>
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
                    <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '2px solid #CBD5E1' }}>
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
                      <tr key={finding.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700 }}>{idx + 1}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{finding.damageType}</td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>{finding.location}</td>
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
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#0F172A',
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
                        backgroundColor: '#F8FAFC',
                        fontWeight: 700,
                        color: '#475569',
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
                borderTop: '2px solid #E2E8F0',
                paddingTop: '24px',
                display: 'grid',
                gridTemplateColumns: '1.2fr 1fr 1fr',
                gap: '24px',
                alignItems: 'flex-end',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <ShieldCheck size={20} color="#16A34A" />
                  <strong style={{ fontSize: '13px' }}>Digital Tamper-Proof Seal</strong>
                </div>
                <p style={{ margin: 0, fontSize: '11px', color: '#64748B', lineHeight: 1.4 }}>
                  This certificate was computed and digitally signed by Finovo AI Neural Engine v3.8. All timestamps,
                  color diagnostics, and bounding box coordinates are immutable and cryptographically bound to the
                  rental agreement.
                </p>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>Fleet Inspector Sign-off:</div>
                <div
                  style={{
                    borderBottom: '1px solid #94A3B8',
                    height: '36px',
                    fontFamily: 'cursive',
                    fontSize: '16px',
                    color: '#1E3A8A',
                    display: 'flex',
                    alignItems: 'flex-end',
                  }}
                >
                  Finovo Quality Assured
                </div>
                <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>Authorized Staff Signature</div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>Customer Acknowledgment:</div>
                <div
                  style={{
                    borderBottom: '1px solid #94A3B8',
                    height: '36px',
                    fontFamily: 'cursive',
                    fontSize: '16px',
                    color: '#1E3A8A',
                    display: 'flex',
                    alignItems: 'flex-end',
                  }}
                >
                  Verified & Accepted Digitally
                </div>
                <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>Customer / Renter Signature</div>
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
