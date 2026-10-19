import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { inspectionApi } from '../api/inspectionApi';
import type { InspectionRecord } from '../api/inspectionApi';
import {
  ShieldAlert,
  Search,
  RotateCcw,
  CheckCircle2,
  Camera,
  Sparkles,
  Eye,
} from 'lucide-react';
import {
  PageContainer,
  PageHeader,
  StatCard,
  StatGrid,
} from '../../../components/common';

export function InspectionsListPage() {
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'DAMAGE_DETECTED' | 'PRISTINE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadInspections();
  }, []);

  const loadInspections = async () => {
    try {
      setLoading(true);
      const res = await inspectionApi.getInspections();
      if (res.success) {
        setInspections(res.inspections);
      }
    } catch (err) {
      console.error('Failed to load inspections', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredInspections = inspections.filter((ins) => {
    if (filter === 'DAMAGE_DETECTED' && !ins.hasDamageDetected) return false;
    if (filter === 'PRISTINE' && ins.hasDamageDetected) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      ins.vehicle.brand.toLowerCase().includes(q) ||
      ins.vehicle.model.toLowerCase().includes(q) ||
      ins.vehicle.registrationNumber.toLowerCase().includes(q) ||
      (ins.rental?.booking.bookingNumber && ins.rental.booking.bookingNumber.toLowerCase().includes(q))
    );
  });

  const totalInspections = inspections.length;
  const damageFlaggedCount = inspections.filter((i) => i.hasDamageDetected).length;
  const averageScore = totalInspections
    ? Math.round((inspections.reduce((acc, curr) => acc + curr.overallScore, 0) / totalInspections) * 10) / 10
    : 100;

  return (
    <PageContainer>
      {/* Header & Quick Action */}
      <PageHeader
        title="AI Vehicle Condition & Damage Inspections"
        subtitle="Automated multi-angle computer vision surface inspection, anomaly detection, scratch/dent localization, and repair estimation."
        breadcrumbs={[
          { label: 'Admin', to: '/admin/dashboard' },
          { label: 'AI Inspections' },
        ]}
        badge={
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '6px',
              backgroundColor: 'rgba(250, 184, 38, 0.2)',
              color: '#B45309',
              fontSize: '0.75rem',
              fontWeight: 800,
            }}
          >
            <Sparkles size={12} /> Computer Vision
          </span>
        }
        actions={
          <Link
            to="/admin/inspections/new"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 22px',
              backgroundColor: '#FAB826',
              color: '#1E0426',
              border: 'none',
              borderRadius: '10px',
              fontSize: '0.875rem',
              fontWeight: 800,
              textDecoration: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(250, 184, 38, 0.3)',
            }}
          >
            <Camera size={18} />
            <span>New AI Inspection Scan</span>
          </Link>
        }
      />

      {/* KPI Stats Cards */}
      <StatGrid columns={3}>
        <StatCard
          icon={Camera}
          label="Total Scans Performed"
          value={totalInspections}
          variant="purple"
        />
        <StatCard
          icon={CheckCircle2}
          label="Avg AI Condition Score"
          value={`${averageScore}%`}
          variant="green"
        />
        <StatCard
          icon={ShieldAlert}
          label="Damage Anomalies Flagged"
          value={damageFlaggedCount}
          variant={damageFlaggedCount > 0 ? 'red' : 'green'}
        />
      </StatGrid>

      {/* Filter Tabs & Search Bar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          padding: '16px 20px',
          border: '1px solid #ECEAEF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['ALL', 'DAMAGE_DETECTED', 'PRISTINE'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: filter === tab ? '#1E0426' : '#F7F5F8',
                color: filter === tab ? '#FFFFFF' : '#685D73',
                fontWeight: 600,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {tab === 'ALL'
                ? `All Scans (${inspections.length})`
                : tab === 'DAMAGE_DETECTED'
                  ? `Flagged Damage (${damageFlaggedCount})`
                  : 'Pristine Surface (Passed)'}
            </button>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#F7F5F8',
            borderRadius: '10px',
            padding: '8px 14px',
            border: '1px solid #ECEAEF',
            width: '320px',
          }}
        >
          <Search size={16} color="#685D73" />
          <input
            type="text"
            placeholder="Search vehicle, plate, booking..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '0.875rem',
              width: '100%',
              color: '#1E0426',
            }}
          />
        </div>
      </div>

      {/* Inspections Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #ECEAEF',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#685D73' }}>
            <RotateCcw size={24} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
            <div style={{ marginTop: '12px', fontWeight: 600 }}>Loading inspection scans...</div>
          </div>
        ) : filteredInspections.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#685D73' }}>
            <Camera size={40} color="#D1D5DB" style={{ marginBottom: '12px' }} />
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1E0426' }}>No inspection sessions found</div>
            <p style={{ margin: '6px 0 0', fontSize: '0.875rem' }}>
              Launch an AI inspection scan to record multi-view vehicle exterior photos.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#FAF9FB', borderBottom: '1px solid #ECEAEF', color: '#685D73' }}>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Scan Type & Date</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Vehicle</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Rental Agreement</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>AI Vision Score</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Findings</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInspections.map((ins) => {
                  const hasDamage = ins.hasDamageDetected;
                  return (
                    <tr
                      key={ins.id}
                      style={{
                        borderBottom: '1px solid #ECEAEF',
                        transition: 'background-color 0.15s',
                      }}
                    >
                      {/* Scan Type & Date */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              backgroundColor:
                                ins.type === 'RETURN'
                                  ? 'rgba(239, 68, 68, 0.12)'
                                  : ins.type === 'PICKUP'
                                    ? 'rgba(16, 185, 129, 0.12)'
                                    : 'rgba(99, 102, 241, 0.12)',
                              color:
                                ins.type === 'RETURN'
                                  ? '#DC2626'
                                  : ins.type === 'PICKUP'
                                    ? '#059669'
                                    : '#4F46E5',
                            }}
                          >
                            {ins.type} SCAN
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#685D73', marginTop: '4px' }}>
                          {new Date(ins.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Vehicle */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img
                            src={ins.vehicle.primaryImageUrl || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=120&q=80'}
                            alt=""
                            style={{
                              width: '46px',
                              height: '32px',
                              borderRadius: '6px',
                              objectFit: 'cover',
                              backgroundColor: '#ECEAEF',
                            }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, color: '#1E0426' }}>
                              {ins.vehicle.brand} {ins.vehicle.model}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#685D73' }}>
                              {ins.vehicle.registrationNumber}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Rental / Customer */}
                      <td style={{ padding: '16px 20px' }}>
                        {ins.rental ? (
                          <>
                            <div style={{ fontWeight: 600, color: '#1E0426' }}>
                              {ins.rental.booking.bookingNumber}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#685D73' }}>
                              {ins.rental.booking.customer.fullName}
                            </div>
                          </>
                        ) : (
                          <div style={{ fontSize: '0.8125rem', color: '#685D73' }}>
                            Standalone Fleet Audit
                          </div>
                        )}
                      </td>

                      {/* AI Score */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              fontWeight: 800,
                              fontSize: '0.95rem',
                              color: hasDamage ? '#DC2626' : '#059669',
                            }}
                          >
                            {ins.overallScore}%
                          </div>
                        </div>
                        <div
                          style={{
                            width: '100px',
                            height: '6px',
                            backgroundColor: '#ECEAEF',
                            borderRadius: '3px',
                            overflow: 'hidden',
                            marginTop: '4px',
                          }}
                        >
                          <div
                            style={{
                              width: `${ins.overallScore}%`,
                              height: '100%',
                              backgroundColor: hasDamage ? '#EF4444' : '#10B981',
                              borderRadius: '3px',
                            }}
                          />
                        </div>
                      </td>

                      {/* Findings */}
                      <td style={{ padding: '16px 20px' }}>
                        {hasDamage ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                color: '#DC2626',
                              }}
                            >
                              <ShieldAlert size={12} />
                              {ins.findings.length} Issue{ins.findings.length !== 1 ? 's' : ''} Detected
                            </span>
                          </div>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              backgroundColor: 'rgba(16, 185, 129, 0.1)',
                              color: '#059669',
                            }}
                          >
                            <CheckCircle2 size={12} />
                            Pristine (0 Defects)
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <Link
                          to={`/admin/inspections/${ins.id}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 14px',
                            backgroundColor: '#1E0426',
                            color: '#FFFFFF',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textDecoration: 'none',
                          }}
                        >
                          <Eye size={13} />
                          <span>Inspect Views</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
