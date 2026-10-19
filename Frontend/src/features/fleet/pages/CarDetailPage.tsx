import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fleetApi } from '../api/fleetApi';
import type {
  Vehicle,
  VehicleDocument,
  VehicleMaintenance,
  VehicleDamageReport,
  VehicleOdometerLog,
  VehiclePricingTier,
  VehicleLocationLog,
  VehicleBookingItem,
  VehicleAuditLog,
} from '../types/fleet.types';
import {
  CreditCard,
  Car,
  Settings,
  Fuel,
  DoorOpen,
  Gauge,
  Sliders,
  Users,
  Palette,
  FileText,
  Pencil,
  Maximize2,
  X,
  ArrowLeft,
  Clock,
  Wrench,
  Shield,
  Sparkles,
  Camera,
  Cpu,
  MapPin,
  Check,
  ChevronLeft,
  ChevronRight,
  Scan,
  Minimize2,
  DollarSign,
  AlertTriangle,
  Archive,
  RotateCcw,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Activity,
  CalendarCheck,
} from 'lucide-react';
import { useConfirm } from '../../../components/common/ConfirmModal';
import { CustomSelect } from '../../../components/common/CustomSelect';
import './CarDetailPage.css';

export function CarDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { confirm } = useConfirm();

  // Core state
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carousel & Modal state
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('cover');

  // Workspace tabs
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'specifications'
    | 'pricing'
    | 'documents'
    | 'maintenance'
    | 'damages'
    | 'odometer'
    | 'locations'
    | 'availability'
    | 'audit'
  >('overview');

  // Sub-resource records
  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<VehicleMaintenance[]>([]);
  const [damageReports, setDamageReports] = useState<VehicleDamageReport[]>([]);
  const [odometerLogs, setOdometerLogs] = useState<VehicleOdometerLog[]>([]);
  const [pricingTiers, setPricingTiers] = useState<VehiclePricingTier[]>([]);
  const [locationLogs, setLocationLogs] = useState<VehicleLocationLog[]>([]);
  const [bookings, setBookings] = useState<VehicleBookingItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<VehicleAuditLog[]>([]);
  const [_isLoadingSubResources, setIsLoadingSubResources] = useState(false);

  // Sub-resource Modal states
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [isAddMaintOpen, setIsAddMaintOpen] = useState(false);
  const [isAddDamageOpen, setIsAddDamageOpen] = useState(false);
  const [isAddOdoOpen, setIsAddOdoOpen] = useState(false);
  const [isAddPricingOpen, setIsAddPricingOpen] = useState(false);

  // Archive / Restore confirmation modal
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archiveActionLoading, setArchiveActionLoading] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  // Live Availability Checker state
  const [availStartDate, setAvailStartDate] = useState('');
  const [availEndDate, setAvailEndDate] = useState('');
  const [availResult, setAvailResult] = useState<{
    isAvailable: boolean;
    reason?: string;
    conflictingBooking?: any;
  } | null>(null);
  const [isCheckingAvail, setIsCheckingAvail] = useState(false);

  // Load sub-resources callback
  const loadSubResources = useCallback(async (vehicleId: string) => {
    setIsLoadingSubResources(true);
    try {
      const [docsRes, maintRes, damageRes, odoRes, priceRes, locRes, bookRes, auditRes] =
        await Promise.all([
          fleetApi.getDocuments(vehicleId).catch(() => ({ documents: [] })),
          fleetApi.getMaintenance(vehicleId).catch(() => ({ maintenance: [] })),
          fleetApi.getDamageReports(vehicleId).catch(() => ({ damageReports: [] })),
          fleetApi.getOdometerLogs(vehicleId).catch(() => ({ odometerLogs: [] })),
          fleetApi.getPricingTiers(vehicleId).catch(() => ({ pricingTiers: [] })),
          fleetApi.getLocationLogs(vehicleId).catch(() => ({ locationLogs: [] })),
          fleetApi.getBookings(vehicleId).catch(() => ({ bookings: [] })),
          fleetApi.getAuditLogs(vehicleId).catch(() => ({ auditLogs: [] })),
        ]);

      setDocuments(docsRes.documents || []);
      setMaintenanceRecords(maintRes.maintenance || []);
      setDamageReports(damageRes.damageReports || []);
      setOdometerLogs(odoRes.odometerLogs || []);
      setPricingTiers(priceRes.pricingTiers || []);
      setLocationLogs(locRes.locationLogs || []);
      setBookings(bookRes.bookings || []);
      setAuditLogs(auditRes.auditLogs || []);
    } catch (err) {
      console.error('Failed to load sub-resources:', err);
    } finally {
      setIsLoadingSubResources(false);
    }
  }, []);

  // Fetch core vehicle data
  useEffect(() => {
    if (!id) return;

    let isMounted = true;
    setIsLoading(true);

    fleetApi
      .getVehicleById(id)
      .then((res) => {
        if (isMounted && res.vehicle) {
          setVehicle(res.vehicle);
          loadSubResources(id);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to load vehicle details:', err);
          setError('Could not load vehicle details.');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id, loadSubResources]);

  // Loading Screen
  if (isLoading) {
    return (
      <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '60px 0', textAlign: 'center' }}>
        <div style={{ fontSize: '1.1rem', color: '#66566A', fontWeight: 600 }}>
          Loading vehicle details...
        </div>
      </div>
    );
  }

  // Not Found / Error Screen
  if (error || !vehicle) {
    return (
      <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '60px 0', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1A0322', marginBottom: '12px' }}>
          Vehicle Not Found
        </h2>
        <p style={{ color: '#66566A', marginBottom: '24px' }}>
          The requested vehicle does not exist or has been removed from the fleet.
        </p>
        <Link
          to="/admin/cars"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#1E0426',
            color: '#FFFFFF',
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Cars</span>
        </Link>
      </div>
    );
  }

  // Determine list of photos for carousel
  const photos =
    vehicle.photos && vehicle.photos.length > 0
      ? vehicle.photos.map((p) => p.url)
      : [vehicle.primaryImageUrl || '/cars/car-4-tucson.png'];

  const currentPhoto = photos[activePhotoIndex] || photos[0];

  const handlePrevPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNextPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActivePhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  // Status Badge Helper
  const renderStatusBadge = (status: Vehicle['status']) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#DEF7EC',
              color: '#03543F',
              fontSize: '0.85rem',
              fontWeight: 700,
              padding: '6px 14px',
              borderRadius: '20px',
            }}
          >
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#0E9F6E' }} />
            Available
          </span>
        );
      case 'RENTED':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#E1EFFE',
              color: '#1E429F',
              fontSize: '0.85rem',
              fontWeight: 700,
              padding: '6px 14px',
              borderRadius: '20px',
            }}
          >
            <Clock size={14} color="#3F83F8" />
            Rented
          </span>
        );
      case 'MAINTENANCE':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#FEF3C7',
              color: '#92400E',
              fontSize: '0.85rem',
              fontWeight: 700,
              padding: '6px 14px',
              borderRadius: '20px',
            }}
          >
            <Wrench size={14} color="#D97706" />
            Maintenance
          </span>
        );
      case 'ARCHIVED':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#F3F4F6',
              color: '#4B5563',
              fontSize: '0.85rem',
              fontWeight: 700,
              padding: '6px 14px',
              borderRadius: '20px',
            }}
          >
            <Archive size={14} color="#6B7280" />
            Archived
          </span>
        );
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#F3F4F6',
              color: '#374151',
              fontSize: '0.85rem',
              fontWeight: 700,
              padding: '6px 14px',
              borderRadius: '20px',
            }}
          >
            {status}
          </span>
        );
    }
  };

  // Helper for Document Expiry Badge
  const getExpiryBadge = (expiresAt?: string | null) => {
    if (!expiresAt) return <span style={{ color: '#8A7090' }}>No Expiry Date</span>;
    const exp = new Date(expiresAt);
    const now = new Date();
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return (
        <span
          style={{
            color: '#E02424',
            fontWeight: 700,
            backgroundColor: '#FDF2F2',
            padding: '3px 8px',
            borderRadius: '12px',
            fontSize: '0.775rem',
          }}
        >
          Expired ({Math.abs(diffDays)}d ago)
        </span>
      );
    }
    if (diffDays <= 30) {
      return (
        <span
          style={{
            color: '#D97706',
            fontWeight: 700,
            backgroundColor: '#FEF3C7',
            padding: '3px 8px',
            borderRadius: '12px',
            fontSize: '0.775rem',
          }}
        >
          Expiring Soon ({diffDays}d)
        </span>
      );
    }
    return (
      <span
        style={{
          color: '#0E9F6E',
          fontWeight: 600,
          backgroundColor: '#DEF7EC',
          padding: '3px 8px',
          borderRadius: '12px',
          fontSize: '0.775rem',
        }}
      >
        Valid ({diffDays}d)
      </span>
    );
  };

  // Handlers for Archive / Restore
  const handleArchiveToggle = async () => {
    if (!vehicle) return;
    setArchiveActionLoading(true);
    setArchiveError(null);
    try {
      if (vehicle.status === 'ARCHIVED') {
        await fleetApi.restoreVehicle(vehicle.id);
      } else {
        await fleetApi.archiveVehicle(vehicle.id, 'Archived via fleet operations');
      }
      setIsArchiveModalOpen(false);
      // Refresh vehicle and logs
      const res = await fleetApi.getVehicleById(vehicle.id);
      if (res.vehicle) setVehicle(res.vehicle);
      await loadSubResources(vehicle.id);
    } catch (err: any) {
      setArchiveError(err.message || 'Operation failed');
    } finally {
      setArchiveActionLoading(false);
    }
  };

  // Availability Checker Submission
  const handleCheckAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle || !availStartDate || !availEndDate) return;
    setIsCheckingAvail(true);
    setAvailResult(null);
    try {
      const res = await fleetApi.checkAvailability(vehicle.id, availStartDate, availEndDate);
      setAvailResult({
        isAvailable: res.isAvailable,
        reason: res.reason,
        conflictingBooking: res.conflictingBooking,
      });
    } catch (err: any) {
      setAvailResult({
        isAvailable: false,
        reason: err.message || 'Availability check failed. Please check date range.',
      });
    } finally {
      setIsCheckingAvail(false);
    }
  };

  // Document Deletion
  const handleDeleteDocument = async (docId: string) => {
    if (!vehicle) return;
    const ok = await confirm({
      title: 'Delete Vehicle Document?',
      message: 'Are you sure you want to permanently delete this document from the vehicle records? This action cannot be undone.',
      confirmText: 'Delete Document',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await fleetApi.deleteDocument(vehicle.id, docId);
      await loadSubResources(vehicle.id);
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  // Pricing Tier Deletion
  const handleDeletePricingTier = async (tierId: string) => {
    if (!vehicle) return;
    const ok = await confirm({
      title: 'Remove Pricing Tier?',
      message: 'Are you sure you want to remove this duration discount tier? Future bookings will no longer apply this discount rate.',
      confirmText: 'Remove Tier',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await fleetApi.deletePricingTier(vehicle.id, tierId);
      await loadSubResources(vehicle.id);
    } catch (err) {
      console.error('Failed to delete pricing tier:', err);
    }
  };

  return (
    <div className="car-detail-page">
      {/* ================= BREADCRUMB & HEADER ================= */}
      <div className="car-detail-header">
        <div className="car-detail-breadcrumb">
          <Link to="/admin/cars" style={{ color: '#8A7090', textDecoration: 'none', fontWeight: 500 }}>
            Cars
          </Link>
          <span style={{ fontSize: '0.75rem' }}>›</span>
          <span style={{ color: '#2E0738', fontWeight: 600 }}>
            {vehicle.brand} {vehicle.model}
          </span>
        </div>

        <div className="car-detail-title-bar">
          <div>
            <h1 className="car-detail-title">
              {vehicle.brand} {vehicle.model}
            </h1>
            <p className="car-detail-subtitle">
              Fleet Code: <strong>{vehicle.vehicleCode || 'FLEET-AUTOGEN'}</strong> • Reg:{' '}
              <strong style={{ fontFamily: 'monospace' }}>{vehicle.registrationNumber}</strong> • Year:{' '}
              {vehicle.year}
            </p>
          </div>

          {/* Status Badges + Actions */}
          <div className="car-detail-actions">
            {renderStatusBadge(vehicle.status)}

            {/* Availability Checker Shortcut */}
            <button
              type="button"
              onClick={() => setActiveTab('availability')}
              className="car-btn-secondary"
              title="Verify booking date availability"
            >
              <CalendarCheck size={16} />
              <span>Check Dates</span>
            </button>

            {/* Archive / Restore Button */}
            <button
              type="button"
              onClick={() => {
                setArchiveError(null);
                setIsArchiveModalOpen(true);
              }}
              className="car-btn-secondary"
              title={vehicle.status === 'ARCHIVED' ? 'Restore Vehicle' : 'Archive Vehicle'}
            >
              {vehicle.status === 'ARCHIVED' ? <RotateCcw size={16} /> : <Archive size={16} />}
              <span>{vehicle.status === 'ARCHIVED' ? 'Restore' : 'Archive'}</span>
            </button>

            {/* Edit Button */}
            <button
              type="button"
              onClick={() => navigate(`/admin/cars/${vehicle.id}/edit`)}
              className="car-edit-btn"
            >
              <Pencil size={16} strokeWidth={2.5} />
              <span>Edit</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= TOP SECTION: PHOTO CAROUSEL + 3 METRIC CARDS ================= */}
      <div className="car-hero-grid">
        {/* Left: Photo Column */}
        <div className="car-photo-column">
          <div className="car-photo-card">
            {/* Top-Left: Index Badge */}
            <div className="car-photo-index-badge">
              <Camera size={13} />
              <span>
                {activePhotoIndex + 1} / {photos.length}
              </span>
            </div>

            {/* Top-Right: Fit Toggle + Fullscreen */}
            <div className="car-photo-top-actions">
              <button
                type="button"
                className="car-photo-icon-btn"
                onClick={() => setFitMode((prev) => (prev === 'cover' ? 'contain' : 'cover'))}
                title={fitMode === 'cover' ? 'Fit complete car' : 'Fill frame'}
              >
                {fitMode === 'cover' ? <Minimize2 size={13} /> : <Scan size={13} />}
                <span>{fitMode === 'cover' ? 'Fit car' : 'Fill card'}</span>
              </button>

              <button
                type="button"
                className="car-photo-icon-btn"
                onClick={() => setIsViewerOpen(true)}
                title="Expand photo to fullscreen"
              >
                <Maximize2 size={13} />
                <span>Expand</span>
              </button>
            </div>

            {/* Navigation Arrows */}
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  className="car-photo-nav-btn prev"
                  onClick={handlePrevPhoto}
                  aria-label="Previous photo"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  className="car-photo-nav-btn next"
                  onClick={handleNextPhoto}
                  aria-label="Next photo"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}

            {/* Vehicle Image Viewport */}
            <div className="car-photo-viewport" onClick={() => setIsViewerOpen(true)}>
              <img
                src={currentPhoto}
                alt={`${vehicle.brand} ${vehicle.model}`}
                className={`car-photo-img ${fitMode === 'contain' ? 'fit-contain' : 'fit-cover'}`}
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.includes('/cars/car-4-tucson.png')) {
                    target.src = '/cars/car-4-tucson.png';
                  }
                }}
              />
            </div>

            {/* Bottom Dots Indicator */}
            {photos.length > 1 && (
              <div className="car-photo-dots">
                {photos.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePhotoIndex(idx);
                    }}
                    className={`car-photo-dot ${activePhotoIndex === idx ? 'active' : ''}`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Interactive Thumbnails Strip */}
          {photos.length > 1 && (
            <div className="car-thumb-strip">
              {photos.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActivePhotoIndex(idx)}
                  className={`car-thumb-item ${activePhotoIndex === idx ? 'active' : ''}`}
                >
                  <img
                    src={p}
                    alt={`Thumbnail ${idx + 1}`}
                    className="car-thumb-img"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.src.includes('/cars/car-4-tucson.png')) {
                        target.src = '/cars/car-4-tucson.png';
                      }
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: 3 Metric & Telematics Cards */}
        <div className="car-stats-column">
          {/* Card 1: Rental Pricing */}
          <div className="car-stat-card">
            <div className="car-stat-icon-wrap" style={{ backgroundColor: '#F3EEF6', color: '#6C1E84' }}>
              <CreditCard size={20} />
            </div>
            <div className="car-stat-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    backgroundColor: '#EBD8F2',
                    color: '#6C1E84',
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}
                >
                  {vehicle.pricingMethod === 'per_km'
                    ? 'Per-KM'
                    : vehicle.pricingMethod === 'hourly'
                    ? 'Hourly'
                    : vehicle.pricingMethod === 'monthly'
                    ? 'Monthly'
                    : vehicle.pricingMethod === 'daily_extra_km'
                    ? 'Daily + Extra KM'
                    : 'Daily'}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#8A7090', fontWeight: 600 }}>
                  {vehicle.currency || 'PKR'}
                </span>
              </div>
              <div className="car-stat-value">
                {vehicle.pricingMethod === 'per_km'
                  ? `${vehicle.currency || 'PKR'} ${Number(vehicle.perKmRate || 0).toLocaleString()}`
                  : vehicle.pricingMethod === 'hourly'
                  ? `${vehicle.currency || 'PKR'} ${Number(vehicle.hourlyRate || 0).toLocaleString()}`
                  : vehicle.pricingMethod === 'monthly'
                  ? `${vehicle.currency || 'PKR'} ${Number(vehicle.monthlyRate || 0).toLocaleString()}`
                  : `${vehicle.currency || 'PKR'} ${Number(vehicle.dailyRate || 0).toLocaleString()}`}
                <span className="car-stat-unit">
                  {vehicle.pricingMethod === 'per_km'
                    ? '/km'
                    : vehicle.pricingMethod === 'hourly'
                    ? '/hr'
                    : vehicle.pricingMethod === 'monthly'
                    ? '/mo'
                    : '/day'}
                </span>
              </div>
              <div className="car-stat-label">Active Rental Rate</div>
              <div className="car-stat-sub">
                {vehicle.pricingMethod === 'per_km'
                  ? `Min Trip: ${vehicle.currency || 'PKR'} ${Number(vehicle.minimumTripCharge || 0).toLocaleString()} • Dep: ${vehicle.currency || 'PKR'} ${Number(vehicle.securityDeposit || 0).toLocaleString()}`
                  : vehicle.pricingMethod === 'hourly'
                  ? `Min: ${vehicle.minimumBillableHours || 1}h • Step: ${vehicle.billingIncrementMinutes || 60}m • Grace: ${vehicle.gracePeriodMinutes || 0}m`
                  : vehicle.pricingMethod === 'monthly'
                  ? `Deposit: ${vehicle.currency || 'PKR'} ${Number(vehicle.securityDeposit || 0).toLocaleString()} • ${vehicle.partialMonthPolicy === 'prorated_daily' ? 'Prorated Daily' : 'Full Month'}`
                  : vehicle.pricingMethod === 'daily_extra_km'
                  ? `Inc: ${vehicle.mileageLimitPerDay || 200} km/day • Extra: ${vehicle.currency || 'PKR'} ${Number(vehicle.extraMileageCharge || 0)}/km`
                  : `Deposit: ${vehicle.currency || 'PKR'} ${Number(vehicle.securityDeposit || 0).toLocaleString()} • Inc: ${vehicle.mileageLimitPerDay ? `${vehicle.mileageLimitPerDay} km/day` : 'Unlimited'}`}
              </div>
            </div>
          </div>

          {/* Card 2: Current Mileage & Health */}
          <div className="car-stat-card">
            <div className="car-stat-icon-wrap" style={{ backgroundColor: '#DEF7EC', color: '#0E9F6E' }}>
              <Gauge size={20} />
            </div>
            <div className="car-stat-body">
              <div className="car-stat-value">
                {vehicle.mileage.toLocaleString()}
                <span className="car-stat-unit">km</span>
              </div>
              <div className="car-stat-label">Current Odometer</div>
              <div className="car-stat-sub">
                Next Service:{' '}
                {vehicle.nextServiceMileage
                  ? `${vehicle.nextServiceMileage.toLocaleString()} km`
                  : '20,000 km'}
              </div>
            </div>
          </div>

          {/* Card 3: Assigned Branch & Parking Bay */}
          <div className="car-stat-card">
            <div className="car-stat-icon-wrap" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
              <MapPin size={20} />
            </div>
            <div className="car-stat-body">
              <div className="car-stat-value" style={{ fontSize: '1.25rem' }}>
                {vehicle.branch?.name || 'Central Hub'}
              </div>
              <div className="car-stat-label">Assigned Location</div>
              <div className="car-stat-sub">
                Bay: {vehicle.parkingSpot || 'A-12'} • Code: {vehicle.vehicleCode || 'FLEET-01'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= WORKSPACE NAVIGATION TABS ================= */}
      <div className="car-tabs-container">
        <nav className="car-tabs-nav">
          <button
            type="button"
            className={`car-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Car size={16} />
            <span>Overview</span>
          </button>

          <button
            type="button"
            className={`car-tab-btn ${activeTab === 'specifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('specifications')}
          >
            <Cpu size={16} />
            <span>Technical Specs</span>
          </button>

          <button
            type="button"
            className={`car-tab-btn ${activeTab === 'pricing' ? 'active' : ''}`}
            onClick={() => setActiveTab('pricing')}
          >
            <DollarSign size={16} />
            <span>Pricing & Policies</span>
            <span className="car-tab-badge">{pricingTiers.length}</span>
          </button>

          <button
            type="button"
            className={`car-tab-btn ${activeTab === 'documents' ? 'active' : ''}`}
            onClick={() => setActiveTab('documents')}
          >
            <Shield size={16} />
            <span>Documents & Expiry</span>
            <span className="car-tab-badge">{documents.length}</span>
          </button>

          <button
            type="button"
            className={`car-tab-btn ${activeTab === 'maintenance' ? 'active' : ''}`}
            onClick={() => setActiveTab('maintenance')}
          >
            <Wrench size={16} />
            <span>Maintenance & Service</span>
            <span className="car-tab-badge">{maintenanceRecords.length}</span>
          </button>

          <button
            type="button"
            className={`car-tab-btn ${activeTab === 'damages' ? 'active' : ''}`}
            onClick={() => setActiveTab('damages')}
          >
            <AlertTriangle size={16} />
            <span>Damage History</span>
            <span className="car-tab-badge">{damageReports.length}</span>
          </button>

          <button
            type="button"
            className={`car-tab-btn ${activeTab === 'odometer' ? 'active' : ''}`}
            onClick={() => setActiveTab('odometer')}
          >
            <Gauge size={16} />
            <span>Odometer Logs</span>
            <span className="car-tab-badge">{odometerLogs.length}</span>
          </button>

          <button
            type="button"
            className={`car-tab-btn ${activeTab === 'locations' ? 'active' : ''}`}
            onClick={() => setActiveTab('locations')}
          >
            <MapPin size={16} />
            <span>Locations</span>
            <span className="car-tab-badge">{locationLogs.length}</span>
          </button>

          <button
            type="button"
            className={`car-tab-btn ${activeTab === 'availability' ? 'active' : ''}`}
            onClick={() => setActiveTab('availability')}
          >
            <CalendarCheck size={16} />
            <span>Bookings & Availability</span>
            <span className="car-tab-badge">{bookings.length}</span>
          </button>

          <button
            type="button"
            className={`car-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            <Activity size={16} />
            <span>Audit Trail</span>
            <span className="car-tab-badge">{auditLogs.length}</span>
          </button>
        </nav>
      </div>

      {/* ================= TAB 1: OVERVIEW ================= */}
      {activeTab === 'overview' && (
        <div className="car-submodule-wrap">
          {/* Quick Specifications Grid */}
          <div className="car-card-section">
            <div className="car-section-header">
              <div className="car-section-title-wrap">
                <div className="car-section-icon">
                  <Sliders size={20} />
                </div>
                <h2 className="car-section-title">Vehicle Specifications</h2>
              </div>
            </div>

            <div className="car-spec-grid">
              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Car size={18} color="#8A7090" />
                  <span>Category</span>
                </div>
                <div className="car-spec-val">{vehicle.category?.name || 'Sedan'}</div>
              </div>

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Settings size={18} color="#8A7090" />
                  <span>Transmission</span>
                </div>
                <div className="car-spec-val">
                  {vehicle.transmission.charAt(0) + vehicle.transmission.slice(1).toLowerCase()}
                </div>
              </div>

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Fuel size={18} color="#8A7090" />
                  <span>Fuel type</span>
                </div>
                <div className="car-spec-val">
                  {vehicle.fuelType.charAt(0) + vehicle.fuelType.slice(1).toLowerCase()}
                </div>
              </div>

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Users size={18} color="#8A7090" />
                  <span>Seats</span>
                </div>
                <div className="car-spec-val">{vehicle.seats}</div>
              </div>

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <DoorOpen size={18} color="#8A7090" />
                  <span>Doors</span>
                </div>
                <div className="car-spec-val">{vehicle.doors}</div>
              </div>

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Palette size={18} color="#8A7090" />
                  <span>Color</span>
                </div>
                <div className="car-spec-val">{vehicle.color || 'White'}</div>
              </div>

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Gauge size={18} color="#8A7090" />
                  <span>Mileage</span>
                </div>
                <div className="car-spec-val">{vehicle.mileage.toLocaleString()} km</div>
              </div>

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Shield size={18} color="#8A7090" />
                  <span>VIN</span>
                </div>
                <div className="car-spec-val" style={{ fontFamily: 'monospace' }}>
                  {vehicle.vin || 'VIN-UNASSIGNED'}
                </div>
              </div>
            </div>
          </div>

          {/* Smart Features Chips */}
          {(() => {
            let featuresList: string[] = [];
            if (Array.isArray(vehicle.features)) {
              featuresList = vehicle.features;
            } else if (typeof vehicle.features === 'string') {
              try {
                const parsed = JSON.parse(vehicle.features);
                if (Array.isArray(parsed)) featuresList = parsed;
              } catch {
                featuresList = [];
              }
            }
            if (featuresList.length === 0) return null;

            return (
              <div className="car-card-section">
                <div className="car-section-header" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: '14px' }}>
                  <div className="car-section-title-wrap">
                    <div className="car-section-icon">
                      <Sparkles size={20} />
                    </div>
                    <h2 className="car-section-title">
                      Equipment & Smart Features ({featuresList.length})
                    </h2>
                  </div>
                </div>
                <div className="car-features-wrap">
                  {featuresList.map((f) => (
                    <span key={f} className="car-feature-chip">
                      <Check size={14} strokeWidth={3} />
                      <span>{f}</span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Compliance & Maintenance Preview */}
          <div className="car-card-section">
            <div className="car-section-header">
              <div className="car-section-title-wrap">
                <div className="car-section-icon">
                  <Shield size={20} />
                </div>
                <div>
                  <h2 className="car-section-title">Compliance, Insurance & Service</h2>
                  <div className="car-section-subtitle">
                    Active policy, road tax, and service mileage intervals
                  </div>
                </div>
              </div>
            </div>

            <div className="car-compliance-grid">
              <div className="car-compliance-card">
                <div className="car-compliance-title">Insurance Policy</div>
                <div className="car-compliance-value">
                  {vehicle.insurancePolicyNumber || 'POL-FIN-2026-8819'}
                </div>
                <div className="car-compliance-sub">
                  Expires:{' '}
                  {vehicle.insuranceExpiry
                    ? new Date(vehicle.insuranceExpiry).toLocaleDateString()
                    : 'Active'}
                </div>
              </div>

              <div className="car-compliance-card">
                <div className="car-compliance-title">Registration / Road Tax</div>
                <div className="car-compliance-value">{vehicle.registrationNumber}</div>
                <div className="car-compliance-sub">
                  Renewal Due:{' '}
                  {vehicle.registrationExpiry
                    ? new Date(vehicle.registrationExpiry).toLocaleDateString()
                    : 'Current Year'}
                </div>
              </div>

              <div className="car-compliance-card">
                <div className="car-compliance-title">Last Workshop Service</div>
                <div className="car-compliance-value">
                  {vehicle.lastServiceMileage
                    ? `${vehicle.lastServiceMileage.toLocaleString()} km`
                    : '10,000 km'}
                </div>
                <div className="car-compliance-sub">
                  Date:{' '}
                  {vehicle.lastServiceDate
                    ? new Date(vehicle.lastServiceDate).toLocaleDateString()
                    : 'Recent'}
                </div>
              </div>

              <div className="car-compliance-card">
                <div className="car-compliance-title">Next Service Scheduled</div>
                <div className="car-compliance-value" style={{ color: '#059669' }}>
                  {vehicle.nextServiceMileage
                    ? `${vehicle.nextServiceMileage.toLocaleString()} km`
                    : '20,000 km'}
                </div>
                <div className="car-compliance-sub">
                  Remaining: ~
                  {Math.max(
                    0,
                    (vehicle.nextServiceMileage || 20000) - vehicle.mileage
                  ).toLocaleString()}{' '}
                  km
                </div>
              </div>
            </div>
          </div>

          {/* Catalog Photo Gallery */}
          <div className="car-card-section">
            <div className="car-section-header">
              <div className="car-section-title-wrap">
                <div className="car-section-icon">
                  <Camera size={20} />
                </div>
                <div>
                  <h2 className="car-section-title">Photo Gallery ({photos.length} photos)</h2>
                  <div className="car-section-subtitle">
                    Full multi-angle views (Front, Rear, Interior, and Side perspectives)
                  </div>
                </div>
              </div>
              <span className="car-badge-verified">Multi-Angle Verified</span>
            </div>

            <div className="car-gallery-grid">
              {photos.map((p, idx) => (
                <div
                  key={idx}
                  className="car-gallery-item"
                  onClick={() => {
                    setActivePhotoIndex(idx);
                    setIsViewerOpen(true);
                  }}
                >
                  <div className="car-gallery-thumb-wrap">
                    <img
                      src={p}
                      alt={`Perspective ${idx + 1}`}
                      className="car-gallery-thumb"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.src.includes('/cars/car-4-tucson.png')) {
                          target.src = '/cars/car-4-tucson.png';
                        }
                      }}
                    />
                  </div>
                  <div className="car-gallery-footer">
                    <span className="car-gallery-caption">
                      {vehicle.photos?.[idx]?.caption || `Photo #${idx + 1}`}
                    </span>
                    {vehicle.photos?.[idx]?.isPrimary && (
                      <span className="car-gallery-primary-tag">PRIMARY</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Internal Notes */}
          <div className="car-card-section">
            <div className="car-section-header" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: '14px' }}>
              <div className="car-section-title-wrap">
                <div className="car-section-icon">
                  <FileText size={22} />
                </div>
                <h2 className="car-section-title">Fleet Notes</h2>
              </div>
            </div>
            <div className="car-notes-body">
              {vehicle.notes ||
                'Well-maintained vehicle, fully inspected and ready for booking operations.'}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: TECHNICAL SPECIFICATIONS ================= */}
      {activeTab === 'specifications' && (
        <div className="car-submodule-wrap">
          {/* Powertrain & Engine */}
          <div className="car-card-section">
            <div className="car-section-header">
              <div className="car-section-title-wrap">
                <div className="car-section-icon">
                  <Cpu size={20} />
                </div>
                <h2 className="car-section-title">Powertrain & Performance</h2>
              </div>
            </div>

            <div className="car-spec-grid">
              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Cpu size={18} color="#8A7090" />
                  <span>Engine Displacement</span>
                </div>
                <div className="car-spec-val">{vehicle.engineSize || '2.0L Turbocharged'}</div>
              </div>

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Activity size={18} color="#8A7090" />
                  <span>Horsepower</span>
                </div>
                <div className="car-spec-val">{vehicle.horsePower ? `${vehicle.horsePower} HP` : '190 HP'}</div>
              </div>

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Settings size={18} color="#8A7090" />
                  <span>Drivetrain</span>
                </div>
                <div className="car-spec-val">{vehicle.drivetrain || 'AWD (All-Wheel Drive)'}</div>
              </div>

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Sliders size={18} color="#8A7090" />
                  <span>Transmission</span>
                </div>
                <div className="car-spec-val">{vehicle.transmission}</div>
              </div>

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Fuel size={18} color="#8A7090" />
                  <span>Fuel Type</span>
                </div>
                <div className="car-spec-val">{vehicle.fuelType}</div>
              </div>

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Gauge size={18} color="#8A7090" />
                  <span>Fuel Level %</span>
                </div>
                <div className="car-spec-val">{vehicle.fuelLevelPercent ?? 100}%</div>
              </div>

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Fuel size={18} color="#8A7090" />
                  <span>Fuel Tank Capacity</span>
                </div>
                <div className="car-spec-val">{vehicle.fuelTankCapacity || '60 Liters'}</div>
              </div>

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Car size={18} color="#8A7090" />
                  <span>Trim & Variant</span>
                </div>
                <div className="car-spec-val">{vehicle.trim || 'Standard Equipment'}</div>
              </div>
            </div>
          </div>

          {/* Capacities & Organization */}
          <div className="car-card-section">
            <div className="car-section-header">
              <div className="car-section-title-wrap">
                <div className="car-section-icon">
                  <Sliders size={20} />
                </div>
                <h2 className="car-section-title">Body, Dimensions & Telematics</h2>
              </div>
            </div>

            <div className="car-spec-grid">
              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Users size={18} color="#8A7090" />
                  <span>Seating Capacity</span>
                </div>
                <div className="car-spec-val">{vehicle.seats} Passengers</div>
              </div>

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <DoorOpen size={18} color="#8A7090" />
                  <span>Door Count</span>
                </div>
                <div className="car-spec-val">{vehicle.doors} Doors</div>
              </div>

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Palette size={18} color="#8A7090" />
                  <span>Exterior Color</span>
                </div>
                <div className="car-spec-val">
                  <span
                    style={{
                      display: 'inline-block',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: vehicle.colorHex || '#1E0426',
                      marginRight: '6px',
                      verticalAlign: 'middle',
                    }}
                  />
                  {vehicle.color || 'White'}
                </div>
              </div>

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Shield size={18} color="#8A7090" />
                  <span>17-Digit VIN</span>
                </div>
                <div className="car-spec-val" style={{ fontFamily: 'monospace' }}>
                  {vehicle.vin || 'VIN-NOT-SET'}
                </div>
              </div>

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Car size={18} color="#8A7090" />
                  <span>Ownership Type</span>
                </div>
                <div className="car-spec-val">{vehicle.ownershipType || 'OWNED'}</div>
              </div>

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Cpu size={18} color="#8A7090" />
                  <span>Telematics Device ID</span>
                </div>
                <div className="car-spec-val" style={{ fontFamily: 'monospace' }}>
                  {vehicle.telematicsDeviceId || 'TEL-OBD2-ACTIVE'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: PRICING & POLICIES ================= */}
      {activeTab === 'pricing' && (
        <div className="car-submodule-wrap">
          <div className="car-submodule-actions">
            <div>
              <h3 className="car-submodule-title">Rental Rates & Pricing Engine Configuration</h3>
              <p className="car-submodule-sub">
                Standard pricing methods, durational rules, excess mileage caps, and rate history
              </p>
            </div>
            <button
              type="button"
              className="car-btn-primary"
              onClick={() => setIsAddPricingOpen(true)}
            >
              <Plus size={16} />
              <span>Add Rate Tier</span>
            </button>
          </div>

          {/* Pricing Engine Rule Banner */}
          <div
            style={{
              backgroundColor: '#FAF5FB',
              border: '1px solid #E6D8ED',
              borderRadius: '14px',
              padding: '18px 20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#1E0426',
                color: '#FAB826',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Sparkles size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#1E0426' }}>
                  Contracted Method:{' '}
                  {vehicle.pricingMethod === 'per_km'
                    ? 'Method B — Per-Kilometer Rental'
                    : vehicle.pricingMethod === 'hourly'
                    ? 'Method D — Hourly Rental'
                    : vehicle.pricingMethod === 'monthly'
                    ? 'Method E — Monthly Rental'
                    : vehicle.pricingMethod === 'daily_extra_km'
                    ? 'Method C — Daily + Extra Kilometers'
                    : 'Method A — Standard Daily Rental'}
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: '#DEF7EC',
                    color: '#03543F',
                    padding: '2px 8px',
                    borderRadius: '12px',
                  }}
                >
                  Strictly Enforced
                </span>
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: '#66566A', lineHeight: 1.5 }}>
                Online booking quotes and final return settlements for this vehicle are calculated by the server using this permitted method. Rates and policies are permanently snapshotted into bookings upon confirmation.
              </p>
            </div>
          </div>

          {/* Method-Specific Rates Summary Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            {/* Primary Rate Card */}
            <div className="car-stat-card">
              <div className="car-stat-body">
                <div className="car-stat-value">
                  {vehicle.currency || 'PKR'}{' '}
                  {vehicle.pricingMethod === 'per_km'
                    ? Number(vehicle.perKmRate || 0).toLocaleString()
                    : vehicle.pricingMethod === 'hourly'
                    ? Number(vehicle.hourlyRate || 0).toLocaleString()
                    : vehicle.pricingMethod === 'monthly'
                    ? Number(vehicle.monthlyRate || 0).toLocaleString()
                    : Number(vehicle.dailyRate || 0).toLocaleString()}
                  <span className="car-stat-unit">
                    {vehicle.pricingMethod === 'per_km'
                      ? '/km'
                      : vehicle.pricingMethod === 'hourly'
                      ? '/hr'
                      : vehicle.pricingMethod === 'monthly'
                      ? '/mo'
                      : '/day'}
                  </span>
                </div>
                <div className="car-stat-label">
                  {vehicle.pricingMethod === 'per_km'
                    ? 'Per-Kilometer Rate'
                    : vehicle.pricingMethod === 'hourly'
                    ? 'Hourly Base Rate'
                    : vehicle.pricingMethod === 'monthly'
                    ? 'Monthly Contract Rate'
                    : 'Daily Base Rate'}
                </div>
              </div>
            </div>

            {/* Condition/Threshold Card */}
            <div className="car-stat-card">
              <div className="car-stat-body">
                <div className="car-stat-value" style={{ fontSize: '1.25rem' }}>
                  {vehicle.pricingMethod === 'per_km'
                    ? `${vehicle.currency || 'PKR'} ${Number(vehicle.minimumTripCharge || 0).toLocaleString()}`
                    : vehicle.pricingMethod === 'hourly'
                    ? `${vehicle.minimumBillableHours || 1} hrs min`
                    : vehicle.pricingMethod === 'monthly'
                    ? `${vehicle.partialMonthPolicy === 'prorated_daily' ? 'Prorated Daily' : 'Full Month'}`
                    : vehicle.pricingMethod === 'daily_extra_km'
                    ? `${vehicle.mileageLimitPerDay || 200} km/day`
                    : `${vehicle.mileageLimitPerDay ? `${vehicle.mileageLimitPerDay} km/day` : 'Unlimited'}`}
                </div>
                <div className="car-stat-label">
                  {vehicle.pricingMethod === 'per_km'
                    ? 'Minimum Trip Charge Floor'
                    : vehicle.pricingMethod === 'hourly'
                    ? `Increment: ${vehicle.billingIncrementMinutes || 60}m`
                    : vehicle.pricingMethod === 'monthly'
                    ? 'Partial Month Policy'
                    : vehicle.pricingMethod === 'daily_extra_km'
                    ? `Extra: ${vehicle.currency || 'PKR'} ${Number(vehicle.extraMileageCharge || 0)}/km`
                    : 'Daily Mileage Allowance'}
                </div>
              </div>
            </div>

            {/* Security Deposit Card */}
            <div className="car-stat-card">
              <div className="car-stat-body">
                <div className="car-stat-value">
                  {vehicle.currency || 'PKR'} {Number(vehicle.securityDeposit || 0).toLocaleString()}
                </div>
                <div className="car-stat-label">Refundable Security Deposit</div>
              </div>
            </div>

            {/* Grace Period & Timing Card */}
            <div className="car-stat-card">
              <div className="car-stat-body">
                <div className="car-stat-value" style={{ fontSize: '1.25rem' }}>
                  {vehicle.gracePeriodMinutes || 0} min
                </div>
                <div className="car-stat-label">Return Grace Period</div>
              </div>
            </div>
          </div>

          {/* Pricing Tiers Table */}
          <div className="car-table-responsive">
            <table className="car-data-table">
              <thead>
                <tr>
                  <th>Tier Name</th>
                  <th>Method</th>
                  <th>Base Rate</th>
                  <th>Deposit</th>
                  <th>Included KM</th>
                  <th>Extra KM Rate</th>
                  <th>Valid Period</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pricingTiers.map((tier) => (
                  <tr key={tier.id}>
                    <td style={{ fontWeight: 700 }}>{tier.rateName}</td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: '#F3EEF6',
                          color: '#6C1E84',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          textTransform: 'uppercase',
                        }}
                      >
                        {tier.pricingMethod || tier.billingUnit}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: '#1A0322' }}>
                      {tier.currency || 'PKR'} {Number(tier.baseRate).toLocaleString()}
                    </td>
                    <td>{tier.currency || 'PKR'} {Number(tier.securityDeposit || 0).toLocaleString()}</td>
                    <td>{tier.includedKmPerDay ? `${tier.includedKmPerDay} km` : 'Unlimited'}</td>
                    <td>
                      {tier.extraKmRate ? `${tier.currency || 'PKR'} ${Number(tier.extraKmRate).toLocaleString()}/km` : '—'}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#66566A' }}>
                      {tier.validFrom ? new Date(tier.validFrom).toLocaleDateString() : 'Always'} →{' '}
                      {tier.validUntil ? new Date(tier.validUntil).toLocaleDateString() : 'Indefinite'}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: tier.isActive ? '#DEF7EC' : '#F3F4F6',
                          color: tier.isActive ? '#03543F' : '#6B7280',
                          padding: '3px 8px',
                          borderRadius: '12px',
                        }}
                      >
                        {tier.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleDeletePricingTier(tier.id)}
                        className="car-btn-danger"
                        style={{ padding: '4px 8px', fontSize: '0.775rem' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}

                {pricingTiers.length === 0 && (
                  <tr>
                    <td colSpan={9}>
                      <div className="car-empty-box">
                        <div className="car-empty-icon">
                          <DollarSign size={24} />
                        </div>
                        <div style={{ fontWeight: 700, color: '#1A0322' }}>
                          Standard Base Rate Active
                        </div>
                        <div style={{ fontSize: '0.85rem' }}>
                          This vehicle is currently billed using its standard {vehicle.pricingMethod} rate ({vehicle.currency || 'PKR'}{' '}
                          {Number(
                            vehicle.pricingMethod === 'per_km'
                              ? vehicle.perKmRate || 0
                              : vehicle.pricingMethod === 'hourly'
                              ? vehicle.hourlyRate || 0
                              : vehicle.pricingMethod === 'monthly'
                              ? vehicle.monthlyRate || 0
                              : vehicle.dailyRate || 0
                          ).toLocaleString()}).
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 4: DOCUMENTS & EXPIRY ================= */}
      {activeTab === 'documents' && (
        <div className="car-submodule-wrap">
          <div className="car-submodule-actions">
            <div>
              <h3 className="car-submodule-title">Compliance Documents & Expiry Tracking</h3>
              <p className="car-submodule-sub">
                Insurance certificates, road permits, safety inspections, and registration records
              </p>
            </div>
            <button
              type="button"
              className="car-btn-primary"
              onClick={() => setIsAddDocOpen(true)}
            >
              <Plus size={16} />
              <span>Add Document</span>
            </button>
          </div>

          <div className="car-table-responsive">
            <table className="car-data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Title & Number</th>
                  <th>Issued Date</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th>Verification</th>
                  <th>File</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.775rem',
                          backgroundColor: '#F3EEF6',
                          color: '#6C1E84',
                          padding: '4px 8px',
                          borderRadius: '8px',
                        }}
                      >
                        {doc.documentType}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#1A0322' }}>{doc.title}</div>
                      <div style={{ fontSize: '0.8rem', color: '#8A7090', fontFamily: 'monospace' }}>
                        {doc.documentNumber || 'NO-REF-NUMBER'}
                      </div>
                    </td>
                    <td>
                      {doc.issuedAt ? new Date(doc.issuedAt).toLocaleDateString() : 'Not recorded'}
                    </td>
                    <td>
                      <div>
                        {doc.expiresAt ? new Date(doc.expiresAt).toLocaleDateString() : 'No expiry'}
                      </div>
                    </td>
                    <td>{getExpiryBadge(doc.expiresAt)}</td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: doc.verificationStatus === 'VERIFIED' ? '#DEF7EC' : '#FEF3C7',
                          color: doc.verificationStatus === 'VERIFIED' ? '#03543F' : '#92400E',
                          padding: '3px 8px',
                          borderRadius: '12px',
                        }}
                      >
                        {doc.verificationStatus}
                      </span>
                    </td>
                    <td>
                      {doc.fileUrl ? (
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#6C1E84',
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          <ExternalLink size={14} />
                          <span>View</span>
                        </a>
                      ) : (
                        <span style={{ color: '#A092A5' }}>No file</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="car-btn-danger"
                        style={{ padding: '4px 8px', fontSize: '0.775rem' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}

                {documents.length === 0 && (
                  <tr>
                    <td colSpan={8}>
                      <div className="car-empty-box">
                        <div className="car-empty-icon">
                          <Shield size={24} />
                        </div>
                        <div style={{ fontWeight: 700, color: '#1A0322' }}>
                          No Documents Uploaded Yet
                        </div>
                        <div style={{ fontSize: '0.85rem' }}>
                          Upload insurance certificates, registration papers, and road permits to
                          track expiry alerts automatically.
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 5: MAINTENANCE & REPAIRS ================= */}
      {activeTab === 'maintenance' && (
        <div className="car-submodule-wrap">
          <div className="car-submodule-actions">
            <div>
              <h3 className="car-submodule-title">Maintenance & Workshop Services</h3>
              <p className="car-submodule-sub">
                Scheduled servicing, preventive checks, mechanical repairs, and parts replacement
              </p>
            </div>
            <button
              type="button"
              className="car-btn-primary"
              onClick={() => setIsAddMaintOpen(true)}
            >
              <Plus size={16} />
              <span>Log Maintenance</span>
            </button>
          </div>

          <div className="car-table-responsive">
            <table className="car-data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Service Provider</th>
                  <th>Scheduled Date</th>
                  <th>Completed Date</th>
                  <th>Mileage</th>
                  <th>Cost</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {maintenanceRecords.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.775rem',
                          backgroundColor: '#FEF3C7',
                          color: '#92400E',
                          padding: '4px 8px',
                          borderRadius: '8px',
                        }}
                      >
                        {m.maintenanceType}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#1A0322' }}>{m.description}</td>
                    <td>{m.serviceProvider || 'Authorized Center'}</td>
                    <td>
                      {m.scheduledAt ? new Date(m.scheduledAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td>
                      {m.completedAt ? new Date(m.completedAt).toLocaleDateString() : 'In Progress'}
                    </td>
                    <td>{m.odometerValue ? `${m.odometerValue.toLocaleString()} km` : '—'}</td>
                    <td style={{ fontWeight: 700, color: '#1A0322' }}>
                      {m.costAmount ? `$${Number(m.costAmount).toFixed(2)}` : '—'}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor:
                            m.status === 'COMPLETED'
                              ? '#DEF7EC'
                              : m.status === 'IN_PROGRESS'
                              ? '#E1EFFE'
                              : '#FEF3C7',
                          color:
                            m.status === 'COMPLETED'
                              ? '#03543F'
                              : m.status === 'IN_PROGRESS'
                              ? '#1E429F'
                              : '#92400E',
                          padding: '3px 8px',
                          borderRadius: '12px',
                        }}
                      >
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {maintenanceRecords.length === 0 && (
                  <tr>
                    <td colSpan={8}>
                      <div className="car-empty-box">
                        <div className="car-empty-icon">
                          <Wrench size={24} />
                        </div>
                        <div style={{ fontWeight: 700, color: '#1A0322' }}>
                          No Maintenance History Logged
                        </div>
                        <div style={{ fontSize: '0.85rem' }}>
                          All scheduled services and workshop repair orders will appear here.
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 6: DAMAGE REPORTS ================= */}
      {activeTab === 'damages' && (
        <div className="car-submodule-wrap">
          <div className="car-submodule-actions">
            <div>
              <h3 className="car-submodule-title">Vehicle Damage Incidents & Reports</h3>
              <p className="car-submodule-sub">
                Track dents, scratches, glass chips, interior issues, and repair estimates
              </p>
            </div>
            <button
              type="button"
              className="car-btn-primary"
              onClick={() => setIsAddDamageOpen(true)}
            >
              <Plus size={16} />
              <span>Report Damage</span>
            </button>
          </div>

          <div className="car-table-responsive">
            <table className="car-data-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Damage Type</th>
                  <th>Description</th>
                  <th>Estimated Cost</th>
                  <th>Reported Date</th>
                  <th>Resolution Status</th>
                </tr>
              </thead>
              <tbody>
                {damageReports.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          backgroundColor:
                            d.severity === 'CRITICAL' || d.severity === 'HIGH'
                              ? '#FDF2F2'
                              : d.severity === 'MEDIUM'
                              ? '#FEF3C7'
                              : '#DEF7EC',
                          color:
                            d.severity === 'CRITICAL' || d.severity === 'HIGH'
                              ? '#9B1C1C'
                              : d.severity === 'MEDIUM'
                              ? '#92400E'
                              : '#03543F',
                          padding: '3px 8px',
                          borderRadius: '12px',
                        }}
                      >
                        {d.severity}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: '#1A0322' }}>{d.damageType}</td>
                    <td>{d.description}</td>
                    <td style={{ fontWeight: 700 }}>
                      {d.estimatedRepairCost ? `$${Number(d.estimatedRepairCost).toFixed(2)}` : 'TBD'}
                    </td>
                    <td>
                      {d.reportedAt || d.reportedDate
                        ? new Date(d.reportedAt || d.reportedDate || '').toLocaleDateString()
                        : 'N/A'}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor:
                            d.status === 'REPAIRED'
                              ? '#DEF7EC'
                              : d.status === 'UNDER_REVIEW'
                              ? '#FEF3C7'
                              : '#F3F4F6',
                          color:
                            d.status === 'REPAIRED'
                              ? '#03543F'
                              : d.status === 'UNDER_REVIEW'
                              ? '#92400E'
                              : '#374151',
                          padding: '3px 8px',
                          borderRadius: '12px',
                        }}
                      >
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {damageReports.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <div className="car-empty-box">
                        <div className="car-empty-icon" style={{ backgroundColor: '#DEF7EC', color: '#0E9F6E' }}>
                          <CheckCircle2 size={24} />
                        </div>
                        <div style={{ fontWeight: 700, color: '#1A0322' }}>
                          Zero Damage Reports on Record
                        </div>
                        <div style={{ fontSize: '0.85rem' }}>
                          This vehicle is in pristine condition with no open incidents or pending bodywork.
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 7: ODOMETER LOGS ================= */}
      {activeTab === 'odometer' && (
        <div className="car-submodule-wrap">
          <div className="car-submodule-actions">
            <div>
              <h3 className="car-submodule-title">Verified Odometer Mileage History</h3>
              <p className="car-submodule-sub">
                Audit trail of odometer readings captured during check-ins, returns, and servicing
              </p>
            </div>
            <button
              type="button"
              className="car-btn-primary"
              onClick={() => setIsAddOdoOpen(true)}
            >
              <Plus size={16} />
              <span>Record Mileage</span>
            </button>
          </div>

          <div className="car-table-responsive">
            <table className="car-data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Odometer Reading</th>
                  <th>Source</th>
                  <th>Recorded By</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {odometerLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.recordedAt).toLocaleString()}</td>
                    <td style={{ fontWeight: 700, color: '#1A0322' }}>
                      {log.odometerReading.toLocaleString()} km
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: '#F3EEF6',
                          color: '#6C1E84',
                          padding: '3px 8px',
                          borderRadius: '8px',
                        }}
                      >
                        {log.source}
                      </span>
                    </td>
                    <td>{log.recordedBy || 'System Automated'}</td>
                    <td style={{ color: '#66566A' }}>{log.notes || '—'}</td>
                  </tr>
                ))}

                {odometerLogs.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <div className="car-empty-box">
                        <div className="car-empty-icon">
                          <Gauge size={24} />
                        </div>
                        <div style={{ fontWeight: 700, color: '#1A0322' }}>
                          No Odometer Audit Logs Found
                        </div>
                        <div style={{ fontSize: '0.85rem' }}>
                          Current vehicle odometer is registered at {vehicle.mileage.toLocaleString()} km.
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 8: LOCATIONS & BRANCHES ================= */}
      {activeTab === 'locations' && (
        <div className="car-submodule-wrap">
          <div className="car-submodule-actions">
            <div>
              <h3 className="car-submodule-title">Location History & Branch Assignments</h3>
              <p className="car-submodule-sub">
                Branch reassignments, parking bay spots, and recorded telematic check-ins
              </p>
            </div>
          </div>

          {/* Current Branch Card */}
          <div className="car-card-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: '#FEF3C7',
                  color: '#D97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MapPin size={24} />
              </div>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A0322' }}>
                  {vehicle.branch?.name || 'Central Rental Hub'}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#66566A' }}>
                  Current Parking Bay: <strong>{vehicle.parkingSpot || 'Bay A-12'}</strong> •
                  Branch Code: {vehicle.branch?.code || 'MAIN-01'}
                </div>
              </div>
            </div>
          </div>

          <div className="car-table-responsive">
            <table className="car-data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Branch</th>
                  <th>Parking Bay</th>
                  <th>Source</th>
                  <th>Coordinates</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {locationLogs.map((loc) => (
                  <tr key={loc.id}>
                    <td>{new Date(loc.recordedAt).toLocaleString()}</td>
                    <td style={{ fontWeight: 700, color: '#1A0322' }}>
                      {loc.branch?.name || 'Designated Fleet Bay'}
                    </td>
                    <td>{loc.parkingBay || '—'}</td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: '#F3EEF6',
                          color: '#6C1E84',
                          padding: '3px 8px',
                          borderRadius: '8px',
                        }}
                      >
                        {loc.locationSource}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {loc.latitude && loc.longitude
                        ? `${Number(loc.latitude).toFixed(4)}, ${Number(loc.longitude).toFixed(4)}`
                        : 'Hub Fixed'}
                    </td>
                    <td style={{ color: '#66566A' }}>{loc.notes || '—'}</td>
                  </tr>
                ))}

                {locationLogs.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <div className="car-empty-box">
                        <div className="car-empty-icon">
                          <MapPin size={24} />
                        </div>
                        <div style={{ fontWeight: 700, color: '#1A0322' }}>
                          No Reassignment Logs
                        </div>
                        <div style={{ fontSize: '0.85rem' }}>
                          This vehicle remains stationed at its home branch ({vehicle.branch?.name || 'Central Hub'}).
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 9: BOOKINGS & AVAILABILITY CHECKER ================= */}
      {activeTab === 'availability' && (
        <div className="car-submodule-wrap">
          {/* Real-Time Database Availability Checker Tool */}
          <div className="car-avail-widget">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CalendarCheck size={22} color="#6C1E84" />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1A0322' }}>
                  Live Fleet Availability & Conflict Diagnostic Tool
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.825rem', color: '#66566A' }}>
                  Queries database reservations, active rental holds, and maintenance locks in real time
                </p>
              </div>
            </div>

            <form onSubmit={handleCheckAvailability} className="car-avail-form">
              <div className="car-field-group">
                <label className="car-field-label">Pickup Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={availStartDate}
                  onChange={(e) => setAvailStartDate(e.target.value)}
                  className="car-field-input"
                />
              </div>

              <div className="car-field-group">
                <label className="car-field-label">Return Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={availEndDate}
                  onChange={(e) => setAvailEndDate(e.target.value)}
                  className="car-field-input"
                />
              </div>

              <button
                type="submit"
                disabled={isCheckingAvail}
                className="car-btn-primary"
                style={{ height: '42px', padding: '0 24px', alignSelf: 'flex-end' }}
              >
                {isCheckingAvail ? 'Verifying...' : 'Verify Fleet Availability'}
              </button>
            </form>

            {/* Availability Result Alert */}
            {availResult && (
              <div
                className={`car-avail-result-box ${
                  availResult.isAvailable ? 'available' : 'conflicted'
                }`}
              >
                {availResult.isAvailable ? (
                  <CheckCircle2 size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                ) : (
                  <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                )}
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                    {availResult.isAvailable ? 'AVAILABLE FOR RESERVATION' : 'BOOKING CONFLICT DETECTED'}
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '0.85rem' }}>{availResult.reason}</div>
                  {availResult.conflictingBooking && (
                    <div style={{ marginTop: '6px', fontSize: '0.8rem', opacity: 0.9 }}>
                      Conflicting Reservation ID: #{availResult.conflictingBooking.bookingNumber} (
                      {availResult.conflictingBooking.status})
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Booking History Table */}
          <div className="car-submodule-actions">
            <div>
              <h3 className="car-submodule-title">Vehicle Booking History ({bookings.length})</h3>
              <p className="car-submodule-sub">
                Confirmed, active, and completed rental reservations for this vehicle
              </p>
            </div>
          </div>

          <div className="car-table-responsive">
            <table className="car-data-table">
              <thead>
                <tr>
                  <th>Booking #</th>
                  <th>Customer</th>
                  <th>Pickup Date</th>
                  <th>Return Date</th>
                  <th>Duration</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#6C1E84' }}>
                      {b.bookingNumber}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#1A0322' }}>
                        {b.customer?.fullName || 'Guest Customer'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#8A7090' }}>
                        {b.customer?.email || '—'}
                      </div>
                    </td>
                    <td>{new Date(b.pickupDateTime).toLocaleString()}</td>
                    <td>{new Date(b.returnDateTime).toLocaleString()}</td>
                    <td>{b.totalDays} day(s)</td>
                    <td style={{ fontWeight: 700, color: '#1A0322' }}>
                      ${Number(b.totalAmount).toFixed(2)} {b.currency}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor:
                            b.status === 'COMPLETED'
                              ? '#DEF7EC'
                              : b.status === 'ACTIVE'
                              ? '#E1EFFE'
                              : b.status === 'CONFIRMED'
                              ? '#FEF3C7'
                              : '#FDF2F2',
                          color:
                            b.status === 'COMPLETED'
                              ? '#03543F'
                              : b.status === 'ACTIVE'
                              ? '#1E429F'
                              : b.status === 'CONFIRMED'
                              ? '#92400E'
                              : '#9B1C1C',
                          padding: '3px 8px',
                          borderRadius: '12px',
                        }}
                      >
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {bookings.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <div className="car-empty-box">
                        <div className="car-empty-icon">
                          <CalendarCheck size={24} />
                        </div>
                        <div style={{ fontWeight: 700, color: '#1A0322' }}>
                          No Bookings Recorded Yet
                        </div>
                        <div style={{ fontSize: '0.85rem' }}>
                          This vehicle is completely unreserved and available for immediate booking.
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 10: AUDIT TRAIL ================= */}
      {activeTab === 'audit' && (
        <div className="car-submodule-wrap">
          <div className="car-submodule-actions">
            <div>
              <h3 className="car-submodule-title">Fleet Security & Operational Audit Log</h3>
              <p className="car-submodule-sub">
                Immutable chronological log of privileged changes, odometer adjustments, and status transitions
              </p>
            </div>
          </div>

          <div className="car-table-responsive">
            <table className="car-data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Details</th>
                  <th>Actor</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: '#F3EEF6',
                          color: '#6C1E84',
                          padding: '3px 8px',
                          borderRadius: '8px',
                        }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td style={{ color: '#1A0322', fontWeight: 500 }}>{log.details || '—'}</td>
                    <td>{log.userEmail || log.userId || 'System'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#8A7090' }}>
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                ))}

                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <div className="car-empty-box">
                        <div className="car-empty-icon">
                          <Activity size={24} />
                        </div>
                        <div style={{ fontWeight: 700, color: '#1A0322' }}>
                          No Prior Audit Events Recorded
                        </div>
                        <div style={{ fontSize: '0.85rem' }}>
                          Audit entries will be automatically created whenever fleet managers modify
                          specifications, add documents, or log servicing.
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD DOCUMENT ================= */}
      {isAddDocOpen && (
        <AddDocumentModal
          vehicleId={vehicle.id}
          onClose={() => setIsAddDocOpen(false)}
          onSuccess={() => {
            setIsAddDocOpen(false);
            loadSubResources(vehicle.id);
          }}
        />
      )}

      {/* ================= MODAL: LOG MAINTENANCE ================= */}
      {isAddMaintOpen && (
        <AddMaintenanceModal
          vehicleId={vehicle.id}
          currentMileage={vehicle.mileage}
          onClose={() => setIsAddMaintOpen(false)}
          onSuccess={() => {
            setIsAddMaintOpen(false);
            loadSubResources(vehicle.id);
          }}
        />
      )}

      {/* ================= MODAL: REPORT DAMAGE ================= */}
      {isAddDamageOpen && (
        <AddDamageModal
          vehicleId={vehicle.id}
          onClose={() => setIsAddDamageOpen(false)}
          onSuccess={() => {
            setIsAddDamageOpen(false);
            loadSubResources(vehicle.id);
          }}
        />
      )}

      {/* ================= MODAL: RECORD ODOMETER ================= */}
      {isAddOdoOpen && (
        <AddOdometerModal
          vehicleId={vehicle.id}
          currentMileage={vehicle.mileage}
          onClose={() => setIsAddOdoOpen(false)}
          onSuccess={() => {
            setIsAddOdoOpen(false);
            fleetApi.getVehicleById(vehicle.id).then((r) => r.vehicle && setVehicle(r.vehicle));
            loadSubResources(vehicle.id);
          }}
        />
      )}

      {/* ================= MODAL: ADD PRICING TIER ================= */}
      {isAddPricingOpen && (
        <AddPricingTierModal
          vehicleId={vehicle.id}
          dailyRate={Number(vehicle.dailyRate)}
          onClose={() => setIsAddPricingOpen(false)}
          onSuccess={() => {
            setIsAddPricingOpen(false);
            loadSubResources(vehicle.id);
          }}
        />
      )}

      {/* ================= MODAL: ARCHIVE / RESTORE CONFIRMATION ================= */}
      {isArchiveModalOpen && (
        <div className="car-modal-overlay" onClick={() => setIsArchiveModalOpen(false)}>
          <div className="car-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="car-modal-header">
              <h3 className="car-modal-title">
                {vehicle.status === 'ARCHIVED' ? 'Restore Vehicle to Fleet' : 'Archive Vehicle from Active Fleet'}
              </h3>
              <button
                type="button"
                onClick={() => setIsArchiveModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#66566A' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="car-modal-body">
              {archiveError && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#FDF2F2',
                    color: '#9B1C1C',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  {archiveError}
                </div>
              )}

              <p style={{ margin: 0, color: '#4A3D4E', fontSize: '0.925rem', lineHeight: 1.5 }}>
                {vehicle.status === 'ARCHIVED' ? (
                  <>
                    Restoring <strong>{vehicle.brand} {vehicle.model}</strong> ({vehicle.registrationNumber})
                    will make it available again for customer catalog listings, branch dispatch, and active bookings.
                  </>
                ) : (
                  <>
                    Archiving <strong>{vehicle.brand} {vehicle.model}</strong> will hide it from customer rental
                    searches and prevent new reservations.
                    <br />
                    <br />
                    <span style={{ fontSize: '0.85rem', color: '#66566A' }}>
                      <em>Note:</em> The system verifies that no active or future confirmed bookings exist before
                      allowing safe archival. All historical bookings, financial transactions, and maintenance records
                      are preserved.
                    </span>
                  </>
                )}
              </p>
            </div>

            <div className="car-modal-footer">
              <button
                type="button"
                onClick={() => setIsArchiveModalOpen(false)}
                className="car-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={archiveActionLoading}
                onClick={handleArchiveToggle}
                className={vehicle.status === 'ARCHIVED' ? 'car-btn-primary' : 'car-btn-danger'}
              >
                {archiveActionLoading
                  ? 'Processing...'
                  : vehicle.status === 'ARCHIVED'
                  ? 'Confirm Restore'
                  : 'Confirm Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= LIGHTBOX / FULLSCREEN VIEWER ================= */}
      {isViewerOpen && (
        <CarImageLightbox
          photos={photos}
          activeIndex={activePhotoIndex}
          carName={`${vehicle.brand} ${vehicle.model}`}
          onClose={() => setIsViewerOpen(false)}
          onPrev={handlePrevPhoto}
          onNext={handleNextPhoto}
        />
      )}
    </div>
  );
}

/* ==========================================================================
   SUB-MODAL COMPONENTS
   ========================================================================== */

function AddDocumentModal({
  vehicleId,
  onClose,
  onSuccess,
}: {
  vehicleId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [documentType, setDocumentType] = useState('INSURANCE');
  const [title, setTitle] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [issuedAt, setIssuedAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await fleetApi.createDocument(vehicleId, {
        documentType: documentType as any,
        title,
        documentNumber: documentNumber || undefined,
        issuedAt: issuedAt || undefined,
        expiresAt: expiresAt || undefined,
        fileUrl: fileUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800',
        notes: notes || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save document record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="car-modal-overlay" onClick={onClose}>
      <div className="car-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="car-modal-header">
          <h3 className="car-modal-title">Upload & Register Document</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="car-modal-body">
            {error && (
              <div style={{ color: '#E02424', fontSize: '0.85rem', fontWeight: 600 }}>{error}</div>
            )}

            <div className="car-field-group">
              <label className="car-field-label">Document Type *</label>
              <CustomSelect
                value={documentType}
                onChange={(val) => setDocumentType(val)}
                options={[
                  { value: 'INSURANCE', label: 'Insurance Policy Certificate' },
                  { value: 'REGISTRATION', label: 'Vehicle Registration / Title' },
                  { value: 'ROAD_TAX', label: 'Road Tax Decal' },
                  { value: 'SAFETY_INSPECTION', label: 'Government Safety Inspection' },
                  { value: 'COMMERCIAL_PERMIT', label: 'Commercial Transport Permit' },
                  { value: 'OTHER', label: 'Other Operational Document' },
                ]}
              />
            </div>

            <div className="car-field-group">
              <label className="car-field-label">Document Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Comprehensive Commercial Insurance"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="car-field-input"
              />
            </div>

            <div className="car-field-group">
              <label className="car-field-label">Document / Policy Number</label>
              <input
                type="text"
                placeholder="e.g. POL-2026-991823"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                className="car-field-input"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="car-field-group">
                <label className="car-field-label">Issued Date</label>
                <input
                  type="date"
                  value={issuedAt}
                  onChange={(e) => setIssuedAt(e.target.value)}
                  className="car-field-input"
                />
              </div>

              <div className="car-field-group">
                <label className="car-field-label">Expiry Date</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="car-field-input"
                />
              </div>
            </div>

            <div className="car-field-group">
              <label className="car-field-label">Document File URL (or Storage Key)</label>
              <input
                type="text"
                placeholder="https://... or storage file path"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                className="car-field-input"
              />
            </div>

            <div className="car-field-group">
              <label className="car-field-label">Notes & Conditions</label>
              <textarea
                rows={2}
                placeholder="Any special endorsements or stipulations"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="car-field-input"
              />
            </div>
          </div>

          <div className="car-modal-footer">
            <button type="button" onClick={onClose} className="car-btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="car-btn-primary">
              {isSubmitting ? 'Saving...' : 'Register Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddMaintenanceModal({
  vehicleId,
  currentMileage,
  onClose,
  onSuccess,
}: {
  vehicleId: string;
  currentMileage: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [maintenanceType, setMaintenanceType] = useState('SCHEDULED_SERVICE');
  const [description, setDescription] = useState('');
  const [serviceProvider, setServiceProvider] = useState('');
  const [scheduledAt, setScheduledAt] = useState(new Date().toISOString().split('T')[0]);
  const [completedAt, setCompletedAt] = useState('');
  const [odometerValue, setOdometerValue] = useState<number>(currentMileage);
  const [costAmount, setCostAmount] = useState<number>(250);
  const [status, setStatus] = useState('SCHEDULED');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await fleetApi.createMaintenance(vehicleId, {
        maintenanceType: maintenanceType as any,
        description,
        serviceProvider: serviceProvider || undefined,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        completedAt: completedAt ? new Date(completedAt).toISOString() : undefined,
        odometerValue: odometerValue ? Number(odometerValue) : undefined,
        costAmount: costAmount ? Number(costAmount) : undefined,
        currency: 'USD',
        status: status as any,
        notes: notes || undefined,
      });
      onSuccess();
    } catch (err) {
      console.error('Failed to log maintenance:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="car-modal-overlay" onClick={onClose}>
      <div className="car-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="car-modal-header">
          <h3 className="car-modal-title">Log Maintenance or Service</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="car-modal-body">
            <div className="car-field-group">
              <label className="car-field-label">Maintenance Category *</label>
              <CustomSelect
                value={maintenanceType}
                onChange={(val) => setMaintenanceType(val)}
                options={[
                  { value: 'SCHEDULED_SERVICE', label: 'Scheduled Routine Service' },
                  { value: 'OIL_CHANGE', label: 'Engine Oil & Filter Service' },
                  { value: 'TIRE_SERVICE', label: 'Tire Rotation / Replacement' },
                  { value: 'BRAKE_SERVICE', label: 'Brake Inspection & Pads' },
                  { value: 'MECHANICAL_REPAIR', label: 'Mechanical Workshop Repair' },
                  { value: 'BODYWORK', label: 'Bodywork & Paint Touch-up' },
                  { value: 'ELECTRICAL', label: 'Electrical & Sensor Calibration' },
                  { value: 'INSPECTION', label: 'State Safety Inspection' },
                  { value: 'OTHER', label: 'Other Workshop Service' },
                ]}
              />
            </div>

            <div className="car-field-group">
              <label className="car-field-label">Description of Work *</label>
              <input
                type="text"
                required
                placeholder="e.g. 20,000 km Major Service & Synthetic Oil"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="car-field-input"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="car-field-group">
                <label className="car-field-label">Service Provider</label>
                <input
                  type="text"
                  placeholder="e.g. Porsche Center Workshop"
                  value={serviceProvider}
                  onChange={(e) => setServiceProvider(e.target.value)}
                  className="car-field-input"
                />
              </div>

              <div className="car-field-group">
                <label className="car-field-label">Cost (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={costAmount}
                  onChange={(e) => setCostAmount(Number(e.target.value))}
                  className="car-field-input"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="car-field-group">
                <label className="car-field-label">Scheduled Date</label>
                <input
                  type="date"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="car-field-input"
                />
              </div>

              <div className="car-field-group">
                <label className="car-field-label">Completed Date</label>
                <input
                  type="date"
                  value={completedAt}
                  onChange={(e) => setCompletedAt(e.target.value)}
                  className="car-field-input"
                />
              </div>
            </div>

            <div className="car-field-group">
              <label className="car-field-label">Current Status</label>
              <CustomSelect
                value={status}
                onChange={(val) => setStatus(val)}
                options={[
                  { value: 'SCHEDULED', label: 'Scheduled' },
                  { value: 'IN_PROGRESS', label: 'In Progress' },
                  { value: 'COMPLETED', label: 'Completed' },
                  { value: 'CANCELLED', label: 'Cancelled' },
                ]}
              />
            </div>

            <div className="car-field-group">
              <label className="car-field-label">Odometer at Service (km)</label>
              <input
                type="number"
                value={odometerValue}
                onChange={(e) => setOdometerValue(Number(e.target.value))}
                className="car-field-input"
              />
            </div>

            <div className="car-field-group">
              <label className="car-field-label">Work Notes</label>
              <textarea
                rows={2}
                placeholder="Technician observations or parts installed"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="car-field-input"
              />
            </div>
          </div>

          <div className="car-modal-footer">
            <button type="button" onClick={onClose} className="car-btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="car-btn-primary">
              {isSubmitting ? 'Saving...' : 'Save Maintenance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddDamageModal({
  vehicleId,
  onClose,
  onSuccess,
}: {
  vehicleId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [damageType, setDamageType] = useState('SCRATCH');
  const [severity, setSeverity] = useState('LOW');
  const [description, setDescription] = useState('');
  const [estimatedRepairCost, setEstimatedRepairCost] = useState<number>(150);
  const [status, setStatus] = useState('REPORTED');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await fleetApi.createDamageReport(vehicleId, {
        damageType,
        severity: severity as any,
        description,
        estimatedRepairCost: estimatedRepairCost ? Number(estimatedRepairCost) : undefined,
        currency: 'USD',
        status: status as any,
        notes: notes || undefined,
      });
      onSuccess();
    } catch (err) {
      console.error('Failed to report damage:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="car-modal-overlay" onClick={onClose}>
      <div className="car-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="car-modal-header">
          <h3 className="car-modal-title">Report Vehicle Damage</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="car-modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="car-field-group">
                <label className="car-field-label">Damage Type *</label>
                <CustomSelect
                  value={damageType}
                  onChange={(val) => setDamageType(val)}
                  options={[
                    { value: 'SCRATCH', label: 'Paint Scratch' },
                    { value: 'DENT', label: 'Body Dent' },
                    { value: 'WINDSHIELD', label: 'Windshield Chip / Crack' },
                    { value: 'INTERIOR', label: 'Upholstery / Interior Stain' },
                    { value: 'WHEEL', label: 'Alloy Wheel Scuff' },
                    { value: 'MECHANICAL', label: 'Mechanical Issue' },
                    { value: 'OTHER', label: 'Other Incident' },
                  ]}
                />
              </div>

              <div className="car-field-group">
                <label className="car-field-label">Severity Level *</label>
                <CustomSelect
                  value={severity}
                  onChange={(val) => setSeverity(val)}
                  options={[
                    { value: 'LOW', label: 'Low (Cosmetic)' },
                    { value: 'MEDIUM', label: 'Medium (Requires Touch-up)' },
                    { value: 'HIGH', label: 'High (Safety concern)' },
                    { value: 'CRITICAL', label: 'Critical (Vehicle grounded)' },
                  ]}
                />
              </div>
            </div>

            <div className="car-field-group">
              <label className="car-field-label">Damage Description *</label>
              <textarea
                rows={3}
                required
                placeholder="Describe location, size, and circumstances of damage"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="car-field-input"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="car-field-group">
                <label className="car-field-label">Estimated Repair Cost ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={estimatedRepairCost}
                  onChange={(e) => setEstimatedRepairCost(Number(e.target.value))}
                  className="car-field-input"
                />
              </div>

              <div className="car-field-group">
                <label className="car-field-label">Initial Status</label>
                <CustomSelect
                  value={status}
                  onChange={(val) => setStatus(val)}
                  options={[
                    { value: 'REPORTED', label: 'Reported' },
                    { value: 'UNDER_REVIEW', label: 'Under Review' },
                    { value: 'IN_REPAIR', label: 'In Repair' },
                  ]}
                />
              </div>
            </div>

            <div className="car-field-group">
              <label className="car-field-label">Additional Notes</label>
              <textarea
                rows={2}
                placeholder="Optional inspection or witness remarks"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="car-field-input"
              />
            </div>
          </div>

          <div className="car-modal-footer">
            <button type="button" onClick={onClose} className="car-btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="car-btn-primary">
              {isSubmitting ? 'Submitting...' : 'File Damage Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddOdometerModal({
  vehicleId,
  currentMileage,
  onClose,
  onSuccess,
}: {
  vehicleId: string;
  currentMileage: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reading, setReading] = useState<number>(currentMileage);
  const [source, setSource] = useState('MANUAL_AUDIT');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm } = useConfirm();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reading < currentMileage) {
      const ok = await confirm({
        title: 'Confirm Calibration Rollback',
        message: `The entered reading (${Number(reading).toLocaleString()} km) is lower than current odometer (${currentMileage.toLocaleString()} km).`,
        note: 'This will be flagged in the vehicle audit log as an odometer rollback.',
        confirmText: 'Confirm Rollback',
        cancelText: 'Cancel',
        variant: 'warning',
      });
      if (!ok) {
        return;
      }
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await fleetApi.createOdometerLog(vehicleId, {
        odometerReading: Number(reading),
        source: source as any,
        notes: notes || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to record odometer reading');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="car-modal-overlay" onClick={onClose}>
      <div className="car-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="car-modal-header">
          <h3 className="car-modal-title">Record Verified Odometer Reading</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="car-modal-body">
            {error && (
              <div style={{ color: '#E02424', fontSize: '0.85rem', fontWeight: 600 }}>{error}</div>
            )}

            <div className="car-field-group">
              <label className="car-field-label">Current Meter Reading (km) *</label>
              <input
                type="number"
                required
                min={0}
                value={reading}
                onChange={(e) => setReading(Number(e.target.value))}
                className="car-field-input"
              />
            </div>

            <div className="car-field-group">
              <label className="car-field-label">Source of Log</label>
              <CustomSelect
                value={source}
                onChange={(val) => setSource(val)}
                options={[
                  { value: 'MANUAL_AUDIT', label: 'Manual Yard Inspection' },
                  { value: 'TRIP_RETURN', label: 'Customer Trip Return Check-in' },
                  { value: 'TRIP_START', label: 'Pre-rental Dispatch Check-out' },
                  { value: 'MAINTENANCE', label: 'Workshop Service Reading' },
                  { value: 'CALIBRATION', label: 'Cluster Calibration' },
                ]}
              />
            </div>

            <div className="car-field-group">
              <label className="car-field-label">Notes</label>
              <textarea
                rows={2}
                placeholder="Reason for odometer verification"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="car-field-input"
              />
            </div>
          </div>

          <div className="car-modal-footer">
            <button type="button" onClick={onClose} className="car-btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="car-btn-primary">
              {isSubmitting ? 'Recording...' : 'Update Odometer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddPricingTierModal({
  vehicleId,
  dailyRate,
  onClose,
  onSuccess,
}: {
  vehicleId: string;
  dailyRate: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [rateName, setRateName] = useState('High Season Special');
  const [pricingMethod, setPricingMethod] = useState<'daily' | 'per_km' | 'daily_extra_km' | 'hourly' | 'monthly'>('daily');
  const [currency, setCurrency] = useState('PKR');
  const [baseRate, setBaseRate] = useState<number>(dailyRate || 8000);
  const [securityDeposit, setSecurityDeposit] = useState<number>(25000);
  const [includedKmPerDay, setIncludedKmPerDay] = useState<number>(200);
  const [extraKmRate, setExtraKmRate] = useState<number>(50);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await fleetApi.createPricingTier(vehicleId, {
        rateName,
        pricingMethod,
        billingUnit: pricingMethod === 'hourly' ? 'HOURLY' : pricingMethod === 'monthly' ? 'MONTHLY' : 'DAILY',
        baseRate: Number(baseRate),
        currency,
        securityDeposit: Number(securityDeposit),
        includedKmPerDay: Number(includedKmPerDay),
        extraKmRate: Number(extraKmRate),
        isActive: true,
      });
      onSuccess();
    } catch (err) {
      console.error('Failed to create rate tier:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="car-modal-overlay" onClick={onClose}>
      <div className="car-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="car-modal-header">
          <h3 className="car-modal-title">Create Rental Pricing Tier</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="car-modal-body">
            <div className="car-field-group">
              <label className="car-field-label">Tier Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Corporate Rate, High Season, Long Term"
                value={rateName}
                onChange={(e) => setRateName(e.target.value)}
                className="car-field-input"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="car-field-group">
                <label className="car-field-label">Pricing Method *</label>
                <CustomSelect
                  value={pricingMethod}
                  onChange={(val) => setPricingMethod(val as any)}
                  options={[
                    { value: 'daily', label: 'Daily Rental' },
                    { value: 'per_km', label: 'Per-Kilometer' },
                    { value: 'daily_extra_km', label: 'Daily + Extra KM' },
                    { value: 'hourly', label: 'Hourly Rental' },
                    { value: 'monthly', label: 'Monthly Rental' },
                  ]}
                />
              </div>

              <div className="car-field-group">
                <label className="car-field-label">Currency *</label>
                <CustomSelect
                  value={currency}
                  onChange={(val) => setCurrency(val)}
                  options={[
                    { value: 'PKR', label: 'PKR (Pakistani Rupee)' },
                    { value: 'USD', label: 'USD (US Dollar)' },
                    { value: 'EUR', label: 'EUR (Euro)' },
                    { value: 'AED', label: 'AED (UAE Dirham)' },
                  ]}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="car-field-group">
                <label className="car-field-label">Base Rate ({currency}) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={baseRate}
                  onChange={(e) => setBaseRate(Number(e.target.value))}
                  className="car-field-input"
                />
              </div>

              <div className="car-field-group">
                <label className="car-field-label">Security Deposit ({currency})</label>
                <input
                  type="number"
                  step="0.01"
                  value={securityDeposit}
                  onChange={(e) => setSecurityDeposit(Number(e.target.value))}
                  className="car-field-input"
                />
              </div>
            </div>

            {(pricingMethod === 'daily' || pricingMethod === 'daily_extra_km') && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="car-field-group">
                  <label className="car-field-label">Included KM / Day</label>
                  <input
                    type="number"
                    value={includedKmPerDay}
                    onChange={(e) => setIncludedKmPerDay(Number(e.target.value))}
                    className="car-field-input"
                  />
                </div>

                <div className="car-field-group">
                  <label className="car-field-label">Extra KM Fee ({currency}/km)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={extraKmRate}
                    onChange={(e) => setExtraKmRate(Number(e.target.value))}
                    className="car-field-input"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="car-modal-footer">
            <button type="button" onClick={onClose} className="car-btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="car-btn-primary">
              {isSubmitting ? 'Creating...' : 'Create Rate Tier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ==========================================================================
   LIGHTBOX COMPONENT
   ========================================================================== */

interface CarImageLightboxProps {
  photos: string[];
  activeIndex: number;
  carName: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

function CarImageLightbox({
  photos,
  activeIndex,
  carName,
  onClose,
  onPrev,
  onNext,
}: CarImageLightboxProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        onPrev();
      } else if (e.key === 'ArrowRight') {
        onNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPrev, onNext, onClose]);

  const currentPhoto = photos[activeIndex] || photos[0];

  return (
    <div className="car-lightbox-backdrop" onClick={onClose}>
      <button
        type="button"
        className="car-lightbox-close"
        onClick={onClose}
        title="Close viewer (Esc)"
      >
        <X size={22} />
      </button>

      <div className="car-lightbox-counter">
        {activeIndex + 1} / {photos.length}
      </div>

      {photos.length > 1 && (
        <>
          <button
            type="button"
            className="car-lightbox-nav prev"
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            title="Previous photo (Arrow Left)"
          >
            <ChevronLeft size={28} />
          </button>
          <button
            type="button"
            className="car-lightbox-nav next"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            title="Next photo (Arrow Right)"
          >
            <ChevronRight size={28} />
          </button>
        </>
      )}

      <div className="car-lightbox-content" onClick={(e) => e.stopPropagation()}>
        <img
          src={currentPhoto}
          alt={`${carName} - Large View`}
          className="car-lightbox-img"
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.src.includes('/cars/car-4-tucson.png')) {
              target.src = '/cars/car-4-tucson.png';
            }
          }}
        />
      </div>
    </div>
  );
}
