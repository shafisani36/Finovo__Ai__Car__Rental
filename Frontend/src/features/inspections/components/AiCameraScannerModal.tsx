import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  CheckCircle2,
  FileText,
  X,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Images,
  Trash2,
  ScanLine,
} from 'lucide-react';
import {
  InspectionAiEngine,
  type ClientInspectionReport,
  type DetectedDamageItem,
} from '../services/inspectionAiEngine';
import { compressImageFile } from '../services/pixelVisionAnalyzer';

interface AiCameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspectionType: 'PICKUP' | 'RETURN';
  vehicle: {
    id?: string;
    brand: string;
    model: string;
    year: number;
    registrationNumber: string;
    vin?: string;
    color?: string;
    primaryImageUrl?: string;
  };
  baselineReport?: ClientInspectionReport | null;
  onInspectionComplete: (report: ClientInspectionReport) => void;
  onOpenPdfReport: (report: ClientInspectionReport) => void;
}

const VIEW_ANGLES = [
  { id: 'FRONT', short: 'Front', label: 'Front Angle', required: true },
  { id: 'DRIVER_SIDE', short: 'Left Side', label: 'Driver Side', required: true },
  { id: 'PASSENGER_SIDE', short: 'Right Side', label: 'Passenger Side', required: true },
  { id: 'REAR', short: 'Rear', label: 'Rear Profile', required: true },
  { id: 'INTERIOR', short: 'Cabin', label: 'Cabin / Cockpit', required: false },
] as const;

