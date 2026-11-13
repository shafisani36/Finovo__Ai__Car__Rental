import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, ScanLine } from 'lucide-react';
import {
  inspectionApi,
  type DamageComparison,
  type InspectionReport,
} from '../../inspections/api/inspectionApi';
import { InspectionReportView } from '../../inspections/components/InspectionReportView';
import { DamageComparisonView } from '../../inspections/components/DamageComparisonView';
import './CustomerPortal.css';
import { useTranslation } from 'react-i18next';

/**
 * Customer view of the AI condition reports of a booking: the pickup report, and after return the
 * pickup-vs-return comparison with any damage fine. Read-only: inspections are performed by Finovo staff.
 */
export function CustomerInspectionPage() {
  const { t } = useTranslation();
  const { bookingId } = useParams<{ bookingId: string }>();
  const [bookingNumber, setBookingNumber] = useState('');
  const [inspections, setInspections] = useState<InspectionReport[]>([]);
  const [comparison, setComparison] = useState<DamageComparison | null>(null);
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
        </div>
      </div>

      {error ? (
        <div className="cp-card cp-empty-state">
          <AlertTriangle size={40} color="var(--cp-danger)" />
          <p className="cp-empty-desc">{error}</p>
        </div>
      ) : comparison ? (
        <DamageComparisonView comparison={comparison} />
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
    </div>
  );
}
