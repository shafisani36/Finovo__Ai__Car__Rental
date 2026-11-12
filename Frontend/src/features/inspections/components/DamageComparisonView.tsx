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

interface DamageComparisonViewProps {
  comparison: DamageComparison;
  onChange?: (next: DamageComparison) => void;
  /** Staff can waive / restore proposed fines before the return is completed. */
  editable?: boolean;
}

/** Pickup vs return, angle by angle, with the resulting fines. */
export function DamageComparisonView({ comparison, onChange, editable }: DamageComparisonViewProps) {
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
      setError(err instanceof Error ? err.message : 'Could not update the charge');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="insp-report printable-document">
      <header className="insp-report-header">
        <div>
          <p className="insp-eyebrow">Pickup vs return comparison · Booking #{comparison.bookingNumber}</p>
          <h2>{isClean ? 'Vehicle returned in the same condition' : 'New damage found at return'}</h2>
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
          <span>{isClean ? 'Match' : `${comparison.newDamageCount} new`}</span>
        </div>
      </header>

      <section className="insp-stats">
        <div>
          <strong>{pickup?.overallScore ?? '—'}%</strong>
          <span>Condition at pickup</span>
        </div>
        <div>
          <strong>{ret?.overallScore ?? '—'}%</strong>
          <span>Condition at return</span>
        </div>
        <div>
          <strong>{comparison.preExistingCount}</strong>
          <span>Pre-existing items</span>
        </div>
        <div>
          <strong>{comparison.inconclusiveCount}</strong>
          <span>Need staff review</span>
        </div>
      </section>

      <section className="insp-compare-rows">
        {INSPECTION_VIEWS.map((view) => {
          const pickupPhoto = pickup?.photos.find((p) => p.view === view);
          const returnPhoto = ret?.photos.find((p) => p.view === view);
          if (!pickupPhoto && !returnPhoto) return null;
          return (
            <div key={view} className="insp-compare-row">
              <h4>{VIEW_LABELS[view]}</h4>
              <div className="insp-compare-pair">
                <div>
                  <p className="insp-small insp-muted">Pickup</p>
                  {pickupPhoto ? (
                    <AnnotatedPhoto
                      photo={pickupPhoto}
                      findings={(pickup?.findings || []).filter((f) => f.view === view)}
                      numberOf={pickupNumber}
                    />
                  ) : (
                    <p className="insp-muted">No pickup photo</p>
                  )}
                </div>
                <div>
                  <p className="insp-small insp-muted">Return</p>
                  {returnPhoto ? (
                    <AnnotatedPhoto
                      photo={returnPhoto}
                      findings={(ret?.findings || []).filter((f) => f.view === view)}
                      numberOf={returnNumber}
                    />
                  ) : (
                    <p className="insp-muted">No return photo</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {ret && ret.findings.length > 0 && (
        <section>
          <h3 className="insp-section-title">Return findings</h3>
          <div className="insp-table-wrap">
            <table className="insp-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Angle</th>
                  <th>Part</th>
                  <th>Damage</th>
                  <th>Status</th>
                  <th>AI confidence</th>
                </tr>
              </thead>
              <tbody>
                {ret.findings.map((f, i) => (
                  <tr key={f.id}>
                    <td>{i + 1}</td>
                    <td>{VIEW_LABELS[f.view]}</td>
                    <td>{f.part}</td>
                    <td>
                      {f.damageType} ({f.severity.toLowerCase()})
                    </td>
                    <td>{f.classification ? CLASSIFICATION_LABEL[f.classification] : '—'}</td>
                    <td>{f.confidence}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h3 className="insp-section-title">Damage fines</h3>
        {comparison.charges.length === 0 ? (
          <p className="insp-muted">No fines: nothing new was damaged during this rental.</p>
        ) : (
          <div className="insp-table-wrap">
            <table className="insp-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Amount</th>
                  <th>Status</th>
                  {editable && <th className="no-print">Action</th>}
                </tr>
              </thead>
              <tbody>
                {comparison.charges.map((c) => (
                  <tr key={c.id} className={c.status === 'REJECTED' ? 'insp-row-waived' : ''}>
                    <td>{c.description}</td>
                    <td>{formatMoney(c.proposedAmount, c.currency)}</td>
                    <td>{c.status === 'REJECTED' ? 'Waived' : c.status === 'SETTLED' ? 'Charged' : 'To be charged'}</td>
                    {editable && (
                      <td className="no-print">
                        {c.status === 'REJECTED' ? (
                          <button
                            type="button"
                            className="insp-btn-link"
                            disabled={busyId === c.id}
                            onClick={() => review(c.id, 'APPROVED')}
                          >
                            <RotateCcw size={14} /> Restore
                          </button>
                        ) : c.status !== 'SETTLED' ? (
                          <button
                            type="button"
                            className="insp-btn-link"
                            disabled={busyId === c.id}
                            onClick={() => review(c.id, 'REJECTED')}
                          >
                            <Ban size={14} /> Waive
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
                    <strong>Total damage fine</strong>
                  </td>
                  <td colSpan={editable ? 3 : 2}>
                    <strong>{formatMoney(comparison.totalActiveCharges, currency)}</strong>
                    {comparison.depositAmount > 0 && (
                      <span className="insp-muted insp-small">
                        {' '}
                        · security deposit {formatMoney(comparison.depositAmount, currency)}
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
