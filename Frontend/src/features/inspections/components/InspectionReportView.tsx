import { Printer } from 'lucide-react';
import type {
  InspectionFinding,
  InspectionPhoto,
  InspectionReport,
} from '../api/inspectionApi';
import { CLASSIFICATION_LABEL, VIEW_LABELS } from './inspectionHelpers';
import { formatMoney, APP_CURRENCY } from '../../../utils/carImageHelper';
import './inspection.css';
import { useTranslation } from 'react-i18next';


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
  const { t } = useTranslation();
  const viewLabel = t(`inspectionReport.views.${photo.view}`, { defaultValue: VIEW_LABELS[photo.view] });
  return (
    <figure className="insp-photo">
      <div className="insp-photo-frame">
        <img src={photo.imageUrl} alt={t('inspectionReport.photoAlt', { view: viewLabel })} loading="lazy" />
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
        {viewLabel}
        {' - '}
        {findings.length === 0 ? t('inspectionReport.noDamage') : t('inspectionReport.items', { count: findings.length })}
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
  const { t, i18n } = useTranslation();
  const numberOf = (finding: InspectionFinding) => report.findings.findIndex((f) => f.id === finding.id) + 1;
  const reportCurrency = currency || report.rental?.booking?.currency || APP_CURRENCY;
  const title = t(`inspectionReport.titles.${report.type}`, { defaultValue: t('inspectionReport.titles.ROUTINE') });
  const dateTime = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <article className="insp-report printable-document">
      <header className="insp-report-header">
        <div>
          <p className="insp-eyebrow">{t('inspectionReport.eyebrow')}</p>
          <h2>{title}</h2>
          {report.vehicle && (
            <p className="insp-muted">
              {report.vehicle.year} {report.vehicle.brand} {report.vehicle.model} · {report.vehicle.registrationNumber}
              {report.vehicle.color ? ` · ${report.vehicle.color}` : ''}
            </p>
          )}
          <p className="insp-muted">
            {dateTime.format(new Date(report.createdAt))}
            {report.performedBy ? ` · ${t('inspectionReport.inspector', { name: report.performedBy.fullName })}` : ''}
            {report.rental?.booking ? ` · ${t('inspectionReport.booking', { number: report.rental.booking.bookingNumber })}` : ''}
          </p>
        </div>
        <div className="insp-score" aria-label={t('inspectionReport.conditionAria', { score: report.overallScore })}>
          <strong>{report.overallScore}%</strong>
          <span>
            {t('inspectionReport.condition')} ·{' '}
            {t(`inspectionReport.grades.${report.conditionGrade}`, { defaultValue: report.conditionGrade.toLowerCase() })}
          </span>
        </div>
      </header>

      {report.summary && <p className="insp-summary">{report.summary}</p>}

      <section className="insp-stats">
        <div>
          <strong>{report.totals.findings}</strong>
          <span>{t('inspectionReport.damageItems')}</span>
        </div>
        <div>
          <strong>{report.totals.scratches}</strong>
          <span>{t('inspectionReport.scratches')}</span>
        </div>
        <div>
          <strong>{report.totals.dents}</strong>
          <span>{t('inspectionReport.dents')}</span>
        </div>
        <div>
          <strong>{report.coverageScore ?? 0}%</strong>
          <span>{t('inspectionReport.coverage')}</span>
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
        <h3 className="insp-section-title">{t('inspectionReport.details')}</h3>
        {report.findings.length === 0 ? (
          <p className="insp-muted">{t('inspectionReport.noDamageFound')}</p>
        ) : (
          <div className="insp-table-wrap">
            <table className="insp-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t('inspectionReport.angle')}</th>
                  <th>{t('inspectionReport.part')}</th>
                  <th>{t('inspectionReport.damage')}</th>
                  <th>{t('inspectionReport.severity')}</th>
                  {report.type === 'RETURN' && <th>{t('inspectionReport.status')}</th>}
                  <th>{t('inspectionReport.confidence')}</th>
                  <th>{t('inspectionReport.repair')}</th>
                </tr>
              </thead>
              <tbody>
                {report.findings.map((f, i) => (
                  <tr key={f.id}>
                    <td>{i + 1}</td>
                    <td>{t(`inspectionReport.views.${f.view}`, { defaultValue: VIEW_LABELS[f.view] })}</td>
                    <td>
                      {f.part}
                      {f.description && <div className="insp-muted insp-small">{f.description}</div>}
                    </td>
                    <td>{f.damageType}</td>
                    <td>{t(`inspectionReport.severities.${f.severity}`)}</td>
                    {report.type === 'RETURN' && (
                      <td>
                        {f.classification
                          ? t(`inspectionReport.classifications.${f.classification}`, { defaultValue: CLASSIFICATION_LABEL[f.classification] })
                          : '—'}
                      </td>
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
        <span>{t('inspectionReport.reportId', { id: report.id })}</span>
        <span>
          {t('inspectionReport.footer')}
        </span>
      </footer>

      {!hidePrint && (
        <div className="no-print insp-report-actions">
          <button type="button" className="insp-btn-secondary" onClick={() => window.print()}>
            <Printer size={16} /> {t('inspectionReport.print')}
          </button>
        </div>
      )}
    </article>
  );
}
