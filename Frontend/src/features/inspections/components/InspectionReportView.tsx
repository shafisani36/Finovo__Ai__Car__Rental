import { useState, type ReactNode } from 'react';
import { Printer } from 'lucide-react';
import type {
  InspectionFinding,
  InspectionPhoto,
  InspectionReport,
} from '../api/inspectionApi';
import { CLASSIFICATION_LABEL, VIEW_LABELS } from './inspectionHelpers';
import { formatMoney, APP_CURRENCY } from '../../../utils/carImageHelper';
import { CarDamageDiagram } from './CarDamageDiagram';
import { PanelChecklist } from './PanelChecklist';
import { PhotoZoom } from './PhotoZoom';
import { REPORT_SECTIONS, SEVERITY_COLOR } from './vehiclePanels';
import './inspection.css';
import { useTranslation } from 'react-i18next';


/** Photo with numbered damage boxes drawn on top (box coordinates are 0..1 of the photo). */
export function AnnotatedPhoto({
  photo,
  findings,
  numberOf,
  onOpen,
  unchecked,
}: {
  photo: InspectionPhoto;
  findings: InspectionFinding[];
  numberOf: (finding: InspectionFinding) => number;
  /** Opens the photo full screen, zoomed into a damage when one is clicked */
  onOpen?: (photo: InspectionPhoto, finding?: InspectionFinding) => void;
  /** Nobody checked this photo for damage (the AI was not available) */
  unchecked?: boolean;
}) {
  const { t } = useTranslation();
  const viewLabel = t(`inspectionReport.views.${photo.view}`, { defaultValue: VIEW_LABELS[photo.view] });
  return (
    <figure className="insp-photo">
      <div className="insp-photo-frame">
        <img
          src={photo.imageUrl}
          alt={t('inspectionReport.photoAlt', { view: viewLabel })}
          loading="lazy"
          onClick={onOpen ? () => onOpen(photo) : undefined}
          style={onOpen ? { cursor: 'zoom-in' } : undefined}
        />
        {/* Damage recorded by staff has no marked area on the photo */}
        {findings.filter((f) => f.box.width > 0 && f.box.height > 0).map((f) => (
          <div
            key={f.id}
            onClick={onOpen ? () => onOpen(photo, f) : undefined}
            className={`insp-box insp-box-${f.classification === 'CONFIRMED_NEW_DAMAGE' || f.classification === 'PRE_EXISTING_WORSENED' ? 'new' : 'old'}`}
            style={{
              left: `${f.box.x * 100}%`,
              top: `${f.box.y * 100}%`,
              width: `${f.box.width * 100}%`,
              height: `${f.box.height * 100}%`,
            }}
            title={`${f.damageType} - ${f.part}`}
          >
            <span>{f.code || numberOf(f)}</span>
          </div>
        ))}
      </div>
      <figcaption>
        {viewLabel}
        {!unchecked && (
          <>
            {' - '}
            {findings.length === 0 ? t('inspectionReport.noDamage') : t('inspectionReport.items', { count: findings.length })}
          </>
        )}
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

/**
 * Car details card. Everything comes from the AI reading of the photos (make, model, colour, plate, odometer,
 * chassis number); only the fleet name and plate are added when the car belongs to the fleet.
 */
function CarDetails({ report }: { report: InspectionReport }) {
  const { t, i18n } = useTranslation();
  const detected = report.detectedVehicle;
  const fleet = report.vehicle;
  const notRead = t('inspectionReport.notRead');

  // Reports made before the AI reading was stored only have the fleet record
  if (!detected) {
    return fleet ? (
      <p className="insp-muted">
        {[`${fleet.year} ${fleet.brand} ${fleet.model}`, fleet.registrationNumber, fleet.color].filter(Boolean).join(' · ')}
      </p>
    ) : null;
  }

  const rows: Array<[string, ReactNode]> = [
    [t('inspectionReport.makeModel'), [detected.make, detected.model].filter(Boolean).join(' ') || t('inspectionReport.unknownVehicle')],
    [t('inspectionReport.modelYears'), detected.year || notRead],
    [t('inspectionReport.bodyType'), detected.bodyType || notRead],
    [
      t('inspectionReport.colour'),
      detected.color ? (
        <span className="insp-colour">
          {detected.colorHex && <span className="insp-colour-dot" style={{ backgroundColor: detected.colorHex }} aria-hidden="true" />}
          {detected.color}
        </span>
      ) : (
        notRead
      ),
    ],
    [t('inspectionReport.numberPlate'), detected.plate || notRead],
    [
      t('inspectionReport.mileage'),
      detected.mileageKm != null ? `${new Intl.NumberFormat(i18n.language).format(detected.mileageKm)} km` : notRead,
    ],
    [t('inspectionReport.chassisNumber'), detected.chassisNumber || notRead],
  ];
  if (fleet) rows.push([t('inspectionReport.fleetVehicleLabel'), `${fleet.brand} ${fleet.model} · ${fleet.registrationNumber}`]);

  return (
    <dl className="insp-car-details">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Full inspection report: condition %, annotated photos and the damage table. Prints as a monochrome PDF. */
export function InspectionReportView({ report, currency, hidePrint }: InspectionReportViewProps) {
  const { t, i18n } = useTranslation();
  const numberOf = (finding: InspectionFinding) => report.findings.findIndex((f) => f.id === finding.id) + 1;
  const reportCurrency = currency || report.rental?.booking?.currency || APP_CURRENCY;
  const title = report.customerStage
    ? t(`inspectionReport.titles.CUSTOMER_${report.customerStage}`)
    : t(`inspectionReport.titles.${report.type}`, { defaultValue: t('inspectionReport.titles.ROUTINE') });
  const dateTime = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' });
  const [zoom, setZoom] = useState<{ photo: InspectionPhoto; finding?: InspectionFinding } | null>(null);
  const openPhoto = (photo: InspectionPhoto, finding?: InspectionFinding) => setZoom({ photo, finding });
  const openFinding = (finding: InspectionFinding) => {
    const photo = report.photos.find((p) => p.view === finding.view);
    if (photo) setZoom({ photo, finding });
  };
  const scoreOutOf10 = report.scoreOutOf10 ?? Math.round(report.overallScore) / 10;
  // A manual inspection has no score until staff have recorded the damage (a customer's own check never gets one)
  const awaitingReview = Boolean(report.manualReview) && report.status === 'CAPTURE_COMPLETE';
  const hasPanels = report.findings.every((f) => Boolean(f.panel));

  return (
    <article className="insp-report printable-document">
      <header className="insp-report-header">
        <div>
          <p className="insp-eyebrow">{t('inspectionReport.eyebrow')}</p>
          <h2>{title}</h2>
          <p className="insp-muted">
            {dateTime.format(new Date(report.createdAt))}
            {report.performedBy ? ` · ${t('inspectionReport.inspector', { name: report.performedBy.fullName })}` : ''}
            {report.rental?.booking ? ` · ${t('inspectionReport.booking', { number: report.rental.booking.bookingNumber })}` : ''}
          </p>
        </div>
        {awaitingReview ? (
          <div className="insp-score">
            <strong>—</strong>
            <span>{t('inspectionReport.manual.awaitingScore')}</span>
          </div>
        ) : (
          <div className="insp-score" aria-label={t('inspectionReport.conditionAria', { score: report.overallScore })}>
            <strong>
              {scoreOutOf10.toFixed(1)}
              <small>/10</small>
            </strong>
            <span>
              {t('inspectionReport.condition')} ·{' '}
              {t(`inspectionReport.grades.${report.conditionGrade}`, { defaultValue: report.conditionGrade.toLowerCase() })}
            </span>
          </div>
        )}
      </header>

      {report.manualReview && (
        <p
          className="insp-summary"
          role={awaitingReview ? 'alert' : undefined}
          style={{ borderInlineStart: `4px solid ${awaitingReview ? '#D97706' : '#2563EB'}` }}
        >
          <strong>
            {report.customerStage
              ? t('inspectionReport.manual.customerSaved')
              : awaitingReview
                ? t('inspectionReport.manual.pendingTitle')
                : t('inspectionReport.manual.doneTitle')}
          </strong>
          {awaitingReview && report.aiUnavailableReason && (
            <>
              <br />
              <span className="insp-muted">{report.aiUnavailableReason}</span>
            </>
          )}
        </p>
      )}

      {/* The notice above already says what happened while nobody has checked the photos */}
      {report.summary && !awaitingReview && <p className="insp-summary">{report.summary}</p>}

      <section>
        <h3 className="insp-section-title">{t('inspectionReport.carDetails')}</h3>
        <CarDetails report={report} />
      </section>

      {report.sectionScores && !awaitingReview && (
        <section className="insp-sections">
          {REPORT_SECTIONS.map((section) => {
            const value = report.sectionScores?.[section];
            return (
              <div key={section} className="insp-section-score">
                <div>
                  <span>{t(`inspectionReport.sections.${section}`)}</span>
                  <strong>{value == null ? t('inspectionReport.notPhotographed') : `${Math.round(value)}%`}</strong>
                </div>
                <div className="insp-bar" aria-hidden="true">
                  <span
                    style={{
                      width: `${value ?? 0}%`,
                      backgroundColor: value == null ? 'transparent' : value >= 90 ? '#16A34A' : value >= 70 ? '#CA8A04' : '#DC2626',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Nobody has checked the photos yet: show no counts, checklist or "no damage" text */}
      {!awaitingReview && (
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
      )}

      {hasPanels && !awaitingReview && (
        <section>
          <h3 className="insp-section-title">{t('inspectionReport.diagramTitle')}</h3>
          <CarDamageDiagram findings={report.findings} onSelect={openFinding} />
        </section>
      )}

      {/* Staff see the photos in the review form instead */}
      {!report.needsStaffReview && (
        <section className="insp-photo-grid">
          {report.photos.map((photo) => (
            <AnnotatedPhoto
              key={photo.id}
              photo={photo}
              findings={report.findings.filter((f) => f.view === photo.view)}
              numberOf={numberOf}
              onOpen={openPhoto}
              unchecked={awaitingReview}
            />
          ))}
        </section>
      )}

      {hasPanels && !awaitingReview && <PanelChecklist findings={report.findings} photos={report.photos} onOpen={openPhoto} />}

      {!awaitingReview && (
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
                    <th>{t('inspectionReport.code')}</th>
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
                      <td>
                        <span className="insp-code" style={{ backgroundColor: SEVERITY_COLOR[f.severity] }}>
                          {f.code}
                        </span>
                      </td>
                      <td>{t(`inspectionReport.views.${f.view}`, { defaultValue: VIEW_LABELS[f.view] })}</td>
                      <td>
                        {f.part}
                        {f.description && <div className="insp-muted insp-small">{f.description}</div>}
                      </td>
                      <td>{t(`inspectionReport.categories.${f.category}`, { defaultValue: f.damageType })}</td>
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
      )}

      <footer className="insp-report-footer">
        <span>{t('inspectionReport.reportId', { id: report.id })}</span>
        <span>
          {t('inspectionReport.footer')}
        </span>
      </footer>

      {zoom && (
        <PhotoZoom
          photo={zoom.photo}
          finding={zoom.finding}
          title={zoom.finding ? t(`inspectionReport.panels.${zoom.finding.panel}`) : title}
          onClose={() => setZoom(null)}
        />
      )}

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
