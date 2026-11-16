import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Eraser } from 'lucide-react';

interface SignaturePadProps {
  /** Receives a PNG data URL once the signature is long enough, or null when it is cleared */
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
}

const WIDTH = 600;
const HEIGHT = 200;
/** A real signature has some length; a tap or a dot is not accepted. */
const MIN_STROKE_LENGTH = 120;

/** Finger, pen or mouse signature box that produces a transparent PNG. */
export function SignaturePad({ onChange, disabled }: SignaturePadProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const strokeLengthRef = useRef(0);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#14143C';
  }, []);

  // Converts a pointer position to canvas pixels (the canvas is scaled by CSS)
  const pointFrom = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
    };
  };

  const start = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    event.preventDefault();
    canvasRef.current?.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    lastPointRef.current = pointFrom(event);
  };

  const move = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || disabled) return;
    const ctx = canvasRef.current?.getContext('2d');
    const last = lastPointRef.current;
    if (!ctx || !last) return;
    const point = pointFrom(event);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    strokeLengthRef.current += Math.hypot(point.x - last.x, point.y - last.y);
    lastPointRef.current = point;
    if (!hasInk) setHasInk(true);
  };

  const end = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    const canvas = canvasRef.current;
    onChange(canvas && strokeLengthRef.current >= MIN_STROKE_LENGTH ? canvas.toDataURL('image/png') : null);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, WIDTH, HEIGHT);
    strokeLengthRef.current = 0;
    setHasInk(false);
    onChange(null);
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        role="img"
        aria-label={t('adminPages.handover.signatureBox')}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onPointerLeave={end}
        style={{
          width: '100%',
          maxWidth: `${WIDTH}px`,
          aspectRatio: `${WIDTH} / ${HEIGHT}`,
          border: '1px dashed #B9AFC4',
          borderRadius: '10px',
          background: disabled ? '#F3F1F5' : '#FFFFFF',
          touchAction: 'none',
          cursor: disabled ? 'not-allowed' : 'crosshair',
          display: 'block',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: `${WIDTH}px`, marginTop: '6px', fontSize: '0.8rem', color: '#685D73' }}>
        <span>{t('adminPages.handover.signatureHint')}</span>
        <button
          type="button"
          onClick={clear}
          disabled={disabled || !hasInk}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#6C1E84', fontWeight: 600, cursor: 'pointer' }}
        >
          <Eraser size={14} /> {t('adminPages.handover.clearSignature')}
        </button>
      </div>
    </div>
  );
}