export function AiCameraScannerModal({
  isOpen,
  onClose,
  inspectionType,
  vehicle,
  baselineReport,
  onInspectionComplete,
  onOpenPdfReport,
}: AiCameraScannerModalProps) {
  const [activeAngleIndex, setActiveAngleIndex] = useState(0);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [inspectionResult, setInspectionResult] = useState<ClientInspectionReport | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<Record<string, string>>({});
  const [selectedDamageItem, setSelectedDamageItem] = useState<DetectedDamageItem | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCapturedPhotos({});
      setInspectionResult(null);
      setSelectedDamageItem(null);
      setScanError(null);
      setActiveAngleIndex(0);
    }
  }, [isOpen, vehicle.id, inspectionType]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentAngle = VIEW_ANGLES[activeAngleIndex];
  const currentPhotoUrl = capturedPhotos[currentAngle.id];
  const uploadedAnglesCount = VIEW_ANGLES.filter((a) => Boolean(capturedPhotos[a.id])).length;
  const exteriorUploadedCount = ['FRONT', 'DRIVER_SIDE', 'PASSENGER_SIDE', 'REAR'].filter((id) =>
    Boolean(capturedPhotos[id])
  ).length;

  const startCamera = async () => {
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setCameraStream(stream);
      setIsCameraActive(true);
      setScanError(null);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.warn('Live camera unavailable:', err);
      setScanError('Camera access unavailable or blocked. Please upload real vehicle photos from your device.');
    }
  };

  const captureFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 720;
      const scale = Math.min(1, 1280 / Math.max(w, h));
      canvas.width = Math.max(1, Math.round(w * scale));
      canvas.height = Math.max(1, Math.round(h * scale));
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedPhotos((prev) => ({ ...prev, [currentAngle.id]: dataUrl }));
        setInspectionResult(null);
        setSelectedDamageItem(null);
        setScanError(null);
      }
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
        setCameraStream(null);
      }
      setIsCameraActive(false);
    }
  };

  const processSingleFile = async (file?: File | null) => {
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file, 1280);
      setCapturedPhotos((prev) => ({
        ...prev,
        [currentAngle.id]: dataUrl,
      }));
      setInspectionResult(null);
      setSelectedDamageItem(null);
      setScanError(null);
    } catch {
      setScanError('Could not read uploaded image file. Please try PNG, JPG, or WebP.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    await processSingleFile(file);
  };

  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, VIEW_ANGLES.length);
    e.target.value = '';
    if (files.length === 0) return;
    try {
      const encoded = await Promise.all(files.map((f) => compressImageFile(f, 1280)));
      setCapturedPhotos((prev) => {
        const next = { ...prev };
        encoded.forEach((dataUrl, idx) => {
          const targetAngle = VIEW_ANGLES[idx];
          if (targetAngle) {
            next[targetAngle.id] = dataUrl;
          }
        });
        return next;
      });
      setInspectionResult(null);
      setSelectedDamageItem(null);
      setScanError(null);
    } catch {
      setScanError('Failed to decode one or more selected images.');
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;
    if (files.length === 1) {
      await processSingleFile(files[0]);
      return;
    }
    try {
      const encoded = await Promise.all(files.slice(0, VIEW_ANGLES.length).map((f) => compressImageFile(f, 1280)));
      setCapturedPhotos((prev) => {
        const next = { ...prev };
        encoded.forEach((url, idx) => {
          const targetAngle = VIEW_ANGLES[idx];
          if (targetAngle) next[targetAngle.id] = url;
        });
        return next;
      });
      setInspectionResult(null);
      setSelectedDamageItem(null);
      setScanError(null);
    } catch {
      setScanError('Failed to read dropped images.');
    }
  };

  const handleRemoveAnglePhoto = () => {
    setCapturedPhotos((prev) => {
      const next = { ...prev };
      delete next[currentAngle.id];
      return next;
    });
    setInspectionResult(null);
    setSelectedDamageItem(null);
  };

  const handleRunAiInspection = async () => {
    const photosList = VIEW_ANGLES.filter((a) => Boolean(capturedPhotos[a.id])).map((a) => ({
      view: a.id,
      imageUrl: capturedPhotos[a.id],
    }));

    if (photosList.length === 0) {
      setScanError('Please upload or capture at least one vehicle photo before running AI inspection.');
      return;
    }

    try {
      setIsScanning(true);
      setScanError(null);

      const report = await InspectionAiEngine.runInspectionAsync({
        type: inspectionType,
        vehicle: {
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          registrationNumber: vehicle.registrationNumber,
          vin: vehicle.vin,
          color: vehicle.color,
        },
        photos: photosList,
        baselineReport: inspectionType === 'RETURN' ? baselineReport : null,
      });

      setInspectionResult(report);
      setSelectedDamageItem(report.findings[0] || null);
      onInspectionComplete(report);
    } catch (err) {
      console.error('AI CV analysis error:', err);
      setScanError('Failed to analyze uploaded images. Please verify valid image formats and retry.');
    } finally {
      setIsScanning(false);
    }
  };

  const currentFindings =
    inspectionResult?.findings.filter((f) => f.view === currentAngle.id) || [];
  const currentAnalyzedMeta = inspectionResult?.photos.find((p) => p.view === currentAngle.id);

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(13, 2, 22, 0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(8px, 2.4vw, 24px)',
        boxSizing: 'border-box',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(165deg, #210538 0%, #160224 55%, #11021B 100%)',
          color: '#FFFFFF',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '1080px',
          maxHeight: 'calc(100dvh - 16px)',
          overflow: 'hidden',
          boxShadow: '0 28px 70px rgba(8, 1, 14, 0.65), 0 0 0 1px rgba(250, 184, 38, 0.18)',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          fontFamily: "var(--font-family-sans, 'Manrope', sans-serif)",
        }}
      >
        {/* Fixed Modal Header */}
        <div
          style={{
            flexShrink: 0,
            padding: 'clamp(12px, 2.2vw, 18px) clamp(14px, 3vw, 24px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(255, 255, 255, 0.02)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '11px',
                background: 'linear-gradient(135deg, #FAB826 0%, #E5A417 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1E0432',
                boxShadow: '0 6px 16px rgba(250, 184, 38, 0.3)',
                flexShrink: 0,
              }}
            >
              <ScanLine size={21} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3
                  style={{
                    fontFamily: "var(--font-family-display, 'Archivo', sans-serif)",
                    fontSize: 'clamp(1rem, 2.2vw, 1.2rem)',
                    fontWeight: 800,
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  AI Computer Vision Scanner
                </h3>
                <span
                  style={{
                    backgroundColor:
                      inspectionType === 'PICKUP'
                        ? 'rgba(16, 185, 129, 0.16)'
                        : 'rgba(250, 184, 38, 0.16)',
                    color: inspectionType === 'PICKUP' ? '#6EE7B7' : '#FDE68A',
                    border:
                      inspectionType === 'PICKUP'
                        ? '1px solid rgba(110, 231, 183, 0.32)'
                        : '1px solid rgba(250, 184, 38, 0.35)',
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '3px 9px',
                    borderRadius: '9999px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {inspectionType === 'PICKUP' ? 'Handover Baseline' : 'Return Check-in'}
                </span>
              </div>
              <p
                style={{
                  margin: '3px 0 0',
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {vehicle.brand} {vehicle.model} ({vehicle.year}) • Plate #{vehicle.registrationNumber}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => batchInputRef.current?.click()}
              style={{
                background: 'rgba(250, 184, 38, 0.14)',
                border: '1px solid rgba(250, 184, 38, 0.45)',
                borderRadius: '10px',
                color: '#FAB826',
                cursor: 'pointer',
                padding: '8px 13px',
                fontSize: '12px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              <Images size={15} />
              <span>Upload 4 Sides</span>
            </button>
            <input
              ref={batchInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleBatchUpload}
              style={{ display: 'none' }}
            />

            <button
              type="button"
              onClick={onClose}
              aria-label="Close AI scanner"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                borderRadius: '10px',
                color: '#FFFFFF',
                cursor: 'pointer',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Fixed Angle Navigation Tabs (Never squished vertically) */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px clamp(14px, 3vw, 24px)',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            overflowX: 'auto',
            overflowY: 'hidden',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {VIEW_ANGLES.map((angle, idx) => {
            const isActive = activeAngleIndex === idx;
            const hasPhoto = Boolean(capturedPhotos[angle.id]);
            return (
              <button
                type="button"
                key={angle.id}
                onClick={() => {
                  setActiveAngleIndex(idx);
                  if (isCameraActive && cameraStream) {
                    cameraStream.getTracks().forEach((t) => t.stop());
                    setIsCameraActive(false);
                  }
                }}
                style={{
                  minHeight: '38px',
                  padding: '7px 14px',
                  borderRadius: '10px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: isActive
                    ? '1.5px solid #FAB826'
                    : hasPhoto
                    ? '1px solid rgba(52, 211, 153, 0.35)'
                    : '1px solid rgba(255, 255, 255, 0.12)',
                  backgroundColor: isActive
                    ? 'rgba(250, 184, 38, 0.16)'
                    : hasPhoto
                    ? 'rgba(16, 185, 129, 0.09)'
                    : 'rgba(255, 255, 255, 0.05)',
                  color: isActive ? '#FAB826' : hasPhoto ? '#A7F3D0' : 'rgba(255, 255, 255, 0.78)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.18s ease',
                }}
              >
                <span
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: isActive ? '#FAB826' : 'rgba(255, 255, 255, 0.12)',
                    color: isActive ? '#1E0432' : '#FFFFFF',
                    fontSize: '10px',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {idx + 1}
                </span>
                <span>{angle.label}</span>
                {hasPhoto && <CheckCircle2 size={14} color="#34D399" />}
              </button>
            );
          })}
        </div>

        {/* Independently Scrollable Modal Workspace */}
        <div
          className="custom-scrollbar"
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            padding: 'clamp(14px, 2.5vw, 22px) clamp(14px, 3vw, 24px)',
          }}
        >
          {scanError && (
            <div
              style={{
                marginBottom: '16px',
                padding: '10px 14px',
                borderRadius: '10px',
                backgroundColor: 'rgba(239, 68, 68, 0.16)',
                border: '1px solid rgba(248, 113, 113, 0.45)',
                color: '#FECACA',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {scanError}
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 330px), 1fr))',
              gap: '20px',
              alignItems: 'start',
            }}
          >
            {/* Left Studio Viewport Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                style={{
                  position: 'relative',
                  width: '100%',
                  height: 'clamp(220px, 36vh, 350px)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  background: isDragging
                    ? 'radial-gradient(circle at center, rgba(250, 184, 38, 0.16) 0%, #11021B 75%)'
                    : 'radial-gradient(circle at 50% 40%, rgba(108, 30, 132, 0.24) 0%, #0F0219 75%)',
                  border: isDragging
                    ? '2px dashed #FAB826'
                    : currentPhotoUrl
                    ? '1.5px solid rgba(250, 184, 38, 0.35)'
                    : '1.5px dashed rgba(255, 255, 255, 0.22)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'border-color 0.2s ease, background 0.2s ease',
                }}
              >
                {isCameraActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : currentPhotoUrl ? (
                  <img
                    src={currentPhotoUrl}
                    alt={currentAngle.label}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#0C0114' }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', maxWidth: '340px' }}>
                    <div
                      style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '14px',
                        background: 'rgba(250, 184, 38, 0.14)',
                        border: '1px solid rgba(250, 184, 38, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px',
                        color: '#FAB826',
                      }}
                    >
                      <Upload size={24} />
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: '#FFFFFF', marginBottom: '6px' }}>
                      Upload {currentAngle.label} Photo
                    </div>
                    <p style={{ margin: '0 0 12px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.68)', lineHeight: 1.5 }}>
                      Drag & drop car images here, click Upload below, or use your device camera ({exteriorUploadedCount}/4 exterior sides ready).
                    </p>
                    {currentAngle.id === 'FRONT' && vehicle.primaryImageUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          setCapturedPhotos((prev) => ({
                            ...prev,
                            FRONT: vehicle.primaryImageUrl || '',
                          }))
                        }
                        style={{
                          padding: '7px 14px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.24)',
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: '#FFFFFF',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Load Vehicle Catalog Photo
                      </button>
                    )}
                  </div>
                )}

                {/* Laser scan animation */}
                {isScanning && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(180deg, transparent 0%, rgba(250, 184, 38, 0.3) 50%, transparent 100%)',
                      animation: 'aiLaserScan 1.5s infinite ease-in-out',
                      borderBottom: '3px solid #FAB826',
                      boxShadow: '0 0 20px #FAB826',
                      pointerEvents: 'none',
                    }}
                  />
                )}

                {/* Real detected defect bounding boxes */}
                {!isScanning &&
                  currentPhotoUrl &&
                  currentFindings.map((finding) => {
                    const isSelected = selectedDamageItem?.id === finding.id;
                    return (
                      <div
                        key={finding.id}
                        onClick={() => setSelectedDamageItem(finding)}
                        style={{
                          position: 'absolute',
                          left: `${finding.boundingBox.x * 100}%`,
                          top: `${finding.boundingBox.y * 100}%`,
                          width: `${finding.boundingBox.width * 100}%`,
                          height: `${finding.boundingBox.height * 100}%`,
                          border: finding.category === 'SCRATCH' ? '2px solid #F59E0B' : '2px solid #EF4444',
                          backgroundColor:
                            finding.category === 'SCRATCH'
                              ? 'rgba(245, 158, 11, 0.24)'
                              : 'rgba(239, 68, 68, 0.24)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          boxShadow: isSelected
                            ? '0 0 0 3px rgba(250, 184, 38, 0.65), 0 0 14px rgba(239, 68, 68, 0.75)'
                            : '0 0 10px rgba(239, 68, 68, 0.5)',
                          zIndex: 10,
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            top: '-22px',
                            left: 0,
                            backgroundColor: finding.category === 'SCRATCH' ? '#D97706' : '#DC2626',
                            color: '#FFFFFF',
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.45)',
                          }}
                        >
                          {finding.category}: {finding.damageType} ({finding.confidence}%)
                        </span>
                      </div>
                    );
                  })}

                {/* Compact top telemetry chip — zero collision with bottom controls */}
                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    backgroundColor: 'rgba(15, 2, 25, 0.84)',
                    backdropFilter: 'blur(6px)',
                    padding: '5px 10px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    pointerEvents: 'none',
                  }}
                >
                  {currentAngle.label} ({activeAngleIndex + 1}/{VIEW_ANGLES.length})
                  {currentAnalyzedMeta?.qualityScore ? ` • Q: ${currentAnalyzedMeta.qualityScore}%` : ''}
                  {typeof currentAnalyzedMeta?.baselineSimilarity === 'number'
                    ? ` • Match: ${currentAnalyzedMeta.baselineSimilarity}%`
                    : ''}
                </div>
              </div>

              {/* Clean Non-Overlapping Controls Bar directly below Viewport */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: '1 1 auto' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: '9px 15px',
                      backgroundColor: '#FFFFFF',
                      color: '#1E0432',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: 800,
                      fontSize: '12.5px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Upload size={15} />
                    <span>{currentPhotoUrl ? 'Replace Photo' : 'Upload Photo'}</span>
                  </button>

                  {isCameraActive ? (
                    <button
                      type="button"
                      onClick={captureFrame}
                      style={{
                        padding: '9px 15px',
                        backgroundColor: '#10B981',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Camera size={15} /> Capture Frame
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startCamera}
                      style={{
                        padding: '9px 15px',
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        color: '#FFFFFF',
                        border: '1px solid rgba(255, 255, 255, 0.18)',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Camera size={15} /> Live Camera
                    </button>
                  )}

                  {currentPhotoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAnglePhoto}
                      title="Remove current angle photo"
                      style={{
                        padding: '9px 12px',
                        backgroundColor: 'rgba(239, 68, 68, 0.16)',
                        color: '#FCA5A5',
                        border: '1px solid rgba(248, 113, 113, 0.3)',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <Trash2 size={14} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </div>

              {/* 5-Angle Compact Status Thumbnail Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '8px' }}>
                {VIEW_ANGLES.map((angle, idx) => {
                  const thumb = capturedPhotos[angle.id];
                  const active = activeAngleIndex === idx;
                  return (
                    <button
                      key={angle.id}
                      type="button"
                      onClick={() => setActiveAngleIndex(idx)}
                      style={{
                        padding: '4px',
                        borderRadius: '10px',
                        border: active
                          ? '1.5px solid #FAB826'
                          : thumb
                          ? '1px solid rgba(52, 211, 153, 0.4)'
                          : '1px solid rgba(255, 255, 255, 0.1)',
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        alignItems: 'center',
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          height: '42px',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          backgroundColor: '#0E0218',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'rgba(255, 255, 255, 0.45)',
                        }}
                      >
                        {thumb ? (
                          <img src={thumb} alt={angle.short} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Upload size={13} />
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: active ? '#FAB826' : thumb ? '#A7F3D0' : 'rgba(255, 255, 255, 0.65)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '100%',
                        }}
                      >
                        {angle.short}
                      </span>
                    </button>
                  );
                })}
              </div>
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            {/* Right Analysis & Control Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
              <button
                type="button"
                onClick={handleRunAiInspection}
                disabled={isScanning || uploadedAnglesCount === 0}
                style={{
                  width: '100%',
                  padding: '13px 18px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  background:
                    uploadedAnglesCount === 0
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'linear-gradient(135deg, #FAB826 0%, #E5A417 100%)',
                  color: uploadedAnglesCount === 0 ? 'rgba(255, 255, 255, 0.65)' : '#1E0432',
                  border:
                    uploadedAnglesCount === 0
                      ? '1px dashed rgba(250, 184, 38, 0.4)'
                      : 'none',
                  boxShadow:
                    uploadedAnglesCount > 0 ? '0 8px 24px rgba(250, 184, 38, 0.28)' : 'none',
                  cursor: isScanning || uploadedAnglesCount === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {isScanning ? (
                  <>
                    <RefreshCw size={17} className="animate-spin" />
                    <span>Analyzing {uploadedAnglesCount} Real Photo(s)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={17} />
                    <span>
                      {uploadedAnglesCount === 0
                        ? 'Upload Vehicle Photos to Enable Scan'
                        : `Run AI Vision Inspection (${uploadedAnglesCount}/5 Angles)`}
                    </span>
                  </>
                )}
              </button>

              {inspectionResult ? (
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    borderRadius: '16px',
                    padding: '18px',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#FFFFFF' }}>
                      Vision Diagnostics Report
                    </h4>
                    <span
                      style={{
                        backgroundColor: 'rgba(16, 185, 129, 0.16)',
                        color: '#6EE7B7',
                        border: '1px solid rgba(110, 231, 183, 0.3)',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '9999px',
                      }}
                    >
                      {inspectionResult.engineMode === 'BASELINE_DELTA_CV'
                        ? `Baseline Delta • ${inspectionResult.parityScore ?? 100}% Match`
                        : `Pixel CV • ${inspectionResult.coverageScore}% Coverage`}
                    </span>
                  </div>

                  {/* Paint Swatch Card */}
                  <div
                    style={{
                      backgroundColor: 'rgba(15, 2, 25, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.09)',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <span style={{ fontSize: '12.5px', color: 'rgba(255, 255, 255, 0.72)' }}>
                      Detected Exterior Color:
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          backgroundColor: inspectionResult.detectedColor.hexCode,
                          border: '2px solid #FFFFFF',
                        }}
                      />
                      <strong style={{ fontSize: '13px', color: '#FFFFFF' }}>
                        {inspectionResult.detectedColor.colorName}
                      </strong>
                      <span style={{ fontSize: '11px', color: '#FAB826', fontWeight: 700 }}>
                        ({Math.round(
                          inspectionResult.detectedColor.confidence <= 1
                            ? inspectionResult.detectedColor.confidence * 100
                            : inspectionResult.detectedColor.confidence
                        )}%)
                      </span>
                    </div>
                  </div>

                  {/* Responsive Score & Anomaly Metrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 95px), 1fr))', gap: '10px' }}>
                    <div
                      style={{
                        backgroundColor: 'rgba(15, 2, 25, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.09)',
                        padding: '10px',
                        borderRadius: '12px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: inspectionResult.overallScore >= 90 ? '#34D399' : '#FAB826' }}>
                        {inspectionResult.overallScore}%
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.68)' }}>Body Integrity</div>
                    </div>

                    <div
                      style={{
                        backgroundColor: 'rgba(15, 2, 25, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.09)',
                        padding: '10px',
                        borderRadius: '12px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#FAB826' }}>
                        {inspectionResult.scratchesCount}
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.68)' }}>Scratches</div>
                    </div>

                    <div
                      style={{
                        backgroundColor: 'rgba(15, 2, 25, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.09)',
                        padding: '10px',
                        borderRadius: '12px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#F87171' }}>
                        {inspectionResult.dentsCount}
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.68)' }}>Dents</div>
                    </div>
                  </div>

                  <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255, 255, 255, 0.78)', lineHeight: 1.5 }}>
                    {inspectionResult.summary}
                  </p>

                  <div>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'rgba(255, 255, 255, 0.68)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        marginBottom: '8px',
                      }}
                    >
                      Detected Anomalies ({inspectionResult.findings.length})
                    </div>
                    {inspectionResult.findings.length === 0 ? (
                      <div
                        style={{
                          padding: '12px',
                          backgroundColor: 'rgba(16, 185, 129, 0.14)',
                          border: '1px solid rgba(110, 231, 183, 0.28)',
                          color: '#A7F3D0',
                          borderRadius: '10px',
                          fontSize: '12.5px',
                          textAlign: 'center',
                          fontWeight: 600,
                        }}
                      >
                        Clean exterior verified: 0 scratches, dents, or new surface defects detected.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '190px', overflowY: 'auto' }}>
                        {inspectionResult.findings.map((f) => (
                          <div
                            key={f.id}
                            onClick={() => {
                              const idx = VIEW_ANGLES.findIndex((v) => v.id === f.view);
                              if (idx >= 0) setActiveAngleIndex(idx);
                              setSelectedDamageItem(f);
                            }}
                            style={{
                              padding: '10px 12px',
                              backgroundColor: 'rgba(15, 2, 25, 0.72)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              borderRadius: '10px',
                              borderLeft: f.category === 'SCRATCH' ? '3px solid #FAB826' : '3px solid #EF4444',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '8px',
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <strong style={{ color: '#FFFFFF', display: 'block' }}>{f.damageType}</strong>
                              <div style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '11px' }}>
                                {f.location} ({f.view}) • Conf: {f.confidence}%
                              </div>
                            </div>
                            <span style={{ fontWeight: 700, color: '#FAB826', whiteSpace: 'nowrap' }}>
                              PKR {f.estimatedRepairCost}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenPdfReport(inspectionResult)}
                    style={{
                      padding: '11px 16px',
                      borderRadius: '11px',
                      backgroundColor: 'rgba(255, 255, 255, 0.07)',
                      border: '1px solid rgba(250, 184, 38, 0.45)',
                      color: '#FAB826',
                      fontWeight: 700,
                      fontSize: '13.5px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <FileText size={17} />
                    <span>View & Download Official PDF Report</span>
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    borderRadius: '16px',
                    padding: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '11px',
                        backgroundColor: 'rgba(250, 184, 38, 0.14)',
                        border: '1px solid rgba(250, 184, 38, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FAB826',
                        flexShrink: 0,
                      }}
                    >
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <h5 style={{ color: '#FFFFFF', margin: 0, fontSize: '14.5px', fontWeight: 800 }}>
                        Real-Image Inspection Ready
                      </h5>
                      <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.68)', marginTop: '2px' }}>
                        {exteriorUploadedCount} of 4 exterior viewpoints uploaded
                      </div>
                    </div>
                  </div>

                  {/* Coverage Progress Bar */}
                  <div style={{ width: '100%', height: '6px', borderRadius: '999px', backgroundColor: 'rgba(255, 255, 255, 0.1)', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.round((exteriorUploadedCount / 4) * 100)}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #FAB826 0%, #34D399 100%)',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px', color: 'rgba(255, 255, 255, 0.78)' }}>
                    <div style={{ padding: '10px 12px', borderRadius: '10px', backgroundColor: 'rgba(15, 2, 25, 0.5)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <strong style={{ color: '#FAB826' }}>1. Upload 4 Exterior Sides:</strong> Front, Driver Side, Passenger Side, and Rear photos for any car make or model.
                    </div>
                    <div style={{ padding: '10px 12px', borderRadius: '10px', backgroundColor: 'rgba(15, 2, 25, 0.5)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <strong style={{ color: '#FAB826' }}>2. Pixel Anomaly Scan:</strong> Detects paint color, surface scratches, panel dents, and paint chips directly from uploaded pixels.
                    </div>
                    <div style={{ padding: '10px 12px', borderRadius: '10px', backgroundColor: 'rgba(15, 2, 25, 0.5)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <strong style={{ color: '#FAB826' }}>3. Dispute-Free Comparison:</strong>{' '}
                      {inspectionType === 'RETURN' && baselineReport
                        ? 'Automatically compares return angles against your saved pickup baseline.'
                        : 'Generates a verifiable digital baseline certificate before key release.'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fixed Non-Clipping Footer */}
        <div
          style={{
            flexShrink: 0,
            padding: '12px clamp(14px, 3vw, 24px)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: 'rgba(15, 2, 25, 0.75)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.6)' }}>
            Finovo Dynamic Computer Vision Engine v4.0 • Pixel-Level & Baseline-Delta Verified
          </span>
          <div style={{ display: 'flex', gap: '10px', marginInlineStart: 'auto' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 18px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backgroundColor: 'rgba(255, 255, 255, 0.07)',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
            {inspectionResult && (
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '9px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#10B981',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <CheckCircle2 size={16} /> Confirm Certified Scan
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes aiLaserScan {
          0% { top: 0%; opacity: 0.9; }
          50% { top: 85%; opacity: 0.6; }
          100% { top: 0%; opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
