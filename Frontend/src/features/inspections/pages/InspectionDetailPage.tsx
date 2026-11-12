import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { PageContainer, PageHeader } from '../../../components/common';
import { inspectionApi, type DamageComparison, type InspectionReport } from '../api/inspectionApi';
import { InspectionReportView } from '../components/InspectionReportView';
import { DamageComparisonView } from '../components/DamageComparisonView';

export function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [inspection, setInspection] = useState<InspectionReport | null>(null);
  const [comparison, setComparison] = useState<DamageComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await inspectionApi.getInspectionById(id);
        if (!active) return;
        setInspection(res.inspection);
        setComparison(res.inspection.comparison || null);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load inspection');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: '80px', textAlign: 'center', color: '#685D73' }}>
        <RotateCcw size={28} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!inspection) {
    return (
      <div style={{ maxWidth: '700px', margin: '40px auto', textAlign: 'center' }}>
        <AlertTriangle size={44} color="#EF4444" />
        <h2 style={{ color: '#1E0426' }}>Inspection not found</h2>
        <p style={{ color: '#685D73' }}>{error}</p>
        <Link to="/admin/inspections">Back to inspections</Link>
      </div>
    );
  }

  // A return inspection can still be edited (waive fines) until the rental is closed
  const editable = comparison ? !['APPROVED', 'REJECTED'].includes(comparison.status) : false;

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: 'Inspections', href: '/admin/inspections' }, { label: inspection.id.slice(0, 10) }]}
        title={`${inspection.type.charAt(0)}${inspection.type.slice(1).toLowerCase()} inspection`}
        subtitle={
          inspection.vehicle
            ? `${inspection.vehicle.brand} ${inspection.vehicle.model} · ${inspection.vehicle.registrationNumber}`
            : undefined
        }
      />
      {comparison ? (
        <DamageComparisonView comparison={comparison} onChange={setComparison} editable={editable} />
      ) : (
        <InspectionReportView report={inspection} />
      )}
    </PageContainer>
  );
}
