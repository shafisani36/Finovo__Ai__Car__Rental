import { useTranslation } from 'react-i18next';
import type { InspectionFinding } from '../api/inspectionApi';
import { CATEGORY_CODES, SEVERITY_COLOR, VEHICLE_PANELS } from './vehiclePanels';

interface CarDamageDiagramProps {
  findings: InspectionFinding[];
  onSelect: (finding: InspectionFinding) => void;
}

const MARKER_RADIUS = 11;

/**
 * Top view of a car (front at the top, driver side on the left) with one coded marker per damage, placed on
 * its panel. Clicking a marker opens the photo zoomed into that damage.
 */
export function CarDamageDiagram({ findings, onSelect }: CarDamageDiagramProps) {
  const { t } = useTranslation();
  const exterior = findings.filter((f) => VEHICLE_PANELS[f.panel]?.shape);
  const interior = findings.filter((f) => !VEHICLE_PANELS[f.panel]?.shape);
  const damagedPanels = new Set(exterior.map((f) => f.panel));

  // Markers of the same panel are spread out so each one stays clickable
  const markers = exterior.map((finding) => {
    const shape = VEHICLE_PANELS[finding.panel].shape!;
    const samePanel = exterior.filter((f) => f.panel === finding.panel);
    const index = samePanel.indexOf(finding);
    const vertical = shape.height > shape.width;
    const step = MARKER_RADIUS * 2 + 2;
    const offset = (index - (samePanel.length - 1) / 2) * step;
    return {
      finding,
      cx: shape.x + shape.width / 2 + (vertical ? 0 : offset),
      cy: shape.y + shape.height / 2 + (vertical ? offset : 0),
    };
  });

  return (
    <div className="insp-diagram">
      <svg viewBox="0 0 300 560" role="img" aria-label={t('inspectionReport.diagramAria', { count: exterior.length })}>
        <text x="150" y="12" textAnchor="middle" className="insp-diagram-label">
          {t('inspectionReport.diagramFront')}
        </text>
        <text x="150" y="552" textAnchor="middle" className="insp-diagram-label">
          {t('inspectionReport.diagramRear')}
        </text>
        <rect x="44" y="16" width="212" height="516" rx="46" className="insp-diagram-body" />
        {Object.entries(VEHICLE_PANELS).map(([panel, info]) =>
          info.shape ? (
            <rect
              key={panel}
              x={info.shape.x}
              y={info.shape.y}
              width={info.shape.width}
              height={info.shape.height}
              rx={info.shape.rx}
              className={`insp-diagram-panel insp-diagram-${info.section.toLowerCase()} ${damagedPanels.has(panel) ? 'is-damaged' : ''}`}
            >
              <title>{t(`inspectionReport.panels.${panel}`)}</title>
            </rect>
          ) : null
        )}
        {markers.map(({ finding, cx, cy }) => (
          <g
            key={finding.id}
            className="insp-diagram-marker"
            role="button"
            tabIndex={0}
            onClick={() => onSelect(finding)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(finding);
              }
            }}
          >
            <title>{`${finding.code} · ${t(`inspectionReport.panels.${finding.panel}`)} · ${finding.part}`}</title>
            <circle cx={cx} cy={cy} r={MARKER_RADIUS} fill={SEVERITY_COLOR[finding.severity]} />
            <text x={cx} y={cy + 4} textAnchor="middle">
              {finding.code}
            </text>
          </g>
        ))}
      </svg>

      <div className="insp-diagram-side">
        <h4>{t('inspectionReport.legendTitle')}</h4>
        <ul className="insp-legend">
          {CATEGORY_CODES.map(([code, category]) => (
            <li key={code}>
              <b>{code}</b> {t(`inspectionReport.categories.${category}`)}
            </li>
          ))}
        </ul>
        <ul className="insp-legend insp-legend-severity">
          {(['LOW', 'MEDIUM', 'HIGH', 'EXTREME'] as const).map((severity, i) => (
            <li key={severity}>
              <span className="insp-legend-dot" style={{ backgroundColor: SEVERITY_COLOR[severity] }} />
              <b>{i + 1}</b> {t(`inspectionReport.severities.${severity}`)}
            </li>
          ))}
        </ul>
        <p className="insp-muted insp-small">{t('inspectionReport.diagramHint')}</p>
        {interior.length > 0 && (
          <div className="insp-diagram-interior">
            <h4>{t('inspectionReport.sections.INTERIOR')}</h4>
            {interior.map((finding) => (
              <button key={finding.id} type="button" className="insp-chip-button" onClick={() => onSelect(finding)}>
                <span style={{ backgroundColor: SEVERITY_COLOR[finding.severity] }}>{finding.code}</span>
                {t(`inspectionReport.panels.${finding.panel}`)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
