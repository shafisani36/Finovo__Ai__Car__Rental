import { useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, RefreshCw, Trash2 } from 'lucide-react';
import { INSPECTION_VIEWS, REQUIRED_VIEWS, type InspectionView } from '../api/inspectionApi';
import { VIEW_LABELS, type CapturedPhotos } from './inspectionHelpers';
import './inspection.css';

/** Translation keys of the framing hint under each photo slot. */
const VIEW_HINT_KEYS: Record<InspectionView, string> = {
  FRONT: 'adminPages.inspections._hintFRONT',
  DRIVER_SIDE: 'adminPages.inspections._hintDRIVER_SIDE',
  PASSENGER_SIDE: 'adminPages.inspections._hintPASSENGER_SIDE',
  REAR: 'adminPages.inspections._hintREAR',
  ROOF: 'adminPages.inspections._hintROOF',
  INTERIOR: 'adminPages.inspections._hintINTERIOR',
};

/** Error carrying a translation key, so the message is shown in the user's language. */
class PhotoError extends Error {}

/** Longest edge sent to the AI. Large enough for small scratches, small enough to upload fast. */
const MAX_EDGE_PX = 1600;
const JPEG_QUALITY = 0.85;

/** Resizes and re-encodes a photo to JPEG in the browser (also strips EXIF and fixes rotation). */
async function compressImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new PhotoError('adminPages.inspections._errNotImage');
  }
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new PhotoError('adminPages.inspections._errBrowser');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  if (Math.min(width, height) < 480) {
    throw new PhotoError('adminPages.inspections._errResolution');
  }
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

interface VehiclePhotoCaptureProps {
  value: CapturedPhotos;
  /** State setter: updates are applied functionally so several photos can be processed at once. */
  onChange: Dispatch<SetStateAction<CapturedPhotos>>;
  disabled?: boolean;
  /** Reference photos (e.g. pickup) shown as a guide so return photos match the same angle. */
  referencePhotos?: Partial<Record<InspectionView, string>>;
}

export function VehiclePhotoCapture({ value, onChange, disabled, referencePhotos }: VehiclePhotoCaptureProps) {
  const { t } = useTranslation();
  const inputRefs = useRef<Partial<Record<InspectionView, HTMLInputElement | null>>>({});
  const [errors, setErrors] = useState<Partial<Record<InspectionView, string>>>({});
  const [busyViews, setBusyViews] = useState<Partial<Record<InspectionView, boolean>>>({});
  const viewLabel = (view: InspectionView) => t(`inspectionReport.views.${view}`, { defaultValue: VIEW_LABELS[view] });

  const handleFile = async (view: InspectionView, file: File | undefined) => {
    if (!file) return;
    setBusyViews((prev) => ({ ...prev, [view]: true }));
    setErrors((prev) => ({ ...prev, [view]: undefined }));
    try {
      const dataUrl = await compressImage(file);
      onChange((prev) => ({ ...prev, [view]: dataUrl }));
    } catch (err) {
      setErrors((prev) => ({ ...prev, [view]: err instanceof PhotoError ? t(err.message) : t('adminPages.inspections._errRead') }));
    } finally {
      setBusyViews((prev) => ({ ...prev, [view]: false }));
      const input = inputRefs.current[view];
      if (input) input.value = '';
    }
  };

  const remove = (view: InspectionView) => {
    onChange((prev) => {
      const next = { ...prev };
      delete next[view];
      return next;
    });
  };

  return (
    <div className="insp-capture-grid">
      {INSPECTION_VIEWS.map((view) => {
        const photo = value[view];
        const required = REQUIRED_VIEWS.includes(view);
        return (
          <div key={view} className={`insp-capture-slot ${photo ? 'has-photo' : ''}`}>
            <div className="insp-capture-head">
              <strong>{viewLabel(view)}</strong>
              <span className={required ? 'insp-tag-required' : 'insp-tag-optional'}>
                {required ? t('adminPages.inspections._required') : t('adminPages.inspections._optional')}
              </span>
            </div>

            <button
              type="button"
              className="insp-capture-frame"
              onClick={() => inputRefs.current[view]?.click()}
              disabled={disabled || busyViews[view]}
              aria-label={photo ? t('adminPages.inspections._retakeAria', { view: viewLabel(view) }) : t('adminPages.inspections._takeAria', { view: viewLabel(view) })}
            >
              {photo ? (
                <img src={photo} alt={t('adminPages.inspections._photoAlt', { view: viewLabel(view) })} />
              ) : referencePhotos?.[view] ? (
                <>
                  <img src={referencePhotos[view]} alt={t('adminPages.inspections._refAlt', { view: viewLabel(view) })} className="insp-ghost" />
                  <span className="insp-capture-cta">
                    <Camera size={20} /> {t('adminPages.inspections.matchAngle')}
                  </span>
                </>
              ) : (
                <span className="insp-capture-cta">
                  <Camera size={22} />
                  {busyViews[view] ? t('adminPages.inspections._processing') : t('adminPages.inspections._takePhoto')}
                </span>
              )}
            </button>

            <p className="insp-capture-hint">{t(VIEW_HINT_KEYS[view])}</p>
            {errors[view] && <p className="insp-capture-error">{errors[view]}</p>}

            {photo && !disabled && (
              <div className="insp-capture-actions">
                <button type="button" onClick={() => inputRefs.current[view]?.click()}>
                  <RefreshCw size={14} /> {t('adminPages.inspections.retake')}
                </button>
                <button type="button" onClick={() => remove(view)}>
                  <Trash2 size={14} /> {t('adminPages.inspections.remove')}
                </button>
              </div>
            )}

            <input
              ref={(el) => {
                inputRefs.current[view] = el;
              }}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              hidden
              onChange={(e) => handleFile(view, e.target.files?.[0])}
            />
          </div>
        );
      })}
    </div>
  );
}
