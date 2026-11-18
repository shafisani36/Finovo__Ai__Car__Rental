import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { InspectionFinding, InspectionPhoto } from '../api/inspectionApi';
import { VIEW_LABELS } from './inspectionHelpers';
import { SEVERITY_COLOR } from './vehiclePanels';

interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

const FULL_PHOTO: Region = { x: 0, y: 0, width: 1, height: 1 };

/** The damage box with room around it, kept inside the photo (all values 0..1). */
function regionAround(box: Region): Region {
  const size = Math.min(1, Math.max(box.width, box.height) * 2.6, 1);
  const width = Math.min(1, Math.max(size, box.width + 0.08, 0.22));
  const height = Math.min(1, Math.max(size, box.height + 0.08, 0.22));
  const x = Math.min(1 - width, Math.max(0, box.x + box.width / 2 - width / 2));
  const y = Math.min(1 - height, Math.max(0, box.y + box.height / 2 - height / 2));
  return { x, y, width, height };
}

interface PhotoZoomProps {
  photo: InspectionPhoto;
  /** Damage to zoom into; without it the whole photo is shown */
  finding?: InspectionFinding | null;
  title: string;
  onClose: () => void;
}

/** Full-screen view of an inspection photo, zoomed into one damage with its box drawn on top. */
export function PhotoZoom({ photo, finding, title, onClose }: PhotoZoomProps) {
  const { t } = useTranslation();
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [showFull, setShowFull] = useState(!finding);
  // Damage recorded by staff has no marked area, so the whole photo is shown
  const hasArea = Boolean(finding && finding.box.width > 0 && finding.box.height > 0);
  const region = finding && hasArea && !showFull ? regionAround(finding.box) : FULL_PHOTO;
  const viewLabel = t(`inspectionReport.views.${photo.view}`, { defaultValue: VIEW_LABELS[photo.view] });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setNatural({ width: img.naturalWidth, height: img.naturalHeight });
    img.src = photo.imageUrl;
  }, [photo.imageUrl]);

  // The frame has the shape of the zoomed region, so the background scales without distortion
  const aspect = natural ? (region.width * natural.width) / (region.height * natural.height) : 4 / 3;
  const box = hasArea ? finding?.box : undefined;

  return (
    <div className="insp-zoom-backdrop no-print" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="insp-zoom" onClick={(e) => e.stopPropagation()}>
        <div className="insp-zoom-head">
          <div>
            <strong>{title}</strong>
            <span>{viewLabel}</span>
          </div>
          <button type="button" onClick={onClose} aria-label={t('inspectionReport.closeZoom')}>
            <X size={20} />
          </button>
        </div>
        <div
          className="insp-zoom-frame"
          style={{
            aspectRatio: String(aspect),
            // Fits the screen height too, keeping the region's shape so the photo is never stretched
            width: `min(100%, calc(70vh * ${aspect}))`,
            backgroundImage: `url("${photo.imageUrl}")`,
            backgroundSize: `${100 / region.width}% auto`,
            backgroundPosition: `${region.width < 1 ? (region.x / (1 - region.width)) * 100 : 0}% ${
              region.height < 1 ? (region.y / (1 - region.height)) * 100 : 0
            }%`,
          }}
        >
          {box && (
            <div
              className="insp-zoom-box"
              style={{
                left: `${((box.x - region.x) / region.width) * 100}%`,
                top: `${((box.y - region.y) / region.height) * 100}%`,
                width: `${(box.width / region.width) * 100}%`,
                height: `${(box.height / region.height) * 100}%`,
                borderColor: finding ? SEVERITY_COLOR[finding.severity] : undefined,
              }}
            />
          )}
        </div>
        {finding && (
          <div className="insp-zoom-foot">
            <p>
              <strong>{finding.code}</strong> · {finding.part}
              {finding.description && finding.description !== finding.part ? ` · ${finding.description}` : ''}
            </p>
            <button type="button" className="insp-btn-secondary" onClick={() => setShowFull((v) => !v)}>
              {showFull ? t('inspectionReport.zoomToDamage') : t('inspectionReport.showFullPhoto')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
