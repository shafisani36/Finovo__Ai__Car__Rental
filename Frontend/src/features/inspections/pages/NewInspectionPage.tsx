import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Loader2, ScanLine } from 'lucide-react';
import { PageContainer, PageHeader } from '../../../components/common';
import { CustomSelect } from '../../../components/common/CustomSelect';
import { fleetApi } from '../../fleet/api/fleetApi';
import { inspectionApi } from '../api/inspectionApi';
import { VehiclePhotoCapture } from '../components/VehiclePhotoCapture';
import { toAnalyzePhotos, type CapturedPhotos } from '../components/inspectionHelpers';

interface VehicleOption {
  value: string;
  label: string;
  sublabel?: string;
}

/**
 * Routine (fleet) inspection of any car outside a rental, e.g. after a garage repair.
 * Pickup and return inspections are done from the handover and return screens.
 */
export function NewInspectionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [vehicleId, setVehicleId] = useState(searchParams.get('vehicleId') || '');
  const [photos, setPhotos] = useState<CapturedPhotos>({});
  const [notes, setNotes] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fleetApi
      .getVehicles({ limit: 100 })
      .then((res) => {
        if (!active) return;
        setVehicles(
          (res.vehicles || []).map((v: { id: string; brand: string; model: string; registrationNumber: string; year: number }) => ({
            value: v.id,
            label: `${v.brand} ${v.model} (${v.year})`,
            sublabel: v.registrationNumber,
          }))
        );
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load vehicles');
      });
    return () => {
      active = false;
    };
  }, []);

  const photoCount = Object.keys(photos).length;

  const runScan = async () => {
    if (!vehicleId || photoCount === 0) return;
    setScanning(true);
    setError(null);
    try {
      const res = await inspectionApi.analyze({
        type: 'ROUTINE',
        vehicleId,
        notes: notes || undefined,
        photos: toAnalyzePhotos(photos),
      });
      navigate(`/admin/inspections/${res.inspection.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The AI inspection failed. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: 'Inspections', href: '/admin/inspections' }, { label: 'New routine inspection' }]}
        title="New routine inspection"
        subtitle="Check any car's condition with AI, for example after a garage repair. Pickup and return inspections are done from the handover and return screens."
      />

      {error && (
        <div
          role="alert"
          style={{
            border: '1px solid #EF4444',
            backgroundColor: 'rgba(239, 68, 68, 0.06)',
            borderRadius: '12px',
            padding: '14px 18px',
            color: '#B91C1C',
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            fontWeight: 600,
          }}
        >
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      <section
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #ECEAEF',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '6px', fontWeight: 600, color: '#1E0426' }}>
          Vehicle
          <CustomSelect
            value={vehicleId}
            onChange={(v) => setVehicleId(String(v))}
            options={vehicles}
            placeholder="Select a vehicle"
            searchable
            size="md"
          />
        </div>

        <VehiclePhotoCapture value={photos} onChange={setPhotos} disabled={scanning} />

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Inspector notes (optional)"
          rows={2}
          disabled={scanning}
          style={{ width: '100%', borderRadius: '10px', border: '1px solid #ECEAEF', padding: '10px', boxSizing: 'border-box', fontFamily: 'inherit' }}
        />

        {scanning ? (
          <div className="insp-progress" role="status">
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            AI is inspecting the photos. This usually takes 10-60 seconds…
          </div>
        ) : (
          <button
            type="button"
            onClick={runScan}
            disabled={!vehicleId || photoCount === 0}
            style={{
              alignSelf: 'flex-start',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 22px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: '#1E0426',
              color: '#FFFFFF',
              fontWeight: 700,
              cursor: 'pointer',
              opacity: vehicleId && photoCount > 0 ? 1 : 0.5,
            }}
          >
            <ScanLine size={18} /> Run AI inspection
          </button>
        )}
      </section>
    </PageContainer>
  );
}
