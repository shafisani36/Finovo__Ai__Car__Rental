import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi, type DashboardOverviewResponse } from '../api/dashboardApi';
import {
  PageContainer,
  PageHeader,
  StatCard,
  StatGrid,
  StatusBadge,
  ResponsiveTable,
  LoadingState,
} from '../../../components/common';
import {
  Car,
  CheckCircle2,
  Clock,
  Wrench,
  TrendingUp,
  DollarSign,
  Plus,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
  Calendar,
  Building2,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';


export function AdminDashboardPage() {
  const [data, setData] = useState<DashboardOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadDashboard = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const res = await dashboardApi.getOverview();
      setData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load executive dashboard data';
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);


  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoStr;
    }
  };

  if (isLoading && !data) {
    return (
      <PageContainer>
        <LoadingState message="Loading executive analytics and fleet telemetry..." minHeight="400px" />
      </PageContainer>
    );
  }

  if (error && !data) {
    return (
      <PageContainer>
        <div
          style={{
            maxWidth: '600px',
            margin: '40px auto',
            padding: '32px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #FECACA',
            borderRadius: '16px',
            textAlign: 'center',
            boxShadow: '0 4px 16px rgba(220, 38, 38, 0.08)',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: '#FEF2F2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <AlertTriangle size={32} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#991B1B', marginBottom: '8px' }}>
            Unable to Load Executive Dashboard
          </h3>
          <p style={{ color: '#66566A', marginBottom: '24px', fontSize: '0.9rem' }}>{error}</p>
          <button
            onClick={() => loadDashboard()}
            style={{
              backgroundColor: '#1E0426',
              color: '#FFFFFF',
              padding: '10px 24px',
              borderRadius: '10px',
              border: 'none',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(30, 4, 38, 0.2)',
            }}
          >
            Retry Connection
          </button>
        </div>
      </PageContainer>
    );
  }

  const { fleet, operations, financials, inspections, categories, branches, recentBookings, recentActivity } = data!;

  return (
    <PageContainer>
      {/* ================= TOP HEADER ================= */}
      <PageHeader
        title="Executive Overview"
        subtitle="Real-time operations, fleet utilization, revenue performance, and AI inspection monitoring"
        breadcrumbs={[
          { label: 'Admin', to: '/admin/dashboard' },
          { label: 'Dashboard' },
        ]}
        actions={
          <>
            <button
              onClick={() => loadDashboard(true)}
              disabled={isRefreshing}
              title="Refresh live data"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #ECEAEF',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#1C0324',
                cursor: isRefreshing ? 'wait' : 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
              }}
            >
              <RefreshCw size={15} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
              <span>{isRefreshing ? 'Updating...' : 'Sync Data'}</span>
            </button>

            <Link
              to="/admin/cars"
              style={{
                backgroundColor: '#FFFFFF',
                color: '#1A0322',
                fontWeight: 700,
                fontSize: '0.9rem',
                padding: '10px 18px',
                borderRadius: '10px',
                border: '1px solid #ECEAEF',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
              }}
            >
              <Car size={16} />
              <span>Fleet View</span>
            </Link>

            <Link
              to="/admin/cars/new"
              style={{
                backgroundColor: '#FAB826',
                color: '#1A0322',
                fontWeight: 700,
                fontSize: '0.9rem',
                padding: '10px 20px',
                borderRadius: '10px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(250, 184, 38, 0.35)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E5A61F')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FAB826')}
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Add Car</span>
            </Link>
          </>
        }
      />

      {/* ================= 6 STATS KPI CARDS ================= */}
      <StatGrid>
        <StatCard
          label="Total Fleet"
          value={fleet.total}
          icon={Car}
          variant="purple"
          subtext="Total vehicles registered"
        />
        <StatCard
          label="Available"
          value={fleet.available}
          icon={CheckCircle2}
          variant="green"
          subtext="Ready for instant booking"
        />
        <StatCard
          label="Rented Out"
          value={fleet.rented}
          icon={Clock}
          variant="blue"
          subtext="Active on trips"
        />
        <StatCard
          label="In Service"
          value={fleet.maintenance}
          icon={Wrench}
          variant="amber"
          subtext="Scheduled inspection/repairs"
        />
        <StatCard
          label="Utilization Rate"
          value={`${fleet.utilizationRate}%`}
          icon={TrendingUp}
          variant="purple"
          subtext="Fleet operational efficiency"
        />
        <StatCard
          label="Monthly Revenue"
          value={`$${financials.monthlyRevenue.toLocaleString()}`}
          icon={DollarSign}
          variant="gold"
          subtext="Gross bookings this month"
        />
      </StatGrid>


      {/* ================= 2-COLUMN OPERATIONAL & AI MONITOR ================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '20px',
          marginBottom: '28px',
        }}
      >
        {/* Left Column: Today's Operations & Dispatch */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #ECEAEF',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="#6C1E84" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#1A0322' }}>
                Today's Dispatch & Turnaround
              </h3>
            </div>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#6C1E84',
                backgroundColor: '#FAF5FB',
                padding: '4px 8px',
                borderRadius: '6px',
              }}
            >
              {operations.upcomingBookings} Bookings Pending
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
            <div style={{ backgroundColor: '#F9FAFB', padding: '12px 14px', borderRadius: '10px', border: '1px solid #F3F4F6' }}>
              <div style={{ fontSize: '0.78rem', color: '#6B7280', fontWeight: 600 }}>Scheduled Pickups Today</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#111827', marginTop: '2px' }}>
                {operations.todaysPickups}
              </div>
            </div>
            <div style={{ backgroundColor: '#F9FAFB', padding: '12px 14px', borderRadius: '10px', border: '1px solid #F3F4F6' }}>
              <div style={{ fontSize: '0.78rem', color: '#6B7280', fontWeight: 600 }}>Expected Returns Today</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#111827', marginTop: '2px' }}>
                {operations.todaysReturns}
              </div>
            </div>
          </div>

          {/* Quick Fleet Category Progress */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151', marginBottom: '10px' }}>
              Fleet Availability by Category
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {categories.map((cat) => {
                const pct = cat.totalVehicles > 0 ? Math.round((cat.available / cat.totalVehicles) * 100) : 0;
                return (
                  <div key={cat.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '3px' }}>
                      <span style={{ fontWeight: 600, color: '#1F2937' }}>{cat.name}</span>
                      <span style={{ color: '#6B7280' }}>
                        {cat.available} / {cat.totalVehicles} available (${cat.baseRate}/day)
                      </span>
                    </div>
                    <div style={{ height: '7px', backgroundColor: '#F3F4F6', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          backgroundColor: pct > 50 ? '#059669' : pct > 0 ? '#2563EB' : '#D97706',
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: AI Inspection & Damage Findings Monitor */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #ECEAEF',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} color="#D97706" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#1A0322' }}>
                  AI Inspection & Damage Review
                </h3>
              </div>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: inspections.damaged > 0 ? '#B45309' : '#059669',
                  backgroundColor: inspections.damaged > 0 ? '#FFFBEB' : '#ECFDF5',
                  padding: '4px 8px',
                  borderRadius: '6px',
                }}
              >
                {inspections.damaged} Flagged Finding
              </span>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '0 0 16px 0' }}>
              Human-in-the-loop verification pipeline for AI computer vision damage predictions
            </p>

            {inspections.pendingReviewFindings.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {inspections.pendingReviewFindings.map((finding) => (
                  <div
                    key={finding.id}
                    style={{
                      border: '1px solid #FDE68A',
                      backgroundColor: '#FFFDF5',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1F2937' }}>
                          {finding.vehicle.name}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#6B7280', backgroundColor: '#F3F4F6', padding: '2px 6px', borderRadius: '4px' }}>
                          {finding.vehicle.registration}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#B45309', fontWeight: 600 }}>
                        {finding.damageType} — {finding.location}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#78716C', marginTop: '2px' }}>
                        AI Confidence: <strong>{finding.confidence}%</strong> • Status: {finding.humanDecision}
                      </div>
                    </div>

                    <Link
                      to={`/admin/cars/${finding.vehicle.id}`}
                      style={{
                        backgroundColor: '#FAB826',
                        color: '#1C0324',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 6px rgba(250, 184, 38, 0.25)',
                      }}
                    >
                      Review
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '28px 20px', color: '#6B7280', fontSize: '0.875rem' }}>
                <CheckCircle2 size={32} color="#059669" style={{ margin: '0 auto 8px' }} />
                <div>All AI inspection scans verified. No outstanding damage claims!</div>
              </div>
            )}
          </div>

          {/* Operational Branches Strip */}
          <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '16px', marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: '#4B5563', marginBottom: '8px' }}>
              <Building2 size={15} />
              <span>Rental Branches</span>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {branches.map((b) => (
                <div key={b.id} style={{ fontSize: '0.78rem', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '4px 10px' }}>
                  <strong style={{ color: '#111827' }}>{b.name}</strong> ({b.totalVehicles} cars)
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ================= RECENT BOOKINGS TABLE ================= */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #ECEAEF',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          marginBottom: '28px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 4px 0', color: '#1A0322' }}>
              Recent Bookings & Allocations
            </h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#66566A' }}>
              Live customer reservations, vehicle assignments, and payment statuses
            </p>
          </div>

          <Link
            to="/admin/cars"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.875rem',
              fontWeight: 700,
              color: '#6C1E84',
              textDecoration: 'none',
            }}
          >
            <span>View All Fleet</span>
            <ChevronRight size={16} />
          </Link>
        </div>

        {/* Responsive Table */}
        <ResponsiveTable>
          <table className="finovo-table">
            <thead>
              <tr>
                <th>Booking</th>
                <th>Vehicle</th>
                <th>Customer</th>
                <th>Pickup Date</th>
                <th>Total Amount</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.map((b) => (
                <tr key={b.id}>
                  <td style={{ fontWeight: 700, color: '#1F2937' }}>
                    {b.bookingNumber}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {b.vehicleImage ? (
                        <img
                          src={b.vehicleImage}
                          alt={b.vehicleName}
                          style={{ width: '42px', height: '28px', objectFit: 'contain' }}
                        />
                      ) : (
                        <Car size={20} color="#6C1E84" />
                      )}
                      <div>
                        <div style={{ fontWeight: 700, color: '#111827' }}>{b.vehicleName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{b.vehicleCategory}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{b.customerName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{b.customerEmail}</div>
                  </td>
                  <td style={{ color: '#4B5563' }}>
                    {formatDate(b.pickupDateTime)}
                  </td>
                  <td style={{ fontWeight: 700, color: '#111827' }}>
                    ${b.totalAmount.toFixed(2)}
                  </td>
                  <td>
                    <StatusBadge status={b.status} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Link
                      to="/admin/cars"
                      style={{
                        color: '#6C1E84',
                        fontWeight: 600,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>Manage</span>
                      <ExternalLink size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ResponsiveTable>
      </div>

      {/* ================= REAL-TIME SYSTEM ACTIVITY FEED ================= */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #ECEAEF',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <TrendingUp size={18} color="#6C1E84" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#1A0322' }}>
            Live System Activity Feed & Audit Trail
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {recentActivity.map((act) => (
            <div
              key={act.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                backgroundColor: '#F9FAFB',
                borderRadius: '10px',
                border: '1px solid #F3F4F6',
                fontSize: '0.85rem',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#6C1E84',
                    flexShrink: 0,
                  }}
                />
                <div>
                  <strong style={{ color: '#111827' }}>{act.event.replace(/_/g, ' ')}</strong>
                  <span style={{ color: '#6B7280', marginLeft: '6px' }}>by {act.user}</span>
                  {act.metadata && (
                    <span style={{ color: '#4B5563', marginLeft: '6px', fontSize: '0.8rem' }}>
                      ({Object.entries(act.metadata).map(([k, v]) => `${k}: ${v}`).join(', ')})
                    </span>
                  )}
                </div>
              </div>
              <span style={{ color: '#9CA3AF', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                {formatDate(act.timestamp)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Animation spinner style */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </PageContainer>
  );
}

