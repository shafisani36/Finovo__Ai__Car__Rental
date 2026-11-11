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
import { getCarImage, isFullBleedCarPhoto, resolveVehiclePricing } from '../../../utils/carImageHelper';
import redCar from '../../../assets/cars/finovo-red-car.png';
import grayCar from '../../../assets/cars/finovo-gray-car.png';
import blueCar from '../../../assets/cars/finovo-blue-car.png';
import whiteCar from '../../../assets/cars/finovo-white-car.png';
import yellowCar from '../../../assets/cars/finovo-yellow-car.png';
import greenCar from '../../../assets/cars/finovo-green-car.png';
import bmwLogo from '../../../assets/cars/finovo-bmw-logo.png';
import lamboLogo from '../../../assets/cars/finovo-lamborghini-logo.png';

function getFleetCarAssets(v: Vehicle) {
  const resolved = getCarImage(v);
  if (resolved) {
    return {
      image: resolved,
      logo: v.brand?.toLowerCase().includes('lambo') ? lamboLogo : bmwLogo,
    };
  }

  const brandLower = (v.brand || '').toLowerCase();
  if (brandLower.includes('lambo')) {
    return { image: '/cars/orange-car.jpg', logo: lamboLogo };
  }
  return {
    image: v.primaryImageUrl || grayCar || redCar || blueCar || whiteCar || yellowCar || greenCar,
    logo: bmwLogo,
  };
}



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
  await confirm({
    title: 'Operation Failed',
    message: err.message || 'Unable to complete the vehicle operation. Please try again.',
    confirmText: 'OK',
    cancelText: '',
    variant: 'danger',
  });
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
          label="Maintenance"
          value={metrics.maintenance}
          variant="amber"
        />
        <StatCard
          icon={Shield}
          label={dashboardStats.expiredDocuments > 0 ? `${dashboardStats.expiredDocuments} Exp. Docs` : 'Expiring Docs'}
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
                            src={getFleetCarAssets(v).image}
                            alt={v.model}
                            style={
                              isFullBleedCarPhoto(getFleetCarAssets(v).image)
                                ? { width: '100%', height: '100%', objectFit: 'cover' }
                                : { maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }
                            }
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
                      ${resolveVehiclePricing(v).dailyRate} / day
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
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(min(100%, 330px), 1fr))',
              gap: isMobile ? '16px' : '22px',
              padding: isMobile ? '16px' : '24px',
            }}
          >
            {vehicles.map((v) => {
              const assets = getFleetCarAssets(v);
              const fullBleed = isFullBleedCarPhoto(assets.image);
              return (
                <div
                  key={v.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '20px',
                    border: '1px solid #ECE7ED',
                    boxShadow: '0 4px 16px rgba(46, 7, 56, 0.04)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 12px 28px rgba(108, 30, 132, 0.1)';
                    e.currentTarget.style.borderColor = '#DACDE0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(46, 7, 56, 0.04)';
                    e.currentTarget.style.borderColor = '#ECE7ED';
                  }}
                >
                  {/* Card Showcase Stage */}
                  <div
                    style={{
                      position: 'relative',
                      height: '190px',
                      background: fullBleed
                        ? '#1E0432'
                        : 'radial-gradient(circle at 50% 60%, #FAF7FC 0%, #F1E9F6 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: fullBleed ? 0 : '16px 20px',
                      borderBottom: '1px solid #ECE7ED',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Brand watermark logo in backdrop */}
                    {assets.logo && !fullBleed && (
                      <img
                        src={assets.logo}
                        alt=""
                        style={{
                          position: 'absolute',
                          right: '14px',
                          bottom: '12px',
                          width: '42px',
                          height: '42px',
                          objectFit: 'contain',
                          opacity: 0.12,
                          pointerEvents: 'none',
                        }}
                      />
                    )}

                    {/* Top Badges */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        left: '14px',
                        zIndex: 2,
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-block',
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          backdropFilter: 'blur(6px)',
                          color: '#6C1E84',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: '8px',
                          border: '1px solid rgba(108, 30, 132, 0.18)',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                        }}
                      >
                        {v.category?.name || 'Luxury'}
                      </span>
                    </div>

                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '14px',
                        zIndex: 2,
                      }}
                    >
                      {renderStatusBadge(v.status)}
                    </div>

                    {/* High-Resolution Vehicle Showcase Cutout or Studio Shot */}
                    <img
                      src={assets.image}
                      alt={`${v.brand} ${v.model}`}
                      style={
                        fullBleed
                          ? {
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            }
                          : {
                              maxWidth: '94%',
                              maxHeight: '140px',
                              objectFit: 'contain',
                              filter: 'drop-shadow(0 10px 14px rgba(30, 4, 38, 0.15))',
                              transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            }
                      }
                      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.06)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    />
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', flex: 1, gap: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                        <div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#6C1E84', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {v.brand}
                          </div>
                          <h3
                            style={{
                              margin: '2px 0 0',
                              fontSize: '1.12rem',
                              fontWeight: 800,
                              color: '#1A0322',
                              lineHeight: 1.25,
                            }}
                          >
                            {v.model}
                          </h3>
                        </div>
                        <span
                          style={{
                            fontSize: '0.8rem',
                            color: '#66566A',
                            fontWeight: 700,
                            backgroundColor: '#F7F5F8',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid #ECE7ED',
                            flexShrink: 0,
                          }}
                        >
                          {v.year}
                        </span>
                      </div>

                      {/* Plate Badge */}
                      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            color: '#374151',
                            backgroundColor: '#F3EFF5',
                            border: '1px solid #E4DDE7',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            letterSpacing: '0.04em',
                          }}
                        >
                          Plate: {v.registrationNumber}
                        </span>
                        {v.trim && (
                          <span style={{ fontSize: '0.75rem', color: '#8A7090', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {v.trim}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Specs Micro Pills */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 96px), 1fr))',
                        gap: '6px',
                        padding: '10px 0',
                        borderTop: '1px solid #F3F0F5',
                        borderBottom: '1px solid #F3F0F5',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.76rem',
                          color: '#4A315A',
                          backgroundColor: '#FAF8FB',
                          padding: '6px 8px',
                          borderRadius: '8px',
                          border: '1px solid #EDE8EF',
                        }}
                      >
                        <Users size={13} color="#6C1E84" />
                        <span style={{ fontWeight: 600 }}>{v.seats || 5} Seats</span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.76rem',
                          color: '#4A315A',
                          backgroundColor: '#FAF8FB',
                          padding: '6px 8px',
                          borderRadius: '8px',
                          border: '1px solid #EDE8EF',
                        }}
                      >
                        <Fuel size={13} color="#6C1E84" />
                        <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                          {(v.fuelType || 'Petrol').toLowerCase()}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.76rem',
                          color: '#4A315A',
                          backgroundColor: '#FAF8FB',
                          padding: '6px 8px',
                          borderRadius: '8px',
                          border: '1px solid #EDE8EF',
                        }}
                      >
                        <DoorOpen size={13} color="#6C1E84" />
                        <span style={{ fontWeight: 600 }}>{v.doors || 4} Doors</span>
                      </div>
                    </div>

                    {/* Pricing & Actions */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: 'auto',
                        paddingTop: '4px',
                        flexWrap: 'wrap',
                        gap: '10px',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8A7090', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Daily Rate
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                          <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1A0322', lineHeight: 1.1 }}>
                            ${resolveVehiclePricing(v).dailyRate}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: '#8A7090' }}>/ day</span>
                        </div>
                      </div>

                      {/* Action Group */}
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/cars/${v.id}`)}
                          title="View Details"
                          style={{
                            backgroundColor: '#1E0426',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '7px 12px',
                            color: '#FFFFFF',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#6C1E84')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1E0426')}
                        >
                          <Eye size={13} />
                          <span>View</span>
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
                            transition: 'background-color 0.15s ease',
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
              );
            })}

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
