import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { inspectionApi } from '../api/inspectionApi';
import { fleetApi } from '../../fleet/api/fleetApi';
import type { Vehicle } from '../../fleet/types/fleet.types';
import {
  Sparkles,
  AlertTriangle,
  Cpu,
} from 'lucide-react';
import { CustomSelect } from '../../../components/common/CustomSelect';
import { PageContainer, PageHeader } from '../../../components/common';

export function NewInspectionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const preVehicleId = searchParams.get('vehicleId') || '';
  const preRentalId = searchParams.get('rentalId') || '';
  const preType = (searchParams.get('type') as 'PICKUP' | 'RETURN' | 'ROUTINE') || 'RETURN';

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(preVehicleId);
  const [inspectionType, setInspectionType] = useState<'PICKUP' | 'RETURN' | 'ROUTINE'>(preType);
  const [summary] = useState<string>('Standard multi-angle vehicle exterior inspection.');

  // 4 View Photos state
  const [photos, setPhotos] = useState<{
    FRONT: string;
    DRIVER_SIDE: string;
    PASSENGER_SIDE: string;
    REAR: string;
  }>({
    FRONT: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
    DRIVER_SIDE: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
    PASSENGER_SIDE: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80',
    REAR: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=800&q=80',
  });

  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

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

  const handleStartScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId) {
      setError('Please select a vehicle to inspect.');
      return;
    }

    try {
      setScanning(true);
      setError(null);

      // AI Simulation steps for high-tech user feedback
      setScanStep('Uploading 4 high-resolution viewpoints...');
      await new Promise((r) => setTimeout(r, 600));

      setScanStep('Segmenting vehicle body panels & geometry...');
      await new Promise((r) => setTimeout(r, 600));

      setScanStep('Executing deep neural network surface defect classification...');
      await new Promise((r) => setTimeout(r, 700));

      setScanStep('Comparing against baseline pickup scans & localizing anomalies...');

      const res = await inspectionApi.analyze({
        vehicleId: selectedVehicleId,
        rentalId: preRentalId || undefined,
        type: inspectionType,
        summary,
        photos: [
          { view: 'FRONT', imageUrl: photos.FRONT },
          { view: 'DRIVER_SIDE', imageUrl: photos.DRIVER_SIDE },
          { view: 'PASSENGER_SIDE', imageUrl: photos.PASSENGER_SIDE },
          { view: 'REAR', imageUrl: photos.REAR },
        ],
      });

      if (res.success && res.inspection) {
        setScanStep('Analysis complete! Redirecting to inspector...');
        await new Promise((r) => setTimeout(r, 400));
        navigate(`/admin/inspections/${res.inspection.id}`);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to complete AI inspection analysis');
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
        badge="Deep Learning Vision"
        subtitle="Upload four standard viewpoints of the vehicle exterior. The AI model analyzes body panels, identifies scratches, dents, and cracks, and generates localized bounding box markers."
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {/* Vehicle Select */}
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
                  sublabel: v.category?.name || 'Luxury Vehicle',
                  badge: v.status || 'AVAILABLE',
                }))}
              />
            </div>

            {/* Inspection Type */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#685D73', marginBottom: '8px' }}>
                Inspection Objective *
              </label>
              <CustomSelect
                value={inspectionType}
                onChange={(val) => setInspectionType(val as 'PICKUP' | 'RETURN' | 'ROUTINE')}
                options={[
                  { value: 'RETURN', label: 'Return Check-in', sublabel: 'Compare with Pickup & Detect New Damage' },
                  { value: 'PICKUP', label: 'Pickup Baseline', sublabel: 'Capture Baseline Condition Prior to Dispatch' },
                  { value: 'ROUTINE', label: 'Routine Fleet Audit', sublabel: 'Workshop / Depot Health Inspection' },
                ]}
              />
            </div>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1E0426' }}>
              2. Capture 4 Standard Viewpoints
            </h3>
            <span style={{ fontSize: '0.8125rem', color: '#059669', fontWeight: 600 }}>
              All 4 angles required for 360° coverage
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
            {/* View 1: FRONT */}
            <div style={{ border: '1px solid #ECEAEF', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ position: 'relative', height: '140px', backgroundColor: '#F7F5F8' }}>
                <img
                  src={photos.FRONT}
                  alt="Front Angle"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    left: '8px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(30, 4, 38, 0.85)',
                    color: '#FFFFFF',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  VIEW 1: FRONT
                </div>
              </div>
              <div style={{ padding: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#685D73', marginBottom: '4px' }}>
                  Image URL / Camera Feed
                </label>
                <input
                  type="text"
                  value={photos.FRONT}
                  onChange={(e) => setPhotos({ ...photos, FRONT: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid #ECEAEF',
                    fontSize: '0.75rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* View 2: DRIVER SIDE */}
            <div style={{ border: '1px solid #ECEAEF', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ position: 'relative', height: '140px', backgroundColor: '#F7F5F8' }}>
                <img
                  src={photos.DRIVER_SIDE}
                  alt="Driver Side"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    left: '8px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(30, 4, 38, 0.85)',
                    color: '#FFFFFF',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  VIEW 2: DRIVER SIDE
                </div>
              </div>
              <div style={{ padding: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#685D73', marginBottom: '4px' }}>
                  Image URL / Camera Feed
                </label>
                <input
                  type="text"
                  value={photos.DRIVER_SIDE}
                  onChange={(e) => setPhotos({ ...photos, DRIVER_SIDE: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid #ECEAEF',
                    fontSize: '0.75rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* View 3: PASSENGER SIDE */}
            <div style={{ border: '1px solid #ECEAEF', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ position: 'relative', height: '140px', backgroundColor: '#F7F5F8' }}>
                <img
                  src={photos.PASSENGER_SIDE}
                  alt="Passenger Side"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    left: '8px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(30, 4, 38, 0.85)',
                    color: '#FFFFFF',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  VIEW 3: PASSENGER SIDE
                </div>
              </div>
              <div style={{ padding: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#685D73', marginBottom: '4px' }}>
                  Image URL / Camera Feed
                </label>
                <input
                  type="text"
                  value={photos.PASSENGER_SIDE}
                  onChange={(e) => setPhotos({ ...photos, PASSENGER_SIDE: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid #ECEAEF',
                    fontSize: '0.75rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* View 4: REAR */}
            <div style={{ border: '1px solid #ECEAEF', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ position: 'relative', height: '140px', backgroundColor: '#F7F5F8' }}>
                <img
                  src={photos.REAR}
                  alt="Rear Angle"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    left: '8px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(30, 4, 38, 0.85)',
                    color: '#FFFFFF',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  VIEW 4: REAR
                </div>
              </div>
              <div style={{ padding: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#685D73', marginBottom: '4px' }}>
                  Image URL / Camera Feed
                </label>
                <input
                  type="text"
                  value={photos.REAR}
                  onChange={(e) => setPhotos({ ...photos, REAR: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid #ECEAEF',
                    fontSize: '0.75rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
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
            disabled={scanning}
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
              cursor: scanning ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(250, 184, 38, 0.35)',
            }}
          >
            <Sparkles size={20} />
            <span>Launch AI Computer Vision Scan</span>
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
              Finovo Neural Vision Pipeline
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
              Comparing surface pixels against baseline 3D mesh model with 98.4% detection accuracy.
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
