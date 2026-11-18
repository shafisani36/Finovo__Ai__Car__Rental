import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, ScanLine, ShieldCheck } from 'lucide-react';
import {
  inspectionApi,
  type CustomerScanStage,
  type DamageComparison,
  type InspectionReport,
} from '../../inspections/api/inspectionApi';
import { InspectionReportView } from '../../inspections/components/InspectionReportView';
import { DamageComparisonView } from '../../inspections/components/DamageComparisonView';
import './CustomerPortal.css';
import { useTranslation } from 'react-i18next';

/**
 * Customer view of the AI condition reports of a booking: the pickup report, and after return the
 * pickup-vs-return comparison with any damage fine, plus the checks the customer ran on the car themselves.
 */
export function CustomerInspectionPage() {
  const { t } = useTranslation();
  const { bookingId } = useParams<{ bookingId: string }>();
  const [bookingNumber, setBookingNumber] = useState('');
  const [inspections, setInspections] = useState<InspectionReport[]>([]);
  const [comparison, setComparison] = useState<DamageComparison | null>(null);
  const [customerScans, setCustomerScans] = useState<InspectionReport[]>([]);
  const [selfScan, setSelfScan] = useState<Record<CustomerScanStage, boolean>>({ PICKUP: false, RETURN: false });
  const [openScanId, setOpenScanId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    let active = true;
    (async () => {
      try {
        setIsLoading(true);
        const res = await inspectionApi.getForBooking(bookingId);
        if (!active) return;
        setBookingNumber(res.bookingNumber);
        setInspections(res.inspections);
        setComparison(res.comparison);
        setCustomerScans(res.customerScans);
        setSelfScan(res.selfScan);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : t('portalPages.inspection.errLoad'));
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [bookingId]);

  const pickup = inspections.find((i) => i.type === 'PICKUP');

  if (isLoading) {
    return (
      <div className="cp-page-container">
        <div className="cp-card cp-skeleton" style={{ height: '400px' }} />
      </div>
    );
  }

  return (
    <div className="cp-page-container">
      <div className="cp-page-header">
        <div>
          <h1 className="cp-page-title">{t('portalPages.inspection.title')}</h1>
          <p className="cp-page-subtitle">
            {bookingNumber ? `${t('portalPages.inspection.bookingNumber', { number: bookingNumber })} ` : ''}
            {t('portalPages.inspection.subtitle')}
          </p>
        </div>
        <div className="cp-header-actions">
          <Link to={`/customer/bookings/${bookingId}`} className="cp-btn-outline">
            <ChevronLeft size={16} /> {t('portalPages.inspection.back')}
          </Link>
          {(selfScan.PICKUP || selfScan.RETURN) && (
            <Link to={`/customer/bookings/${bookingId}/self-check`} className="cp-btn-primary">
              <ScanLine size={16} /> {t('portalPages.selfCheck.cta')}
            </Link>
          )}
        </div>
      </div>

      {error ? (
        <div className="cp-card cp-empty-state">
          <AlertTriangle size={40} color="var(--cp-danger)" />
          <p className="cp-empty-desc">{error}</p>
        </div>
      ) : comparison ? (
        <DamageComparisonView comparison={comparison} onChange={setComparison} canDispute />
      ) : pickup ? (
        <InspectionReportView report={pickup} />
      ) : (
        <div className="cp-card cp-empty-state">
          <ScanLine size={40} color="var(--cp-text-muted)" />
          <h2 className="cp-empty-title">{t('portalPages.inspection.emptyTitle')}</h2>
          <p className="cp-empty-desc">
            {t('portalPages.inspection.emptyDesc')}
          </p>
        </div>
      )}

      {customerScans.length > 0 && (
        <div className="cp-card" style={{ marginTop: 20 }}>
          <h2 style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '1.05rem', margin: '0 0 8px' }}>
            <ShieldCheck size={18} /> {t('portalPages.selfCheck.yourChecks')}
          </h2>
          {customerScans.map((scan) => (
            <div key={scan.id} style={{ borderTop: '1px solid var(--cp-border)', padding: '12px 0' }}>
              <button
                type="button"
                className="cp-btn-outline"
                onClick={() => setOpenScanId(openScanId === scan.id ? null : scan.id)}
              >
                {t(`portalPages.selfCheck.stage${scan.customerStage}`)} · {new Date(scan.createdAt).toLocaleString()} ·{' '}
                {scan.scoreOutOf10 === null
                  ? t('portalPages.selfCheck.photosOnly')
                  : t('portalPages.selfCheck.score', { score: scan.scoreOutOf10 ?? Math.round(scan.overallScore) / 10 })}
              </button>
              {openScanId === scan.id && (
                <div style={{ marginTop: 12 }}>
                  <InspectionReportView report={scan} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
