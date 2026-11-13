import { useState } from 'react';
import { CheckCircle2, AlertTriangle, Ban, RotateCcw } from 'lucide-react';
import {
  INSPECTION_VIEWS,
  inspectionApi,
  type DamageComparison,
  type InspectionFinding,
} from '../api/inspectionApi';
import { AnnotatedPhoto } from './InspectionReportView';
import { CLASSIFICATION_LABEL, VIEW_LABELS } from './inspectionHelpers';
import { formatMoney } from '../../../utils/carImageHelper';
import './inspection.css';
import { useTranslation } from 'react-i18next';

interface DamageComparisonViewProps {
  comparison: DamageComparison;
  onChange?: (next: DamageComparison) => void;
  /** Staff can waive / restore proposed fines before the return is completed. */
  editable?: boolean;
}

/** Pickup vs return, angle by angle, with the resulting fines. */
export function DamageComparisonView({ comparison, onChange, editable }: DamageComparisonViewProps) {
  const { t } = useTranslation();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pickup = comparison.pickupInspection;
  const ret = comparison.returnInspection;
  const currency = comparison.currency;
  const isClean = comparison.newDamageCount === 0 && comparison.totalActiveCharges === 0;

  const pickupNumber = (f: InspectionFinding) => (pickup ? pickup.findings.findIndex((x) => x.id === f.id) + 1 : 0);
  const returnNumber = (f: InspectionFinding) => (ret ? ret.findings.findIndex((x) => x.id === f.id) + 1 : 0);

  const review = async (chargeId: string, decision: 'APPROVED' | 'REJECTED') => {
    setBusyId(chargeId);
    setError(null);
    try {
      const res = await inspectionApi.reviewCharge(chargeId, decision);
      if (res.comparison) onChange?.(res.comparison);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('inspectionReport.errCharge'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="insp-report printable-document">
      <header className="insp-report-header">
        <div>
          <p className="insp-eyebrow">{t('inspectionReport.compareEyebrow', { number: comparison.bookingNumber })}</p>
          <h2>{isClean ? t('inspectionReport.sameCondition') : t('inspectionReport.newDamageFound')}</h2>
          {comparison.vehicle && (
            <p className="insp-muted">
              {comparison.vehicle.year} {comparison.vehicle.brand} {comparison.vehicle.model} ·{' '}
              {comparison.vehicle.registrationNumber}
              {comparison.vehicle.color ? ` · ${comparison.vehicle.color}` : ''}
            </p>
          )}
          {comparison.summary && <p className="insp-muted">{comparison.summary}</p>}
        </div>
        <div className={`insp-verdict ${isClean ? 'ok' : 'bad'}`}>
          {isClean ? <CheckCircle2 size={28} /> : <AlertTriangle size={28} />}
          <span>{isClean ? t('inspectionReport.match') : t('inspectionReport.newCount', { count: comparison.newDamageCount })}</span>
        </div>
      </header>

      <section className="insp-stats">
        <div>
          <strong>{pickup?.overallScore ?? '—'}%</strong>
          <span>{t('inspectionReport.conditionPickup')}</span>
        </div>
        <div>
          <strong>{ret?.overallScore ?? '—'}%</strong>
          <span>{t('inspectionReport.conditionReturn')}</span>
        </div>
        <div>
          <strong>{comparison.preExistingCount}</strong>
          <span>{t('inspectionReport.preExisting')}</span>
        </div>
        <div>
          <strong>{comparison.inconclusiveCount}</strong>
          <span>{t('inspectionReport.needsReview')}</span>
        </div>
      </section>

      <section className="insp-compare-rows">
        {INSPECTION_VIEWS.map((view) => {
          const pickupPhoto = pickup?.photos.find((p) => p.view === view);
          const returnPhoto = ret?.photos.find((p) => p.view === view);
          if (!pickupPhoto && !returnPhoto) return null;
          return (
            <div key={view} className="insp-compare-row">
              <h4>{t(`inspectionReport.views.${view}`, { defaultValue: VIEW_LABELS[view] })}</h4>
              <div className="insp-compare-pair">
                <div>
                  <p className="insp-small insp-muted">{t('inspectionReport.pickup')}</p>
                  {pickupPhoto ? (
                    <AnnotatedPhoto
                      photo={pickupPhoto}
                      findings={(pickup?.findings || []).filter((f) => f.view === view)}
                      numberOf={pickupNumber}
                    />
                  ) : (
                    <p className="insp-muted">{t('inspectionReport.noPickupPhoto')}</p>
                  )}
                </div>
                <div>
                  <p className="insp-small insp-muted">{t('inspectionReport.return')}</p>
                  {returnPhoto ? (
                    <AnnotatedPhoto
                      photo={returnPhoto}
                      findings={(ret?.findings || []).filter((f) => f.view === view)}
                      numberOf={returnNumber}
                    />
                  ) : (
                    <p className="insp-muted">{t('inspectionReport.noReturnPhoto')}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {ret && ret.findings.length > 0 && (
        <section>
          <h3 className="insp-section-title">{t('inspectionReport.returnFindings')}</h3>
          <div className="insp-table-wrap">
            <table className="insp-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t('inspectionReport.angle')}</th>
                  <th>{t('inspectionReport.part')}</th>
                  <th>{t('inspectionReport.damage')}</th>
                  <th>{t('inspectionReport.status')}</th>
                  <th>{t('inspectionReport.confidence')}</th>
                </tr>
              </thead>
              <tbody>
                {ret.findings.map((f, i) => (
                  <tr key={f.id}>
                    <td>{i + 1}</td>
                    <td>{t(`inspectionReport.views.${f.view}`, { defaultValue: VIEW_LABELS[f.view] })}</td>
                    <td>{f.part}</td>
                    <td>
                      {f.damageType} ({t(`inspectionReport.severities.${f.severity}`)})
                    </td>
                    <td>
                      {f.classification
                        ? t(`inspectionReport.classifications.${f.classification}`, { defaultValue: CLASSIFICATION_LABEL[f.classification] })
                        : '—'}
                    </td>
                    <td>{f.confidence}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h3 className="insp-section-title">{t('inspectionReport.fines')}</h3>
        {comparison.charges.length === 0 ? (
          <p className="insp-muted">{t('inspectionReport.noFines')}</p>
        ) : (
          <div className="insp-table-wrap">
            <table className="insp-table">
              <thead>
                <tr>
                  <th>{t('inspectionReport.item')}</th>
                  <th>{t('inspectionReport.amount')}</th>
                  <th>{t('inspectionReport.status')}</th>
                  {editable && <th className="no-print">{t('inspectionReport.action')}</th>}
                </tr>
              </thead>
              <tbody>
                {comparison.charges.map((c) => (
                  <tr key={c.id} className={c.status === 'REJECTED' ? 'insp-row-waived' : ''}>
                    <td>{c.description}</td>
                    <td>{formatMoney(c.proposedAmount, c.currency)}</td>
                    <td>
                      {c.status === 'REJECTED'
                        ? t('inspectionReport.waived')
                        : c.status === 'SETTLED'
                          ? t('inspectionReport.charged')
                          : t('inspectionReport.toBeCharged')}
                    </td>
                    {editable && (
                      <td className="no-print">
                        {c.status === 'REJECTED' ? (
                          <button
                            type="button"
                            className="insp-btn-link"
                            disabled={busyId === c.id}
                            onClick={() => review(c.id, 'APPROVED')}
                          >
                            <RotateCcw size={14} /> {t('inspectionReport.restore')}
                          </button>
                        ) : c.status !== 'SETTLED' ? (
                          <button
                            type="button"
                            className="insp-btn-link"
                            disabled={busyId === c.id}
                            onClick={() => review(c.id, 'REJECTED')}
                          >
                            <Ban size={14} /> {t('inspectionReport.waive')}
                          </button>
                        ) : null}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>
                    <strong>{t('inspectionReport.totalFine')}</strong>
                  </td>
                  <td colSpan={editable ? 3 : 2}>
                    <strong>{formatMoney(comparison.totalActiveCharges, currency)}</strong>
                    {comparison.depositAmount > 0 && (
                      <span className="insp-muted insp-small">
                        {' '}
                        · {t('inspectionReport.depositNote', { amount: formatMoney(comparison.depositAmount, currency) })}
                      </span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        {error && <p className="insp-capture-error">{error}</p>}
      </section>
    </section>
  );
}
