import { Printer } from 'lucide-react';
import type {
  InspectionFinding,
  InspectionPhoto,
  InspectionReport,
} from '../api/inspectionApi';
import { CLASSIFICATION_LABEL, VIEW_LABELS } from './inspectionHelpers';
import { formatMoney } from '../../../utils/carImageHelper';
import './inspection.css';

const SEVERITY_LABEL = { LOW: 'Minor', MEDIUM: 'Moderate', HIGH: 'Severe' } as const;

/** Photo with numbered damage boxes drawn on top (box coordinates are 0..1 of the photo). */
export function AnnotatedPhoto({
  photo,
  findings,
  numberOf,
}: {
  photo: InspectionPhoto;
  findings: InspectionFinding[];
  numberOf: (finding: InspectionFinding) => number;
}) {
  return (
    <figure className="insp-photo">
      <div className="insp-photo-frame">
        <img src={photo.imageUrl} alt={`${VIEW_LABELS[photo.view]} inspection photo`} loading="lazy" />
        {findings.map((f) => (
          <div
            key={f.id}
            className={`insp-box insp-box-${f.classification === 'CONFIRMED_NEW_DAMAGE' || f.classification === 'PRE_EXISTING_WORSENED' ? 'new' : 'old'}`}
            style={{
              left: `${f.box.x * 100}%`,
              top: `${f.box.y * 100}%`,
              width: `${f.box.width * 100}%`,
              height: `${f.box.height * 100}%`,
            }}
            title={`${f.damageType} - ${f.part}`}
          >
            <span>{numberOf(f)}</span>
          </div>
        ))}
      </div>
      <figcaption>
        {VIEW_LABELS[photo.view]}
        {findings.length === 0 ? ' - no damage' : ` - ${findings.length} item(s)`}
      </figcaption>
    </figure>
  );
}

interface InspectionReportViewProps {
  report: InspectionReport;
  currency?: string;
  /** Hide the print button when the report is embedded in another printable document. */
  hidePrint?: boolean;
}

/** Full inspection report: condition %, annotated photos and the damage table. Prints as a monochrome PDF. */
export function InspectionReportView({ report, currency, hidePrint }: InspectionReportViewProps) {
  const numberOf = (finding: InspectionFinding) => report.findings.findIndex((f) => f.id === finding.id) + 1;
  const reportCurrency = currency || report.rental?.booking?.currency || 'PKR';
  const title =
    report.type === 'PICKUP' ? 'Pickup Inspection Report' : report.type === 'RETURN' ? 'Return Inspection Report' : 'Inspection Report';

  return (
    <article className="insp-report printable-document">
      <header className="insp-report-header">
        <div>
          <p className="insp-eyebrow">Finovo AI vehicle inspection</p>
          <h2>{title}</h2>
          {report.vehicle && (
            <p className="insp-muted">
              {report.vehicle.year} {report.vehicle.brand} {report.vehicle.model} · {report.vehicle.registrationNumber}
              {report.vehicle.color ? ` · ${report.vehicle.color}` : ''}
            </p>
          )}
          <p className="insp-muted">
            {new Date(report.createdAt).toLocaleString()}
            {report.performedBy ? ` · Inspector: ${report.performedBy.fullName}` : ''}
            {report.rental?.booking ? ` · Booking #${report.rental.booking.bookingNumber}` : ''}
          </p>
        </div>
        <div className="insp-score" aria-label={`Condition ${report.overallScore} percent`}>
          <strong>{report.overallScore}%</strong>
          <span>Condition · {report.conditionGrade.toLowerCase()}</span>
        </div>
      </header>

      {report.summary && <p className="insp-summary">{report.summary}</p>}

      <section className="insp-stats">
        <div>
          <strong>{report.totals.findings}</strong>
          <span>Damage items</span>
        </div>
        <div>
          <strong>{report.totals.scratches}</strong>
          <span>Scratches</span>
        </div>
        <div>
          <strong>{report.totals.dents}</strong>
          <span>Dents</span>
        </div>
        <div>
          <strong>{report.coverageScore ?? 0}%</strong>
          <span>Angle coverage</span>
        </div>
      </section>

      <section className="insp-photo-grid">
        {report.photos.map((photo) => (
          <AnnotatedPhoto
            key={photo.id}
            photo={photo}
            findings={report.findings.filter((f) => f.view === photo.view)}
            numberOf={numberOf}
          />
        ))}
      </section>

      <section>
        <h3 className="insp-section-title">Damage details</h3>
        {report.findings.length === 0 ? (
          <p className="insp-muted">No visible damage was detected on any photographed angle.</p>
        ) : (
          <div className="insp-table-wrap">
            <table className="insp-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Angle</th>
                  <th>Part</th>
                  <th>Damage</th>
                  <th>Severity</th>
                  {report.type === 'RETURN' && <th>Status</th>}
                  <th>AI confidence</th>
                  <th>Est. repair</th>
                </tr>
              </thead>
              <tbody>
                {report.findings.map((f, i) => (
                  <tr key={f.id}>
                    <td>{i + 1}</td>
                    <td>{VIEW_LABELS[f.view]}</td>
                    <td>
                      {f.part}
                      {f.description && <div className="insp-muted insp-small">{f.description}</div>}
                    </td>
                    <td>{f.damageType}</td>
                    <td>{SEVERITY_LABEL[f.severity]}</td>
                    {report.type === 'RETURN' && (
                      <td>{f.classification ? CLASSIFICATION_LABEL[f.classification] : '—'}</td>
                    )}
                    <td>{f.confidence}%</td>
                    <td>{formatMoney(f.estimatedRepairCost, reportCurrency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="insp-report-footer">
        <span>Report ID: {report.id}</span>
        <span>
          Damage detected by an AI vision model and reviewed by Finovo staff. Repair estimates follow the Finovo
          repair cost table.
        </span>
      </footer>

      {!hidePrint && (
        <div className="no-print insp-report-actions">
          <button type="button" className="insp-btn-secondary" onClick={() => window.print()}>
            <Printer size={16} /> Print / Save as PDF
          </button>
        </div>
      )}
    </article>
  );
}
