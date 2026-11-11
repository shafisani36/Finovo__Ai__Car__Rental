import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { inspectionApi } from '../api/inspectionApi';
import { fleetApi } from '../../fleet/api/fleetApi';
import type { Vehicle } from '../../fleet/types/fleet.types';
import {
  Sparkles,
  AlertTriangle,
  Cpu,
  Upload,
  Images,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { CustomSelect } from '../../../components/common/CustomSelect';
import { PageContainer, PageHeader } from '../../../components/common';
import {
  compressImageFile,
  extractImageTelemetry,
  type VisionView,
} from '../services/pixelVisionAnalyzer';

type FourViewKey = 'FRONT' | 'DRIVER_SIDE' | 'PASSENGER_SIDE' | 'REAR';

const FOUR_VIEWS: Array<{ key: FourViewKey; label: string; badge: string }> = [
  { key: 'FRONT', label: 'Front Angle', badge: 'VIEW 1: FRONT' },
  { key: 'DRIVER_SIDE', label: 'Driver Side', badge: 'VIEW 2: DRIVER SIDE' },
  { key: 'PASSENGER_SIDE', label: 'Passenger Side', badge: 'VIEW 3: PASSENGER SIDE' },
  { key: 'REAR', label: 'Rear Profile', badge: 'VIEW 4: REAR' },
];

export function NewInspectionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const preVehicleId = searchParams.get('vehicleId') || '';
  const preRentalId = searchParams.get('rentalId') || '';
  const preType = (searchParams.get('type') as 'PICKUP' | 'RETURN' | 'ROUTINE') || 'RETURN';

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(preVehicleId);
  const [inspectionType, setInspectionType] = useState<'PICKUP' | 'RETURN' | 'ROUTINE'>(preType);
  const [customNotes, setCustomNotes] = useState<string>('');

  // Clean empty slots until user uploads or enters real vehicle photos
  const [photos, setPhotos] = useState<Record<FourViewKey, string>>({
    FRONT: '',
    DRIVER_SIDE: '',
    PASSENGER_SIDE: '',
    REAR: '',
  });

  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const batchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      const res = await fleetApi.getVehicles({});
      if (res.success && res.vehicles) {
        setVehicles(res.vehicles);
        if (!selectedVehicleId && res.vehicles.length > 0) {
          setSelectedVehicleId(res.vehicles[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load fleet', err);
    }
  };

  const handleSingleFileChange = async (viewKey: FourViewKey, file?: File | null) => {
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 1280);
      setPhotos((prev) => ({ ...prev, [viewKey]: compressed }));
      setError(null);
    } catch {
      setError(`Could not read image file for ${viewKey}.`);
    }
  };

  const handleBatchFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, FOUR_VIEWS.length);
    e.target.value = '';
    if (files.length === 0) return;
    try {
      const encoded = await Promise.all(files.map((f) => compressImageFile(f, 1280)));
      setPhotos((prev) => {
        const next = { ...prev };
        encoded.forEach((dataUrl, idx) => {
          const target = FOUR_VIEWS[idx];
          if (target) {
            next[target.key] = dataUrl;
          }
        });
        return next;
      });
      setError(null);
    } catch {
      setError('Failed to process uploaded batch photos.');
    }
  };

  const uploadedViews = FOUR_VIEWS.filter((v) => Boolean(photos[v.key]?.trim()));

  const handleStartScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId) {
      setError('Please select a vehicle to inspect.');
      return;
    }

    if (uploadedViews.length === 0) {
      setError('Please upload or provide at least one vehicle photo (all 4 exterior sides recommended).');
      return;
    }

    try {
      setScanning(true);
      setError(null);

      setScanStep(`Decoding ${uploadedViews.length} uploaded vehicle photo(s) into pixel tensors...`);
      const extractedList = await Promise.all(
        uploadedViews.map(async (v) => {
          const imageUrl = photos[v.key].trim();
          const { telemetry } = await extractImageTelemetry(imageUrl, v.key as VisionView);
          return {
            view: v.key,
            imageUrl,
            pixelTelemetry: telemetry,
          };
        })
      );

      setScanStep('Analyzing exterior paint clusters, creases, scratches & baseline differences...');

      const res = await inspectionApi.analyze({
        vehicleId: selectedVehicleId,
        rentalId: preRentalId || undefined,
        type: inspectionType,
        summary: customNotes.trim() || undefined,
        photos: extractedList,
      });

      if (res.success && res.inspection) {
        setScanStep('Computer vision scan complete! Opening findings report...');
        navigate(`/admin/inspections/${res.inspection.id}`);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message || e.message || 'Failed to complete AI inspection analysis');
      setScanning(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: 'Inspections', href: '/admin/inspections' },
          { label: 'New AI Inspection' },
        ]}
        title="Launch AI Vehicle Inspection"
        badge="Dynamic Computer Vision"
        subtitle="Upload real photos from all four sides of any vehicle model. Our engine inspects the actual uploaded pixels, detects surface scratches/dents/chips accurately, and compares Return scans against Pickup baseline photos."
      />

      {error && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid #EF4444',
            borderRadius: '12px',
            padding: '14px 18px',
            color: '#B91C1C',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Inspection Setup Form */}
      <form onSubmit={handleStartScan} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Step 1: Vehicle & Scan Parameters */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #ECEAEF',
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 700, color: '#1E0426' }}>
            1. Select Target Vehicle & Inspection Type
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#685D73', marginBottom: '8px' }}>
                Vehicle in Fleet *
              </label>
              <CustomSelect
                value={selectedVehicleId}
                onChange={(val) => setSelectedVehicleId(val)}
                searchable
                placeholder="Select vehicle to inspect..."
                options={vehicles.map((v) => ({
                  value: v.id,
                  label: `${v.brand} ${v.model} (${v.registrationNumber})`,
                  sublabel: v.category?.name || 'Fleet Vehicle',
                  badge: v.status || 'AVAILABLE',
                }))}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#685D73', marginBottom: '8px' }}>
                Inspection Objective *
              </label>
              <CustomSelect
                value={inspectionType}
                onChange={(val) => setInspectionType(val as 'PICKUP' | 'RETURN' | 'ROUTINE')}
                options={[
                  { value: 'PICKUP', label: 'Pickup Baseline', sublabel: 'Capture Pre-Handover Baseline Photos' },
                  { value: 'RETURN', label: 'Return Check-in', sublabel: 'Compare vs Pickup & Detect New Damage' },
                  { value: 'ROUTINE', label: 'Routine Fleet Audit', sublabel: 'Workshop / Depot Health Inspection' },
                ]}
              />
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#685D73', marginBottom: '6px' }}>
              Inspector Notes (Optional)
            </label>
            <input
              type="text"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="Optional branch location or condition notes..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid #ECEAEF',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Step 2: 4-View Angle Photos */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #ECEAEF',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1E0426' }}>
                2. Upload 4 Exterior Viewpoint Photos ({uploadedViews.length}/4 Ready)
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: '#685D73' }}>
                Works on any car brand or model. Upload Front, Driver Side, Passenger Side, and Rear photos.
              </p>
            </div>

            <div>
              <button
                type="button"
                onClick={() => batchInputRef.current?.click()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 16px',
                  borderRadius: '10px',
                  border: '1px solid #1E0426',
                  backgroundColor: '#1E0426',
                  color: '#FFFFFF',
                  fontSize: '0.825rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Images size={16} color="#FAB826" />
                <span>Select 4 Photos at Once</span>
              </button>
              <input
                ref={batchInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleBatchFilesChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))', gap: '16px' }}>
            {FOUR_VIEWS.map((view) => {
              const photoUrl = photos[view.key];
              return (
                <div key={view.key} style={{ border: '1px solid #ECEAEF', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
                  <div style={{ position: 'relative', height: '160px', backgroundColor: '#F7F5F8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={view.label}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <label
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          width: '100%',
                          height: '100%',
                          color: '#685D73',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          textAlign: 'center',
                          padding: '12px',
                        }}
                      >
                        <Upload size={24} color="#6C1E84" />
                        <span>Click to upload {view.label}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            handleSingleFileChange(view.key, e.target.files?.[0]);
                            e.target.value = '';
                          }}
                          style={{ display: 'none' }}
                        />
                      </label>
                    )}

                    <div
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '8px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(30, 4, 38, 0.85)',
                        color: '#FFFFFF',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {photoUrl && <CheckCircle2 size={12} color="#34D399" />}
                      <span>{view.badge}</span>
                    </div>

                    {photoUrl && (
                      <button
                        type="button"
                        onClick={() => setPhotos((prev) => ({ ...prev, [view.key]: '' }))}
                        title={`Clear ${view.label}`}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          padding: '6px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(20, 2, 32, 0.78)',
                          color: '#FCA5A5',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '7px 10px',
                        borderRadius: '8px',
                        border: '1px solid #E0D8E3',
                        backgroundColor: '#FAF8FB',
                        color: '#1E0426',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <Upload size={13} />
                      <span>{photoUrl ? 'Replace Photo File' : 'Choose Image File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          handleSingleFileChange(view.key, e.target.files?.[0]);
                          e.target.value = '';
                        }}
                        style={{ display: 'none' }}
                      />
                    </label>

                    <input
                      type="text"
                      value={photoUrl.startsWith('data:') ? 'Uploaded Local Image Ready' : photoUrl}
                      readOnly={photoUrl.startsWith('data:')}
                      placeholder="Or paste HTTPS image URL..."
                      onChange={(e) => setPhotos((prev) => ({ ...prev, [view.key]: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid #ECEAEF',
                        fontSize: '0.72rem',
                        color: photoUrl.startsWith('data:') ? '#059669' : '#1E0426',
                        fontWeight: photoUrl.startsWith('data:') ? 700 : 400,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px', flexWrap: 'wrap' }}>
          <Link
            to="/admin/inspections"
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #ECEAEF',
              fontSize: '0.95rem',
              fontWeight: 600,
              color: '#685D73',
              textDecoration: 'none',
            }}
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={scanning || uploadedViews.length === 0}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 34px',
              backgroundColor: '#FAB826',
              color: '#1E0426',
              border: 'none',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: 800,
              cursor: scanning || uploadedViews.length === 0 ? 'not-allowed' : 'pointer',
              opacity: uploadedViews.length === 0 ? 0.55 : 1,
              boxShadow: '0 4px 14px rgba(250, 184, 38, 0.35)',
            }}
          >
            <Sparkles size={20} />
            <span>Launch AI Computer Vision Scan ({uploadedViews.length}/4 Angles)</span>
          </button>
        </div>
      </form>

      {/* High-Tech AI Scanning Modal */}
      {scanning && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(30, 4, 38, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            color: '#FFFFFF',
            padding: '24px',
          }}
        >
          <div
            style={{
              backgroundColor: '#1E0426',
              border: '1px solid rgba(250, 184, 38, 0.3)',
              borderRadius: '20px',
              padding: '40px',
              maxWidth: '500px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundColor: 'rgba(250, 184, 38, 0.15)',
                color: '#FAB826',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
              }}
            >
              <Cpu size={36} className="spin-icon" style={{ animation: 'spin 3s linear infinite' }} />
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 10px 0' }}>
              Finovo Computer Vision Pipeline
            </h2>
            <div style={{ color: '#FAB826', fontSize: '0.95rem', fontWeight: 600, minHeight: '30px', marginBottom: '20px' }}>
              {scanStep}
            </div>

            <div
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: '60%',
                  height: '100%',
                  backgroundColor: '#FAB826',
                  borderRadius: '4px',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
            </div>

            <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '20px' }}>
              Analyzing decoded pixel grids, paint color clusters, and baseline parity.
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
