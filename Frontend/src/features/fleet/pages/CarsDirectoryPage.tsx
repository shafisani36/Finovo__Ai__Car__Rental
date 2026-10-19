import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { fleetApi } from '../api/fleetApi';
import type { Vehicle, FleetMetrics, VehicleCategory, FleetDashboardStats } from '../types/fleet.types';
import {
  PageContainer,
  PageHeader,
  StatCard,
  StatGrid,
  StatusBadge,
} from '../../../components/common';
import {
  Car,
  CheckCircle2,
  Clock,
  Wrench,
  Search,
  RotateCcw,
  Plus,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Shield,
  AlertTriangle,
  Archive,
  LayoutGrid,
  List,
  Users,
  Fuel,
  DoorOpen,
} from 'lucide-react';
import { useConfirm } from '../../../components/common/ConfirmModal';
import { CustomSelect } from '../../../components/common/CustomSelect';


export function CarsDirectoryPage() {
  const navigate = useNavigate();
  const { confirm } = useConfirm();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false));

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const effectiveViewMode = isMobile ? 'grid' : viewMode;
  const [metrics, setMetrics] = useState<FleetMetrics>({
    total: 0,
    available: 0,
    rented: 0,
    maintenance: 0,
    archived: 0,
  });
  const [dashboardStats, setDashboardStats] = useState<FleetDashboardStats['metrics']>({
    total: 0,
    available: 0,
    rented: 0,
    maintenance: 0,
    archived: 0,
    expiredDocuments: 0,
    expiringSoonDocuments: 0,
    maintenanceDue: 0,
  });
  const [categories, setCategories] = useState<VehicleCategory[]>([]);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalVehicles, setTotalVehicles] = useState(0);

  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [vehRes, statsRes, catRes] = await Promise.all([
        fleetApi.getVehicles({
          page,
          limit,
          search: search.trim() || undefined,
          category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
          status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        }),
        fleetApi.getDashboardStats().catch(() => null),
        fleetApi.getCategories(),
      ]);

      if (vehRes?.vehicles) {
        setVehicles(vehRes.vehicles);
        setTotalVehicles(vehRes.pagination.total);
      }
      if (statsRes?.metrics) {
        setDashboardStats(statsRes.metrics);
        setMetrics({
          total: statsRes.metrics.total,
          available: statsRes.metrics.available,
          rented: statsRes.metrics.rented,
          maintenance: statsRes.metrics.maintenance,
          archived: statsRes.metrics.archived,
        });
      }
      if (catRes?.categories) {
        setCategories(catRes.categories);
      }
    } catch (err) {
      console.error('Failed to load fleet data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, selectedCategory, selectedStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('ALL');
    setSelectedStatus('ALL');
    setPage(1);
  };

  const handleDelete = async (id: string) => {
    try {
      await fleetApi.deleteVehicle(id);
      await loadData();
    } catch (err) {
      console.error('Failed to delete vehicle:', err);
    }
  };

  const handleArchiveToggle = async (v: Vehicle) => {
    try {
      if (v.status === 'ARCHIVED') {
        const ok = await confirm({
          title: `Restore ${v.brand} ${v.model}?`,
          message: 'This will restore the vehicle back to active fleet directory and make it eligible for customer bookings.',
          confirmText: 'Restore Vehicle',
          cancelText: 'Cancel',
          variant: 'success',
        });
        if (!ok) return;
        await fleetApi.restoreVehicle(v.id);
      } else {
        const ok = await confirm({
          title: `Archive ${v.brand} ${v.model}?`,
          message: 'This will verify no active bookings exist and hide it from customer listings. You can restore it anytime.',
          confirmText: 'Archive Vehicle',
          cancelText: 'Cancel',
          variant: 'warning',
        });
        if (!ok) return;
        await fleetApi.archiveVehicle(v.id, 'Archived from fleet directory');
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    }
  };

  const handleDeleteWithConfirm = async (v: Vehicle) => {
    const ok = await confirm({
      title: `Delete ${v.brand} ${v.model}?`,
      message: 'Are you sure you want to permanently remove this vehicle from active fleet management? This will preserve historical rental contracts while archiving the car.',
      confirmText: 'Delete Vehicle',
      cancelText: 'Keep Vehicle',
      variant: 'danger',
      note: 'Active rentals or reservations must be completed before removal.',
    });
    if (!ok) return;
    await handleDelete(v.id);
  };


  const renderStatusBadge = (status: Vehicle['status']) => (
    <StatusBadge status={status} />
  );


  return (
    <PageContainer>
      {/* ================= HEADER ROW ================= */}
      <PageHeader
        title="Fleet Directory"
        subtitle="Manage your luxury vehicle fleet, track live availability, and onboard new vehicles."
        breadcrumbs={[
          { label: 'Admin', to: '/admin/dashboard' },
          { label: 'Fleet' },
        ]}
        actions={
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
              transition: 'background-color 0.2s, transform 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#E5A61F';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FAB826';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add Car</span>
          </Link>
        }
      />


      {/* ================= 6 METRIC CARDS ROW ================= */}
      <StatGrid columns={6} style={{ marginBottom: '28px' }}>
        <StatCard
          icon={Car}
          label="Total Fleet"
          value={metrics.total}
          variant="purple"
        />
        <StatCard
          icon={CheckCircle2}
          label="Available"
          value={metrics.available}
          variant="green"
        />
        <StatCard
          icon={Clock}
          label="Rented"
          value={metrics.rented}
          variant="blue"
        />
        <StatCard
          icon={Wrench}
          label="In Maintenance"
          value={metrics.maintenance}
          variant="amber"
        />
        <StatCard
          icon={Shield}
          label={dashboardStats.expiredDocuments > 0 ? `${dashboardStats.expiredDocuments} Expired Docs` : 'Expiring Docs'}
          value={dashboardStats.expiredDocuments + dashboardStats.expiringSoonDocuments}
          variant={dashboardStats.expiredDocuments > 0 ? 'red' : dashboardStats.expiringSoonDocuments > 0 ? 'amber' : 'green'}
        />
        <StatCard
          icon={AlertTriangle}
          label="Service Due"
          value={dashboardStats.maintenanceDue}
          variant={dashboardStats.maintenanceDue > 0 ? 'amber' : 'purple'}
        />
      </StatGrid>

      {/* ================= MAIN TABLE CONTAINER ================= */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          boxShadow: '0 4px 20px rgba(46, 7, 56, 0.05)',
          border: '1px solid #ECE7ED',
          overflow: 'hidden',
        }}
      >
        {/* Filter Controls Row */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #ECE7ED',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          {/* Search Box */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              flex: '1 1 340px',
              maxWidth: '440px',
            }}
          >
            <Search size={16} color="#8A7090" style={{ position: 'absolute', left: '14px' }} />
            <input
              type="text"
              placeholder="Search by brand, model, or registration number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                height: '40px',
                paddingLeft: '38px',
                paddingRight: '14px',
                fontSize: '0.875rem',
                backgroundColor: '#F8F6F9',
                border: '1px solid #EBE5ED',
                borderRadius: '10px',
                outline: 'none',
                color: '#1C0324',
              }}
            />
          </div>

          {/* Dropdown Filters & Reset */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Category Dropdown */}
            <div style={{ minWidth: '180px' }}>
              <CustomSelect
                value={selectedCategory}
                onChange={(val) => {
                  setSelectedCategory(val);
                  setPage(1);
                }}
                options={[
                  { value: 'ALL', label: 'All Categories' },
                  ...categories.map((c) => ({ value: c.slug, label: c.name })),
                ]}
                size="sm"
                searchable={true}
                searchPlaceholder="Search category..."
                fullWidth
              />
            </div>

            {/* Status Dropdown */}
            <div style={{ minWidth: '170px' }}>
              <CustomSelect
                value={selectedStatus}
                onChange={(val) => {
                  setSelectedStatus(val);
                  setPage(1);
                }}
                options={[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'AVAILABLE', label: 'Available', badge: 'Active', badgeColor: '#DEF7EC' },
                  { value: 'RENTED', label: 'On Rental', badge: 'Busy', badgeColor: '#FEF3C7' },
                  { value: 'MAINTENANCE', label: 'In Service', badge: 'Maint', badgeColor: '#FEE2E2' },
                  { value: 'RESERVED', label: 'Reserved', badge: 'Hold', badgeColor: '#DBEAFE' },
                  { value: 'ARCHIVED', label: 'Archived', badge: 'Hidden', badgeColor: '#F3F4F6' },
                ]}
                size="sm"
                fullWidth
              />
            </div>

            {/* Reset Button */}
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                height: '40px',
                padding: '0 14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5DFE7',
                borderRadius: '10px',
                color: '#66566A',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FAF8F9')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>

            {/* View Toggle (Desktop Only) */}
            {!isMobile && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#FAF8F9',
                  border: '1px solid #ECE7ED',
                  borderRadius: '10px',
                  padding: '3px',
                  height: '40px',
                  boxSizing: 'border-box',
                }}
              >
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0 12px',
                    height: '100%',
                    borderRadius: '7px',
                    border: 'none',
                    backgroundColor: effectiveViewMode === 'table' ? '#6C1E84' : 'transparent',
                    color: effectiveViewMode === 'table' ? '#FFFFFF' : '#66566A',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <List size={15} />
                  <span>Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0 12px',
                    height: '100%',
                    borderRadius: '7px',
                    border: 'none',
                    backgroundColor: effectiveViewMode === 'grid' ? '#6C1E84' : 'transparent',
                    color: effectiveViewMode === 'grid' ? '#FFFFFF' : '#66566A',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <LayoutGrid size={15} />
                  <span>Grid</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Data View: Table or Grid Cards */}
        {effectiveViewMode === 'table' ? (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.875rem',
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: '#FAF9FB',
                    borderBottom: '1px solid #ECE7ED',
                    color: '#66566A',
                    fontWeight: 600,
                  }}
                >
                  <th style={{ width: '40px', padding: '14px 16px' }}>
                    <input type="checkbox" style={{ accentColor: '#6C1E84', cursor: 'pointer' }} />
                  </th>
                  <th style={{ padding: '14px 16px' }}>Car</th>
                  <th style={{ padding: '14px 16px' }}>Category</th>
                  <th style={{ padding: '14px 16px' }}>Year</th>
                  <th style={{ padding: '14px 16px' }}>Registration</th>
                  <th style={{ padding: '14px 16px' }}>Pricing</th>
                  <th style={{ padding: '14px 16px' }}>Status</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {vehicles.map((v) => (
                  <tr
                    key={v.id}
                    style={{
                      borderBottom: '1px solid #F0EDF2',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FAF8FB')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '16px' }}>
                      <input type="checkbox" style={{ accentColor: '#6C1E84', cursor: 'pointer' }} />
                    </td>

                    {/* Car Thumbnail + Name/Brand */}
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div
                          style={{
                            width: '54px',
                            height: '38px',
                            borderRadius: '8px',
                            backgroundColor: '#F3EEF6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            flexShrink: 0,
                          }}
                        >
                          <img
                            src={v.primaryImageUrl || '/cars/car-3-corolla-transparent.png'}
                            alt={v.model}
                            style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }}
                          />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#1A0322', fontSize: '0.925rem' }}>
                            {v.brand} {v.model}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#8A7090' }}>{v.brand}</div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td style={{ padding: '16px', color: '#4A3D4E', fontWeight: 500 }}>
                      {v.category?.name || 'Sedan'}
                    </td>

                    {/* Year */}
                    <td style={{ padding: '16px', color: '#4A3D4E', fontWeight: 500 }}>
                      {v.year}
                    </td>

                    {/* Registration Plate */}
                    <td style={{ padding: '16px', color: '#4A3D4E', fontFamily: 'monospace', fontWeight: 600 }}>
                      {v.registrationNumber}
                    </td>

                    {/* Pricing */}
                    <td style={{ padding: '16px', fontWeight: 700, color: '#1A0322' }}>
                      ${Number(v.dailyRate).toFixed(0)} / day
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '16px' }}>{renderStatusBadge(v.status)}</td>

                    {/* Actions */}
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        {/* View Action */}
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/cars/${v.id}`)}
                          title="View Car Details"
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: '#F8F6F9',
                            border: '1px solid #EBE5ED',
                            color: '#66566A',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'color 0.2s, border-color 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#6C1E84';
                            e.currentTarget.style.borderColor = '#6C1E84';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#66566A';
                            e.currentTarget.style.borderColor = '#EBE5ED';
                          }}
                        >
                          <Eye size={15} />
                        </button>

                        {/* Edit Action */}
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/cars/${v.id}/edit`)}
                          title="Edit Car"
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: '#F8F6F9',
                            border: '1px solid #EBE5ED',
                            color: '#66566A',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'color 0.2s, border-color 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#6C1E84';
                            e.currentTarget.style.borderColor = '#6C1E84';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#66566A';
                            e.currentTarget.style.borderColor = '#EBE5ED';
                          }}
                        >
                          <Pencil size={14} />
                        </button>

                        {/* Archive / Restore Action */}
                        <button
                          type="button"
                          onClick={() => handleArchiveToggle(v)}
                          title={v.status === 'ARCHIVED' ? 'Restore to Fleet' : 'Archive Vehicle'}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: '#F8F6F9',
                            border: '1px solid #EBE5ED',
                            color: '#66566A',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'color 0.2s, border-color 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#6C1E84';
                            e.currentTarget.style.borderColor = '#6C1E84';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#66566A';
                            e.currentTarget.style.borderColor = '#EBE5ED';
                          }}
                        >
                          {v.status === 'ARCHIVED' ? <RotateCcw size={14} /> : <Archive size={14} />}
                        </button>

                        {/* Delete Action */}
                        <button
                          type="button"
                          onClick={() => handleDeleteWithConfirm(v)}
                          title="Delete Car"
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: '#FDF2F2',
                            border: '1px solid #F8B4B4',
                            color: '#E02424',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FDE8E8')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FDF2F2')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {vehicles.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: '#8A7090' }}>
                      {isLoading ? 'Loading vehicles...' : 'No vehicles found matching current criteria.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* ================= GRID VIEW (MODERN LUXURY CARDS) ================= */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
              gap: isMobile ? '16px' : '20px',
              padding: isMobile ? '14px' : '24px',
            }}
          >
            {vehicles.map((v) => (
              <div
                key={v.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #EFEAEF',
                  boxShadow: '0 2px 10px rgba(30, 4, 50, 0.03)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(108, 30, 132, 0.08)';
                  e.currentTarget.style.borderColor = '#DACEDE';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 2px 10px rgba(30, 4, 50, 0.03)';
                  e.currentTarget.style.borderColor = '#EFEAEF';
                }}
              >
                {/* Card Image Banner */}
                <div
                  style={{
                    position: 'relative',
                    height: isMobile ? '160px' : '175px',
                    background: 'linear-gradient(180deg, #F9F6FA 0%, #F1E9F5 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '14px',
                    borderBottom: '1px solid #F0EDF2',
                  }}
                >
                  <img
                    src={v.primaryImageUrl || '/cars/car-3-corolla-transparent.png'}
                    alt={`${v.brand} ${v.model}`}
                    style={{
                      maxWidth: '92%',
                      maxHeight: '92%',
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 6px 12px rgba(30, 4, 50, 0.12))',
                      transition: 'transform 0.3s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  />

                  {/* Top Badges */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        backgroundColor: 'rgba(255, 255, 255, 0.92)',
                        backdropFilter: 'blur(4px)',
                        color: '#6C1E84',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '8px',
                        border: '1px solid rgba(108, 30, 132, 0.15)',
                      }}
                    >
                      {v.category?.name || 'Sedan'}
                    </span>
                  </div>

                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                    }}
                  >
                    {renderStatusBadge(v.status)}
                  </div>
                </div>

                {/* Card Body */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: '1.05rem',
                          fontWeight: 700,
                          color: '#1A0322',
                          lineHeight: 1.3,
                        }}
                      >
                        {v.brand} {v.model}
                      </h3>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          color: '#8A7090',
                          fontWeight: 600,
                          backgroundColor: '#FAF7FB',
                          padding: '2px 7px',
                          borderRadius: '6px',
                          border: '1px solid #ECE7ED',
                          flexShrink: 0,
                        }}
                      >
                        {v.year}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: '4px',
                        fontSize: '0.78rem',
                        color: '#66566A',
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        letterSpacing: '0.5px',
                      }}
                    >
                      Plate: {v.registrationNumber}
                    </div>
                  </div>

                  {/* Specs Pills */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px',
                      padding: '8px 0',
                      borderTop: '1px solid #F4F1F5',
                      borderBottom: '1px solid #F4F1F5',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '0.76rem',
                        color: '#554458',
                        backgroundColor: '#FAF8FB',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid #EDE8EF',
                      }}
                    >
                      <Users size={12} color="#6C1E84" />
                      <span>{v.seats || 5} Seats</span>
                    </span>

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '0.76rem',
                        color: '#554458',
                        backgroundColor: '#FAF8FB',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid #EDE8EF',
                      }}
                    >
                      <Fuel size={12} color="#6C1E84" />
                      <span>{v.fuelType || 'Petrol'}</span>
                    </span>

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '0.76rem',
                        color: '#554458',
                        backgroundColor: '#FAF8FB',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid #EDE8EF',
                      }}
                    >
                      <DoorOpen size={12} color="#6C1E84" />
                      <span>{v.doors || 4} Doors</span>
                    </span>
                  </div>

                  {/* Pricing & Actions */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 'auto',
                      paddingTop: '6px',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1A0322' }}>
                        ${Number(v.dailyRate).toFixed(0)}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#8A7090', marginLeft: '4px' }}>/ day</span>
                    </div>

                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/cars/${v.id}`)}
                        title="View Details"
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: '#F8F6F9',
                          border: '1px solid #EBE5ED',
                          color: '#66566A',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#6C1E84';
                          e.currentTarget.style.borderColor = '#6C1E84';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#66566A';
                          e.currentTarget.style.borderColor = '#EBE5ED';
                        }}
                      >
                        <Eye size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate(`/admin/cars/${v.id}/edit`)}
                        title="Edit Car"
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: '#F8F6F9',
                          border: '1px solid #EBE5ED',
                          color: '#66566A',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#6C1E84';
                          e.currentTarget.style.borderColor = '#6C1E84';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#66566A';
                          e.currentTarget.style.borderColor = '#EBE5ED';
                        }}
                      >
                        <Pencil size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleArchiveToggle(v)}
                        title={v.status === 'ARCHIVED' ? 'Restore Car' : 'Archive Car'}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: '#F8F6F9',
                          border: '1px solid #EBE5ED',
                          color: '#66566A',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#6C1E84';
                          e.currentTarget.style.borderColor = '#6C1E84';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#66566A';
                          e.currentTarget.style.borderColor = '#EBE5ED';
                        }}
                      >
                        {v.status === 'ARCHIVED' ? <RotateCcw size={13} /> : <Archive size={13} />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteWithConfirm(v)}
                        title="Delete Car"
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: '#FDF2F2',
                          border: '1px solid #F8B4B4',
                          color: '#E02424',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FDE8E8')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FDF2F2')}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {vehicles.length === 0 && (
              <div
                style={{
                  gridColumn: '1 / -1',
                  padding: '48px',
                  textAlign: 'center',
                  color: '#8A7090',
                  backgroundColor: '#FAF8FB',
                  borderRadius: '12px',
                  border: '1px dashed #E5DFE7',
                }}
              >
                {isLoading ? 'Loading vehicles...' : 'No vehicles found matching current criteria.'}
              </div>
            )}
          </div>
        )}

        {/* ================= PAGINATION FOOTER ================= */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #ECE7ED',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '0.85rem',
            color: '#66566A',
          }}
        >
          <div>
            Showing 1 to {vehicles.length} of {totalVehicles} cars
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5DFE7',
                color: page <= 1 ? '#D1C8D4' : '#2E0738',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronLeft size={16} />
            </button>

            <span
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#200329',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
              }}
            >
              {page}
            </span>

            <button
              type="button"
              disabled={vehicles.length < limit}
              onClick={() => setPage((p) => p + 1)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5DFE7',
                color: vehicles.length < limit ? '#D1C8D4' : '#2E0738',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: vehicles.length < limit ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
