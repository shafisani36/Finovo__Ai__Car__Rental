import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Image as ImageIcon } from 'lucide-react';
import type { InspectionFinding, InspectionPhoto } from '../api/inspectionApi';
import { REPORT_SECTIONS, SEVERITY_COLOR, VEHICLE_PANELS } from './vehiclePanels';

interface PanelChecklistProps {
  findings: InspectionFinding[];
  photos: InspectionPhoto[];
  /** Opens a photo, zoomed into the damage when one is given */
  onOpen: (photo: InspectionPhoto, finding?: InspectionFinding) => void;
}

/** Every panel of the car with OK or its damage, grouped by report section, each linked to its photo. */
export function PanelChecklist({ findings, photos, onOpen }: PanelChecklistProps) {
  const { t } = useTranslation();
  const [faultsOnly, setFaultsOnly] = useState(false);
  const photoOf = (views: readonly string[]) => views.map((v) => photos.find((p) => p.view === v)).find(Boolean);

  return (
    <section className="insp-checklist">
      <div className="insp-checklist-head">
        <h3 className="insp-section-title">{t('inspectionReport.checklistTitle')}</h3>
        <label className="insp-switch">
          <input type="checkbox" checked={faultsOnly} onChange={(e) => setFaultsOnly(e.target.checked)} />
          <span>{t('inspectionReport.faultsOnly')}</span>
        </label>
      </div>

      {REPORT_SECTIONS.map((section) => {
        const rows = Object.entries(VEHICLE_PANELS)
          .filter(([, info]) => info.section === section)
          .map(([panel, info]) => {
            const panelFindings = findings.filter((f) => f.panel === panel);
            const coveringPhoto = photoOf(info.views);
            return { panel, panelFindings, coveringPhoto };
          })
          .filter((row) => (faultsOnly ? row.panelFindings.length > 0 : true));
        if (rows.length === 0) return null;

        return (
          <div key={section} className="insp-checklist-section">
            <h4>{t(`inspectionReport.sections.${section}`)}</h4>
            <ul>
              {rows.map(({ panel, panelFindings, coveringPhoto }) => (
                <li key={panel} className={panelFindings.length > 0 ? 'is-faulty' : ''}>
                  <span className="insp-checklist-name">{t(`inspectionReport.panels.${panel}`)}</span>
                  <span className="insp-checklist-status">
                    {panelFindings.length > 0 ? (
                      panelFindings.map((f) => {
                        const photo = photos.find((p) => p.view === f.view);
                        return (
                          <button
                            key={f.id}
                            type="button"
                            className="insp-chip-button"
                            onClick={() => photo && onOpen(photo, f)}
                            disabled={!photo}
                            title={f.description || f.part}
                          >
                            <span style={{ backgroundColor: SEVERITY_COLOR[f.severity] }}>{f.code}</span>
                            {t(`inspectionReport.categories.${f.category}`)} · {t(`inspectionReport.severities.${f.severity}`)}
                          </button>
                        );
                      })
                    ) : coveringPhoto ? (
                      <span className="insp-ok">
                        <CheckCircle2 size={15} /> {t('inspectionReport.panelOk')}
                      </span>
                    ) : (
                      <span className="insp-muted">{t('inspectionReport.notPhotographed')}</span>
                    )}
                  </span>
                  {panelFindings.length === 0 && coveringPhoto && (
                    <button
                      type="button"
                      className="insp-icon-button no-print"
                      onClick={() => onOpen(coveringPhoto)}
                      aria-label={t('inspectionReport.viewPhotoOf', { panel: t(`inspectionReport.panels.${panel}`) })}
                    >
                      <ImageIcon size={16} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
