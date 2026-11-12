import { useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Camera, RefreshCw, Trash2 } from 'lucide-react';
import { INSPECTION_VIEWS, REQUIRED_VIEWS, type InspectionView } from '../api/inspectionApi';
import { VIEW_LABELS, type CapturedPhotos } from './inspectionHelpers';
import './inspection.css';

const VIEW_HINTS: Record<InspectionView, string> = {
  FRONT: 'Stand 3 m in front, whole bumper, hood and lights in frame',
  DRIVER_SIDE: 'Stand 3-4 m away, full left side from bumper to bumper',
  PASSENGER_SIDE: 'Stand 3-4 m away, full right side from bumper to bumper',
  REAR: 'Stand 3 m behind, whole bumper, boot and lights in frame',
  ROOF: 'Optional: from a raised position',
  INTERIOR: 'Optional: front seats and dashboard',
};

/** Longest edge sent to the AI. Large enough for small scratches, small enough to upload fast. */
const MAX_EDGE_PX = 1600;
const JPEG_QUALITY = 0.85;

/** Resizes and re-encodes a photo to JPEG in the browser (also strips EXIF and fixes rotation). */
async function compressImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file');
  }
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image processing is not supported in this browser');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  if (Math.min(width, height) < 480) {
    throw new Error('Photo resolution is too low. Use at least 640 x 480.');
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
  const inputRefs = useRef<Partial<Record<InspectionView, HTMLInputElement | null>>>({});
  const [errors, setErrors] = useState<Partial<Record<InspectionView, string>>>({});
  const [busyViews, setBusyViews] = useState<Partial<Record<InspectionView, boolean>>>({});

  const handleFile = async (view: InspectionView, file: File | undefined) => {
    if (!file) return;
    setBusyViews((prev) => ({ ...prev, [view]: true }));
    setErrors((prev) => ({ ...prev, [view]: undefined }));
    try {
      const dataUrl = await compressImage(file);
      onChange((prev) => ({ ...prev, [view]: dataUrl }));
    } catch (err) {
      setErrors((prev) => ({ ...prev, [view]: err instanceof Error ? err.message : 'Could not read photo' }));
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
              <strong>{VIEW_LABELS[view]}</strong>
              <span className={required ? 'insp-tag-required' : 'insp-tag-optional'}>
                {required ? 'Required' : 'Optional'}
              </span>
            </div>

            <button
              type="button"
              className="insp-capture-frame"
              onClick={() => inputRefs.current[view]?.click()}
              disabled={disabled || busyViews[view]}
              aria-label={`${photo ? 'Retake' : 'Take'} ${VIEW_LABELS[view]} photo`}
            >
              {photo ? (
                <img src={photo} alt={`${VIEW_LABELS[view]} photo`} />
              ) : referencePhotos?.[view] ? (
                <>
                  <img src={referencePhotos[view]} alt={`Pickup ${VIEW_LABELS[view]} reference`} className="insp-ghost" />
                  <span className="insp-capture-cta">
                    <Camera size={20} /> Match the pickup angle
                  </span>
                </>
              ) : (
                <span className="insp-capture-cta">
                  <Camera size={22} />
                  {busyViews[view] ? 'Processing…' : 'Take or upload photo'}
                </span>
              )}
            </button>

            <p className="insp-capture-hint">{VIEW_HINTS[view]}</p>
            {errors[view] && <p className="insp-capture-error">{errors[view]}</p>}

            {photo && !disabled && (
              <div className="insp-capture-actions">
                <button type="button" onClick={() => inputRefs.current[view]?.click()}>
                  <RefreshCw size={14} /> Retake
                </button>
                <button type="button" onClick={() => remove(view)}>
                  <Trash2 size={14} /> Remove
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
