import { Fragment, useState } from 'react';
import { CheckCircle2, AlertTriangle, Ban, RotateCcw, MessageSquareWarning } from 'lucide-react';
import {
  INSPECTION_VIEWS,
  inspectionApi,
  type DamageCharge,
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
  /** Customer view: lets the customer dispute a fine they disagree with. */
  canDispute?: boolean;
  /** Staff view: lets staff accept or reject a customer's dispute. */
  canResolveDisputes?: boolean;
}

/** Charges a customer may still dispute (the server checks this again). */
const DISPUTABLE_STATUSES: DamageCharge['status'][] = ['PROPOSED', 'EVIDENCE_REVIEW', 'APPROVED', 'CUSTOMER_NOTIFIED', 'SETTLED'];
const MIN_DISPUTE_TEXT = 10;
const MIN_RESPONSE_TEXT = 5;

/** Pickup vs return, angle by angle, with the resulting fines. */
export function DamageComparisonView({
  comparison,
  onChange,
  editable,
  canDispute,
  canResolveDisputes,
}: DamageComparisonViewProps) {
  const { t } = useTranslation();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Inline form under a charge: the customer's dispute reason or the staff answer
  const [openForm, setOpenForm] = useState<{ chargeId: string; mode: 'dispute' | 'resolve' } | null>(null);
  const [formText, setFormText] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  // Time the view was opened, used to hide the dispute button once the dispute window has closed
  const [openedAt] = useState(() => Date.now());
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

  const refresh = async () => {
    const res = await inspectionApi.getComparisonById(comparison.id);
    if (res.comparison) onChange?.(res.comparison);
  };

  const canOpenDispute = (c: DamageCharge) =>
    Boolean(canDispute) &&
    DISPUTABLE_STATUSES.includes(c.status) &&
    !c.disputeResolvedAt &&
    (!c.disputeWindowEndsAt || new Date(c.disputeWindowEndsAt).getTime() > openedAt);

  const startForm = (chargeId: string, mode: 'dispute' | 'resolve') => {
    setOpenForm({ chargeId, mode });
    setFormText('');
    setError(null);
    setNotice(null);
  };

  const submitDispute = async (chargeId: string) => {
    setBusyId(chargeId);
    setError(null);
    try {
      await inspectionApi.openDispute(chargeId, formText.trim());
      setOpenForm(null);
      setNotice(t('inspectionReport.disputeSent'));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('inspectionReport.errDispute'));
    } finally {
      setBusyId(null);
    }
  };

  const submitResolution = async (chargeId: string, decision: 'ACCEPT' | 'REJECT') => {
    setBusyId(chargeId);
    setError(null);
    try {
      await inspectionApi.resolveDispute(chargeId, decision, formText.trim());
      setOpenForm(null);
      setNotice(decision === 'ACCEPT' ? t('inspectionReport.disputeAccepted') : t('inspectionReport.disputeRejected'));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('inspectionReport.errDispute'));
    } finally {
      setBusyId(null);
    }
  };

  const statusLabel = (c: DamageCharge) => {
    if (c.status === 'DISPUTED') return t('inspectionReport.disputed');
    if (c.status === 'REJECTED') return t('inspectionReport.waived');
    if (c.status === 'SETTLED') return t('inspectionReport.charged');
    return t('inspectionReport.toBeCharged');
  };

  const showActions = Boolean(editable || canDispute || canResolveDisputes);
  const columnCount = showActions ? 4 : 3;

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
                  {showActions && <th className="no-print">{t('inspectionReport.action')}</th>}
                </tr>
              </thead>
              <tbody>
                {comparison.charges.map((c) => (
                  <Fragment key={c.id}>
                    <tr className={c.status === 'REJECTED' ? 'insp-row-waived' : ''}>
                      <td>{c.description}</td>
                      <td>{formatMoney(c.proposedAmount, c.currency)}</td>
                      <td>{statusLabel(c)}</td>
                      {showActions && (
                        <td className="no-print">
                          {canResolveDisputes && c.status === 'DISPUTED' ? (
                            <button type="button" className="insp-btn-link" disabled={busyId === c.id} onClick={() => startForm(c.id, 'resolve')}>
                              <MessageSquareWarning size={14} /> {t('inspectionReport.reviewDispute')}
                            </button>
                          ) : editable && c.status === 'REJECTED' && !c.disputeResolvedAt ? (
                            <button type="button" className="insp-btn-link" disabled={busyId === c.id} onClick={() => review(c.id, 'APPROVED')}>
                              <RotateCcw size={14} /> {t('inspectionReport.restore')}
                            </button>
                          ) : editable && c.status !== 'SETTLED' && c.status !== 'REJECTED' && c.status !== 'DISPUTED' ? (
                            <button type="button" className="insp-btn-link" disabled={busyId === c.id} onClick={() => review(c.id, 'REJECTED')}>
                              <Ban size={14} /> {t('inspectionReport.waive')}
                            </button>
                          ) : canOpenDispute(c) ? (
                            <button type="button" className="insp-btn-link" disabled={busyId === c.id} onClick={() => startForm(c.id, 'dispute')}>
                              <MessageSquareWarning size={14} /> {t('inspectionReport.dispute')}
                            </button>
                          ) : null}
                        </td>
                      )}
                    </tr>
                    {(c.disputeReason || c.disputeResponse) && (
                      <tr>
                        <td colSpan={columnCount}>
                          {c.disputeReason && (
                            <div className="insp-small">
                              <strong>{t('inspectionReport.disputeReason')}:</strong> {c.disputeReason}
                            </div>
                          )}
                          {c.disputeResponse && (
                            <div className="insp-small">
                              <strong>{t('inspectionReport.disputeAnswer')}:</strong> {c.disputeResponse}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                    {openForm?.chargeId === c.id && (
                      <tr className="no-print">
                        <td colSpan={columnCount}>
                          <label
                            className="insp-small"
                            htmlFor={`charge-form-${c.id}`}
                            style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}
                          >
                            {openForm.mode === 'dispute' ? t('inspectionReport.disputeLabel') : t('inspectionReport.answerLabel')}
                          </label>
                          <textarea
                            id={`charge-form-${c.id}`}
                            rows={3}
                            maxLength={1000}
                            value={formText}
                            onChange={(e) => setFormText(e.target.value)}
                            style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #d6d0dc', font: 'inherit' }}
                          />
                          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8, flexWrap: 'wrap' }}>
                            <button type="button" className="insp-btn-link" onClick={() => setOpenForm(null)}>
                              {t('inspectionReport.cancel')}
                            </button>
                            {openForm.mode === 'dispute' ? (
                              <button
                                type="button"
                                className="insp-btn-link"
                                disabled={busyId === c.id || formText.trim().length < MIN_DISPUTE_TEXT}
                                onClick={() => submitDispute(c.id)}
                              >
                                {t('inspectionReport.sendDispute')}
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="insp-btn-link"
                                  disabled={busyId === c.id || formText.trim().length < MIN_RESPONSE_TEXT}
                                  onClick={() => submitResolution(c.id, 'REJECT')}
                                >
                                  {t('inspectionReport.keepCharge')}
                                </button>
                                <button
                                  type="button"
                                  className="insp-btn-link"
                                  disabled={busyId === c.id || formText.trim().length < MIN_RESPONSE_TEXT}
                                  onClick={() => submitResolution(c.id, 'ACCEPT')}
                                >
                                  {t('inspectionReport.removeCharge')}
                                </button>
                              </>
                            )}
                          </div>
                          {openForm.mode === 'dispute' && (
                            <p className="insp-muted insp-small" style={{ margin: '6px 0 0' }}>
                              {t('inspectionReport.disputeHint', { count: MIN_DISPUTE_TEXT })}
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>
                    <strong>{t('inspectionReport.totalFine')}</strong>
                  </td>
                  <td colSpan={columnCount - 1}>
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
        {notice && <p className="insp-muted" role="status">{notice}</p>}
        {error && <p className="insp-capture-error">{error}</p>}
      </section>
    </section>
  );
}
