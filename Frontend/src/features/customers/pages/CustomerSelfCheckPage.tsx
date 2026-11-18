import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ChevronLeft, ScanLine, ShieldCheck } from 'lucide-react';
import {
  inspectionApi,
  REQUIRED_VIEWS,
  type CustomerScanStage,
  type InspectionReport,
} from '../../inspections/api/inspectionApi';
import { VehiclePhotoCapture } from '../../inspections/components/VehiclePhotoCapture';
import { InspectionReportView } from '../../inspections/components/InspectionReportView';
import { toAnalyzePhotos, type CapturedPhotos } from '../../inspections/components/inspectionHelpers';
import './CustomerPortal.css';

const STAGES: CustomerScanStage[] = ['PICKUP', 'RETURN'];

/**
 * The customer photographs their rental car with their own phone and the same AI checks it: right after
 * receiving the car, and again before returning it. The report is the customer's own evidence.
 */
export function CustomerSelfCheckPage() {
  const { t } = useTranslation();
  const { bookingId } = useParams<{ bookingId: string }>();
  const [params] = useSearchParams();
  const [allowed, setAllowed] = useState<Record<CustomerScanStage, boolean> | null>(null);
  const [stage, setStage] = useState<CustomerScanStage | null>(null);
  const [photos, setPhotos] = useState<CapturedPhotos>({});
  const [result, setResult] = useState<InspectionReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    let active = true;
    inspectionApi
      .getForBooking(bookingId)
      .then((res) => {
        if (!active) return;
        setAllowed(res.selfScan);
        const wanted = params.get('stage') as CustomerScanStage | null;
        setStage(wanted && res.selfScan[wanted] ? wanted : STAGES.find((s) => res.selfScan[s]) || null);
      })
      .catch((err) => active && setError(err instanceof Error ? err.message : t('portalPages.selfCheck.errLoad')))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [bookingId, params, t]);

  const missing = REQUIRED_VIEWS.filter((v) => !photos[v]).length;

  const runCheck = async () => {
    if (!bookingId || !stage || missing > 0) return;
    setIsScanning(true);
    setError(null);
    try {
      const res = await inspectionApi.customerScan(bookingId, stage, toAnalyzePhotos(photos));
      setResult(res.inspection);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('portalPages.selfCheck.errScan'));
    } finally {
      setIsScanning(false);
    }
  };

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
          <h1 className="cp-page-title">{t('portalPages.selfCheck.title')}</h1>
          <p className="cp-page-subtitle">{t('portalPages.selfCheck.subtitle')}</p>
        </div>
        <div className="cp-header-actions">
          <Link to={`/customer/bookings/${bookingId}/inspection`} className="cp-btn-outline">
            <ChevronLeft size={16} /> {t('portalPages.selfCheck.back')}
          </Link>
        </div>
      </div>

      {result ? (
        <>
          <div className="cp-card" style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <ShieldCheck size={22} color="var(--cp-success)" />
            <span>{t('portalPages.selfCheck.saved')}</span>
          </div>
          <InspectionReportView report={result} />
        </>
      ) : !stage || !allowed ? (
        <div className="cp-card cp-empty-state">
          <ScanLine size={40} color="var(--cp-text-muted)" />
          <h2 className="cp-empty-title">{t('portalPages.selfCheck.closedTitle')}</h2>
          <p className="cp-empty-desc">{error || t('portalPages.selfCheck.closedDesc')}</p>
        </div>
      ) : (
        <div className="cp-card">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {STAGES.map((s) => (
              <button
                key={s}
                type="button"
                disabled={!allowed[s] || isScanning}
                onClick={() => setStage(s)}
                className={stage === s ? 'cp-btn-primary' : 'cp-btn-outline'}
              >
                {t(`portalPages.selfCheck.stage${s}`)}
              </button>
            ))}
          </div>
          <p className="cp-page-subtitle" style={{ marginBottom: 16 }}>
            {t(`portalPages.selfCheck.hint${stage}`)}
          </p>
          <VehiclePhotoCapture value={photos} onChange={setPhotos} disabled={isScanning} />
          {error && (
            <div role="alert" style={{ display: 'flex', gap: 8, color: 'var(--cp-danger)', margin: '16px 0' }}>
              <AlertTriangle size={18} /> {error}
            </div>
          )}
          <button
            type="button"
            className="cp-btn-primary"
            style={{ marginTop: 16 }}
            disabled={missing > 0 || isScanning}
            onClick={runCheck}
          >
            <ScanLine size={16} />
            {isScanning
              ? t('portalPages.selfCheck.scanning')
              : missing > 0
                ? t('portalPages.selfCheck.missing', { count: missing })
                : t('portalPages.selfCheck.run')}
          </button>
        </div>
      )}
    </div>
  );
}
