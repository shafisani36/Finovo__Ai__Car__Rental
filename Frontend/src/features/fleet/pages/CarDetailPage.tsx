import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCarImage, getCarGallery, APP_CURRENCY } from '../../../utils/carImageHelper';
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
  Banknote,
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
  Zap,
  Briefcase,
} from 'lucide-react';
import { useConfirm } from '../../../components/common/ConfirmModal';
import { CustomSelect } from '../../../components/common/CustomSelect';
import { parseVehicleNotes } from '../../../utils/vehicleNotesHelper';
import './CarDetailPage.css';
import { useTranslation } from 'react-i18next';

export function CarDetailPage() {
  const { t } = useTranslation();
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
  const [isFinishMaintOpen, setIsFinishMaintOpen] = useState(false);
  const [maintActionError, setMaintActionError] = useState<string | null>(null);
  const [completingMaintId, setCompletingMaintId] = useState<string | null>(null);
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

  /** Reloads the car (its status may have changed) and its records */
  const refreshVehicle = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fleetApi.getVehicleById(id);
      if (res.vehicle) setVehicle(res.vehicle);
    } catch (err) {
      console.error('Failed to reload vehicle:', err);
    }
    await loadSubResources(id);
  }, [id, loadSubResources]);

  // Jobs that keep the car off the market now (future services do not)
  const openMaintenance = maintenanceRecords.filter(
    (m) =>
      m.status === 'IN_PROGRESS' ||
      (m.status === 'SCHEDULED' && new Date(m.scheduledDate ?? m.scheduledAt ?? 0).getTime() <= Date.now())
  );

  const completeMaintenance = async (maintId: string) => {
    if (!vehicle) return;
    setCompletingMaintId(maintId);
    setMaintActionError(null);
    try {
      await fleetApi.updateMaintenance(vehicle.id, maintId, {
        status: 'COMPLETED',
        completedDate: new Date().toISOString(),
      });
      await refreshVehicle();
    } catch (err) {
      setMaintActionError(err instanceof Error ? err.message : t('adminPages.carDetail.errMaintAction'));
    } finally {
      setCompletingMaintId(null);
    }
  };

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
        } else if (isMounted) {
          throw new Error(t('adminPages.carDetail.errNotReturned'));
        }
      })
      .catch((err) => {
        if (isMounted) {
          setVehicle(null);
          setError(err?.message || t('adminPages.carDetail.errLoad'));
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
    // Loads once per record; the language is only used for error text, so a language change must not reload the form
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, loadSubResources]);

  // Loading Screen
  if (isLoading) {
    return (
      <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '60px 0', textAlign: 'center' }}>
        <div style={{ fontSize: '1.1rem', color: '#66566A', fontWeight: 600 }}>
          {t('adminPages.carDetail.loading')}
        </div>
      </div>
    );
  }

  // Not Found / Error Screen
  if (error || !vehicle) {
    return (
      <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '60px 0', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1A0322', marginBottom: '12px' }}>
          {t('adminPages.carDetail.notFound')}
        </h2>
        <p style={{ color: '#66566A', marginBottom: '24px' }}>
          {t('adminPages.carDetail.notFoundDesc')}
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
          <span>{t('adminPages.carDetail.backToCars')}</span>
        </Link>
      </div>
    );
  }

  // Determine list of photos for carousel using intelligent resolver
  const photos = getCarGallery(vehicle);
  const primaryFallback = getCarImage(vehicle);

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
            {t('adminPages.carDetail.available')}
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
            {t('adminPages.carDetail.rented')}
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
            {t('adminPages.carDetail.maintenance')}
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
            {t('adminPages.carDetail.archived')}
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
    if (!expiresAt) return <span style={{ color: '#8A7090' }}>{t('adminPages.carDetail.noExpiryDate')}</span>;
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
          {t('adminPages.carDetail._expired', { days: Math.abs(diffDays) })}
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
          {t('adminPages.carDetail._expiringSoon', { days: diffDays })}
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
        {t('adminPages.carDetail._valid', { days: diffDays })}
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
      setArchiveError(err.message || t('adminPages.carDetail.errOperation'));
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
        reason: err.message || t('adminPages.carDetail.errAvailability'),
      });
    } finally {
      setIsCheckingAvail(false);
    }
  };

  // Document Deletion
  const handleDeleteDocument = async (docId: string) => {
    if (!vehicle) return;
    const ok = await confirm({
      title: t('adminPages.carDetail.deleteDocTitle'),
      message: t('adminPages.carDetail.deleteDocMessage'),
      confirmText: t('adminPages.carDetail.deleteDoc'),
      cancelText: t('adminPages.carDetail.cancel'),
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
      title: t('adminPages.carDetail.removeTierTitle'),
      message: t('adminPages.carDetail.removeTierMessage'),
      confirmText: t('adminPages.carDetail.removeTier'),
      cancelText: t('adminPages.carDetail.cancel'),
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

  const parsedNotes = parseVehicleNotes(vehicle?.notes);
  const extraSpecs = parsedNotes.extraSpecs;

  return (
    <div className="car-detail-page">
      {/* ================= BREADCRUMB & HEADER ================= */}
      <div className="car-detail-header">
        <div className="car-detail-breadcrumb">
          <Link to="/admin/cars" style={{ color: '#8A7090', textDecoration: 'none', fontWeight: 500 }}>
            {t('adminPages.carDetail.cars')}
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
              {t('adminPages.carDetail._subtitle', { code: vehicle.vehicleCode || 'FLEET-AUTOGEN', plate: vehicle.registrationNumber, year: vehicle.year })}
            </p>
          </div>

          {/* Status Badges + Actions */}
          <div className="car-detail-actions">
            {renderStatusBadge(vehicle.status)}

            {vehicle.status === 'MAINTENANCE' && (
              <button type="button" onClick={() => setIsFinishMaintOpen(true)} className="car-btn-primary">
                <CheckCircle2 size={16} />
                <span>{t('adminPages.carDetail.finishMaint')}</span>
              </button>
            )}

            {/* Availability Checker Shortcut */}
            <button
              type="button"
              onClick={() => setActiveTab('availability')}
              className="car-btn-secondary"
              title={t('adminPages.carDetail.checkDatesTitle')}
            >
              <CalendarCheck size={16} />
              <span>{t('adminPages.carDetail.checkDates')}</span>
            </button>

            {/* Archive / Restore Button */}
            <button
              type="button"
              onClick={() => {
                setArchiveError(null);
                setIsArchiveModalOpen(true);
              }}
              className="car-btn-secondary"
              title={vehicle.status === 'ARCHIVED' ? t('adminPages.carDetail.restoreVehicle') : t('adminPages.carDetail.archiveVehicle')}
            >
              {vehicle.status === 'ARCHIVED' ? <RotateCcw size={16} /> : <Archive size={16} />}
              <span>{vehicle.status === 'ARCHIVED' ? t('adminPages.carDetail.restore') : t('adminPages.carDetail.archive')}</span>
            </button>

            {/* Edit Button */}
            <button
              type="button"
              onClick={() => navigate(`/admin/cars/${vehicle.id}/edit`)}
              className="car-edit-btn"
            >
              <Pencil size={16} strokeWidth={2.5} />
              <span>{t('adminPages.carDetail.edit')}</span>
            </button>
          </div>
        </div>
      </div>

      {vehicle.status === 'MAINTENANCE' && (
        <div
          role="status"
          style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            padding: '14px 18px',
            marginBottom: '20px',
            borderRadius: '14px',
            backgroundColor: '#FFFBEB',
            border: '1px solid #FDE68A',
            color: '#92400E',
          }}
        >
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <Wrench size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 800 }}>{t('adminPages.carDetail.inMaintTitle')}</div>
              <div style={{ fontSize: '0.875rem' }}>
                {t('adminPages.carDetail.inMaintText', { count: openMaintenance.length })}
              </div>
            </div>
          </div>
          <button type="button" onClick={() => setIsFinishMaintOpen(true)} className="car-btn-primary">
            <CheckCircle2 size={16} />
            <span>{t('adminPages.carDetail.finishMaint')}</span>
          </button>
        </div>
      )}

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
                title={fitMode === 'cover' ? t('adminPages.carDetail.fitCar') : t('adminPages.carDetail.fillFrame')}
              >
                {fitMode === 'cover' ? <Minimize2 size={13} /> : <Scan size={13} />}
                <span>{fitMode === 'cover' ? t('adminPages.carDetail.fitCarShort') : t('adminPages.carDetail.fillCard')}</span>
              </button>

              <button
                type="button"
                className="car-photo-icon-btn"
                onClick={() => setIsViewerOpen(true)}
                title={t('adminPages.carDetail.expandTitle')}
              >
                <Maximize2 size={13} />
                <span>{t('adminPages.carDetail.expand')}</span>
              </button>
            </div>

            {/* Navigation Arrows */}
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  className="car-photo-nav-btn prev"
                  onClick={handlePrevPhoto}
                  aria-label={t('adminPages.carDetail.prevPhoto')}
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  className="car-photo-nav-btn next"
                  onClick={handleNextPhoto}
                  aria-label={t('adminPages.carDetail.nextPhoto')}
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
                  if (!target.src.includes(primaryFallback)) {
                    target.src = primaryFallback;
                  }
                }}
              />
            </div>

            {/* Bottom Dots Indicator */}
            {photos.length > 1 && (
              <div className="car-photo-bottom-bar">
                <div className="car-photo-dots-pill">
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
              </div>
            )}
          </div>

          {/* Interactive Thumbnails Strip */}
          {photos.length > 1 && (
            <div className="car-thumbs-strip">
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
                      if (!target.src.includes(primaryFallback)) {
                        target.src = primaryFallback;
                      }
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: 3 Metric & Telematics Cards */}
        <div className="car-metrics-stack">
          {/* Card 1: Rental Pricing */}
          <div className="car-metric-card">
            <div className="car-metric-icon-wrap" style={{ backgroundColor: '#F3EEF6', color: '#6C1E84' }}>
              <CreditCard size={20} />
            </div>
            <div className="car-metric-body">
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
                    ? t('adminPages.carDetail.perKm')
                    : vehicle.pricingMethod === 'hourly'
                    ? t('adminPages.carDetail.hourly')
                    : vehicle.pricingMethod === 'monthly'
                    ? t('adminPages.carDetail.monthly')
                    : vehicle.pricingMethod === 'daily_extra_km'
                    ? t('adminPages.carDetail.dailyExtra')
                    : t('adminPages.carDetail.daily')}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#8A7090', fontWeight: 600 }}>
                  {vehicle.currency || APP_CURRENCY}
                </span>
              </div>
              <div className="car-metric-value">
                {vehicle.pricingMethod === 'per_km'
                  ? `${vehicle.currency || APP_CURRENCY} ${Number(vehicle.perKmRate || 0).toLocaleString()}`
                  : vehicle.pricingMethod === 'hourly'
                  ? `${vehicle.currency || APP_CURRENCY} ${Number(vehicle.hourlyRate || 0).toLocaleString()}`
                  : vehicle.pricingMethod === 'monthly'
                  ? `${vehicle.currency || APP_CURRENCY} ${Number(vehicle.monthlyRate || 0).toLocaleString()}`
                  : `${vehicle.currency || APP_CURRENCY} ${Number(vehicle.dailyRate || 0).toLocaleString()}`}
                <span className="car-metric-unit">
                  {vehicle.pricingMethod === 'per_km'
                    ? '/km'
                    : vehicle.pricingMethod === 'hourly'
                    ? '/hr'
                    : vehicle.pricingMethod === 'monthly'
                    ? '/mo'
                    : '/day'}
                </span>
              </div>
              <div className="car-metric-label">{t('adminPages.carDetail.activeRate')}</div>
              <div className="car-metric-sub">
                {vehicle.pricingMethod === 'per_km'
                  ? t('adminPages.carDetail._subPerKm', { min: `${vehicle.currency || APP_CURRENCY} ${Number(vehicle.minimumTripCharge || 0).toLocaleString()}`, deposit: `${vehicle.currency || APP_CURRENCY} ${Number(vehicle.securityDeposit || 0).toLocaleString()}` })
                  : vehicle.pricingMethod === 'hourly'
                  ? t('adminPages.carDetail._subHourly', { hours: vehicle.minimumBillableHours || 1, step: vehicle.billingIncrementMinutes || 60, grace: vehicle.gracePeriodMinutes || 0 })
                  : vehicle.pricingMethod === 'monthly'
                  ? t('adminPages.carDetail._subMonthly', { deposit: `${vehicle.currency || APP_CURRENCY} ${Number(vehicle.securityDeposit || 0).toLocaleString()}`, policy: vehicle.partialMonthPolicy === 'prorated_daily' ? t('adminPages.carDetail.prorated') : t('adminPages.carDetail.fullMonth') })
                  : vehicle.pricingMethod === 'daily_extra_km'
                  ? t('adminPages.carDetail._subExtra', { km: vehicle.mileageLimitPerDay || 200, extra: `${vehicle.currency || APP_CURRENCY} ${Number(vehicle.extraMileageCharge || 0)}` })
                  : t('adminPages.carDetail._subDaily', { deposit: `${vehicle.currency || APP_CURRENCY} ${Number(vehicle.securityDeposit || 0).toLocaleString()}`, included: vehicle.mileageLimitPerDay ? t('adminPages.carDetail._kmPerDay', { km: vehicle.mileageLimitPerDay }) : t('adminPages.carDetail.unlimited') })}
              </div>
            </div>
          </div>

          {/* Card 2: Current Mileage & Health */}
          <div className="car-metric-card">
            <div className="car-metric-icon-wrap" style={{ backgroundColor: '#DEF7EC', color: '#0E9F6E' }}>
              <Gauge size={20} />
            </div>
            <div className="car-metric-body">
              <div className="car-metric-value">
                {vehicle.mileage.toLocaleString()}
                <span className="car-metric-unit">km</span>
              </div>
              <div className="car-metric-label">{t('adminPages.carDetail.odometer')}</div>
              <div className="car-metric-sub">
                {t('adminPages.carDetail.nextService')}{' '}
                {vehicle.nextServiceMileage
                  ? `${vehicle.nextServiceMileage.toLocaleString()} km`
                  : '20,000 km'}
              </div>
            </div>
          </div>

          {/* Card 3: Assigned Branch & Parking Bay */}
          <div className="car-metric-card">
            <div className="car-metric-icon-wrap" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
              <MapPin size={20} />
            </div>
            <div className="car-metric-body">
              <div className="car-metric-value" style={{ fontSize: '1.25rem' }}>
                {vehicle.branch?.name || t('adminPages.carDetail.centralHub')}
              </div>
              <div className="car-metric-label">{t('adminPages.carDetail.location')}</div>
              <div className="car-metric-sub">
                {t('adminPages.carDetail._bayCode', { bay: vehicle.parkingSpot || 'A-12', code: vehicle.vehicleCode || 'FLEET-01' })}
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
            <span>{t('adminPages.carDetail.tabOverview')}</span>
          </button>

          <button
            type="button"
            className={`car-tab-btn ${activeTab === 'specifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('specifications')}
          >
            <Cpu size={16} />
            <span>{t('adminPages.carDetail.tabSpecs')}</span>
          </button>

          <button
            type="button"
            className={`car-tab-btn ${activeTab === 'pricing' ? 'active' : ''}`}
            onClick={() => setActiveTab('pricing')}
          >
            <Banknote size={16} />
            <span>{t('adminPages.carDetail.tabPricing')}</span>
            <span className="car-tab-badge">{pricingTiers.length}</span>
          </button>

          <button
            type="button"
            className={`car-tab-btn ${activeTab === 'documents' ? 'active' : ''}`}
            onClick={() => setActiveTab('documents')}
          >
            <Shield size={16} />
            <span>{t('adminPages.carDetail.tabDocuments')}</span>
            <span className="car-tab-badge">{documents.length}</span>
          </button>

          <button
            type="button"
            className={`car-tab-btn ${activeTab === 'maintenance' ? 'active' : ''}`}
            onClick={() => setActiveTab('maintenance')}
          >
            <Wrench size={16} />
            <span>{t('adminPages.carDetail.tabMaintenance')}</span>
            <span className="car-tab-badge">{maintenanceRecords.length}</span>
          </button>

          <button
            type="button"
            className={`car-tab-btn ${activeTab === 'damages' ? 'active' : ''}`}
            onClick={() => setActiveTab('damages')}
          >
            <AlertTriangle size={16} />
            <span>{t('adminPages.carDetail.tabDamage')}</span>
            <span className="car-tab-badge">{damageReports.length}</span>
          </button>

          <button
            type="button"
            className={`car-tab-btn ${activeTab === 'odometer' ? 'active' : ''}`}
            onClick={() => setActiveTab('odometer')}
          >
            <Gauge size={16} />
            <span>{t('adminPages.carDetail.tabOdometer')}</span>
            <span className="car-tab-badge">{odometerLogs.length}</span>
          </button>

          <button
            type="button"
            className={`car-tab-btn ${activeTab === 'locations' ? 'active' : ''}`}
            onClick={() => setActiveTab('locations')}
          >
            <MapPin size={16} />
            <span>{t('adminPages.carDetail.tabLocations')}</span>
            <span className="car-tab-badge">{locationLogs.length}</span>
          </button>

          <button
            type="button"
            className={`car-tab-btn ${activeTab === 'availability' ? 'active' : ''}`}
            onClick={() => setActiveTab('availability')}
          >
            <CalendarCheck size={16} />
            <span>{t('adminPages.carDetail.tabBookings')}</span>
            <span className="car-tab-badge">{bookings.length}</span>
          </button>

          <button
            type="button"
            className={`car-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            <Activity size={16} />
            <span>{t('adminPages.carDetail.tabAudit')}</span>
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
                <h2 className="car-section-title">{t('adminPages.carDetail.specsTitle')}</h2>
              </div>
            </div>

            <div className="car-spec-grid">
              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Car size={18} color="#8A7090" />
                  <span>{t('adminPages.carDetail.category')}</span>
                </div>
                <div className="car-spec-val">{vehicle.category?.name || t('adminPages.fleet._body_Sedan')}</div>
              </div>

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Settings size={18} color="#8A7090" />
                  <span>{t('adminPages.carDetail.transmission')}</span>
                </div>
                <div className="car-spec-val">
                  {vehicle.transmission.charAt(0) + vehicle.transmission.slice(1).toLowerCase()}
                </div>
              </div>

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Fuel size={18} color="#8A7090" />
                  <span>{t('adminPages.carDetail.fuelType')}</span>
                </div>
                <div className="car-spec-val">
                  {vehicle.fuelType.charAt(0) + vehicle.fuelType.slice(1).toLowerCase()}
                </div>
              </div>

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Users size={18} color="#8A7090" />
                  <span>{t('adminPages.carDetail.seats')}</span>
                </div>
                <div className="car-spec-val">{vehicle.seats}</div>
              </div>

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <DoorOpen size={18} color="#8A7090" />
                  <span>{t('adminPages.carDetail.doors')}</span>
                </div>
                <div className="car-spec-val">{vehicle.doors}</div>
              </div>

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Palette size={18} color="#8A7090" />
                  <span>{t('adminPages.carDetail.color')}</span>
                </div>
                <div className="car-spec-val">{vehicle.color || t('adminPages.addCar._color_White')}</div>
              </div>

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Gauge size={18} color="#8A7090" />
                  <span>{t('adminPages.carDetail.mileage')}</span>
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
                      {t('adminPages.carDetail._features', { count: featuresList.length })}
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
                  <h2 className="car-section-title">{t('adminPages.carDetail.complianceTitle')}</h2>
                  <div className="car-section-subtitle">
                    {t('adminPages.carDetail.complianceSubtitle')}
                  </div>
                </div>
              </div>
            </div>

            <div className="car-compliance-grid">
              <div className="car-compliance-card">
                <div className="car-compliance-title">{t('adminPages.carDetail.insurance')}</div>
                <div className="car-compliance-value">
                  {vehicle.insurancePolicyNumber || 'POL-FIN-2026-8819'}
                </div>
                <div className="car-compliance-sub">
                  {t('adminPages.carDetail.expires')}{' '}
                  {vehicle.insuranceExpiry
                    ? new Date(vehicle.insuranceExpiry).toLocaleDateString()
                    : t('adminPages.carDetail.active')}
                </div>
              </div>

              <div className="car-compliance-card">
                <div className="car-compliance-title">{t('adminPages.carDetail.registration')}</div>
                <div className="car-compliance-value">{vehicle.registrationNumber}</div>
                <div className="car-compliance-sub">
                  {t('adminPages.carDetail.renewalDue')}{' '}
                  {vehicle.registrationExpiry
                    ? new Date(vehicle.registrationExpiry).toLocaleDateString()
                    : t('adminPages.carDetail.currentYear')}
                </div>
              </div>

              <div className="car-compliance-card">
                <div className="car-compliance-title">{t('adminPages.carDetail.lastService')}</div>
                <div className="car-compliance-value">
                  {vehicle.lastServiceMileage
                    ? `${vehicle.lastServiceMileage.toLocaleString()} km`
                    : '10,000 km'}
                </div>
                <div className="car-compliance-sub">
                  {t('adminPages.carDetail.date')}{' '}
                  {vehicle.lastServiceDate
                    ? new Date(vehicle.lastServiceDate).toLocaleDateString()
                    : t('adminPages.carDetail.recent')}
                </div>
              </div>

              <div className="car-compliance-card">
                <div className="car-compliance-title">{t('adminPages.carDetail.nextServiceScheduled')}</div>
                <div className="car-compliance-value" style={{ color: '#059669' }}>
                  {vehicle.nextServiceMileage
                    ? `${vehicle.nextServiceMileage.toLocaleString()} km`
                    : '20,000 km'}
                </div>
                <div className="car-compliance-sub">
                  {t('adminPages.carDetail.remaining')}
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
                  <h2 className="car-section-title">{t('adminPages.carDetail._gallery', { count: photos.length })}</h2>
                  <div className="car-section-subtitle">
                    {t('adminPages.carDetail.galleryHint')}
                  </div>
                </div>
              </div>
              <span className="car-badge-verified">{t('adminPages.carDetail.multiAngle')}</span>
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
                        if (!target.src.includes(primaryFallback)) {
                          target.src = primaryFallback;
                        }
                      }}
                    />
                  </div>
                  <div className="car-gallery-footer">
                    <span className="car-gallery-caption">
                      {vehicle.photos?.[idx]?.caption || `Photo #${idx + 1}`}
                    </span>
                    {vehicle.photos?.[idx]?.isPrimary && (
                      <span className="car-gallery-primary-tag">{t('adminPages.carDetail.primary')}</span>
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
                <h2 className="car-section-title">{t('adminPages.carDetail.fleetNotes')}</h2>
              </div>
            </div>
            <div className="car-notes-body">
              {parsedNotes.notesText ||
                t('adminPages.carDetail.defaultNotes')}
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
                <h2 className="car-section-title">{t('adminPages.carDetail.powertrain')}</h2>
              </div>
            </div>

            <div className="car-spec-grid">
              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Cpu size={18} color="#8A7090" />
                  <span>{t('adminPages.carDetail.engine')}</span>
                </div>
                <div className="car-spec-val">{vehicle.engineSize || '2.0L Turbocharged'}</div>
              </div>

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Activity size={18} color="#8A7090" />
                  <span>{t('adminPages.carDetail.horsepower')}</span>
                </div>
                <div className="car-spec-val">{vehicle.horsePower ? `${vehicle.horsePower} HP` : '190 HP'}</div>
              </div>

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Settings size={18} color="#8A7090" />
                  <span>{t('adminPages.carDetail.drivetrain')}</span>
                </div>
                <div className="car-spec-val">{vehicle.drivetrain || 'AWD (All-Wheel Drive)'}</div>
              </div>

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Sliders size={18} color="#8A7090" />
                  <span>{t('adminPages.carDetail.transmission')}</span>
                </div>
                <div className="car-spec-val">{vehicle.transmission}</div>
              </div>

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Fuel size={18} color="#8A7090" />
                  <span>{t('adminPages.carDetail.fuelTypeCap')}</span>
                </div>
                <div className="car-spec-val">{vehicle.fuelType}</div>
              </div>

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Gauge size={18} color="#8A7090" />
                  <span>{t('adminPages.carDetail.fuelLevel')}</span>
                </div>
                <div className="car-spec-val">{vehicle.fuelLevelPercent ?? 100}%</div>
              </div>

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Fuel size={18} color="#8A7090" />
                  <span>{t('adminPages.carDetail.tank')}</span>
                </div>
                <div className="car-spec-val">{vehicle.fuelTankCapacity || '60 Liters'}</div>
              </div>

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Car size={18} color="#8A7090" />
                  <span>{t('adminPages.carDetail.trim')}</span>
                </div>
                <div className="car-spec-val">{vehicle.trim || t('adminPages.carDetail.standardEquipment')}</div>
              </div>

              {extraSpecs?.acceleration0to100 && (
                <div className="car-spec-row">
                  <div className="car-spec-label">
                    <Zap size={18} color="#8A7090" />
                    <span>{t('adminPages.carDetail.acceleration')}</span>
                  </div>
                  <div className="car-spec-val">{extraSpecs.acceleration0to100}s</div>
                </div>
              )}

              {extraSpecs?.topSpeed && (
                <div className="car-spec-row">
                  <div className="car-spec-label">
                    <Gauge size={18} color="#8A7090" />
                    <span>{t('adminPages.carDetail.topSpeed')}</span>
                  </div>
                  <div className="car-spec-val">{extraSpecs.topSpeed} km/h</div>
                </div>
              )}

              {extraSpecs?.torqueNm && (
                <div className="car-spec-row">
                  <div className="car-spec-label">
                    <Sliders size={18} color="#8A7090" />
                    <span>{t('adminPages.carDetail.torque')}</span>
                  </div>
                  <div className="car-spec-val">{extraSpecs.torqueNm} Nm</div>
                </div>
              )}

              {extraSpecs?.fuelEconomy && (
                <div className="car-spec-row">
                  <div className="car-spec-label">
                    <Fuel size={18} color="#8A7090" />
                    <span>{t('adminPages.carDetail.economy')}</span>
                  </div>
                  <div className="car-spec-val">{extraSpecs.fuelEconomy} L/100km</div>
                </div>
              )}
            </div>
          </div>

          {/* Capacities & Organization */}
          <div className="car-card-section">
            <div className="car-section-header">
              <div className="car-section-title-wrap">
                <div className="car-section-icon">
                  <Sliders size={20} />
                </div>
                <h2 className="car-section-title">{t('adminPages.carDetail.body')}</h2>
              </div>
            </div>

            <div className="car-spec-grid">
              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Users size={18} color="#8A7090" />
                  <span>{t('adminPages.carDetail.seating')}</span>
                </div>
                <div className="car-spec-val">{t('adminPages.carDetail._passengers', { count: vehicle.seats })}</div>
              </div>

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <DoorOpen size={18} color="#8A7090" />
                  <span>{t('adminPages.carDetail.doorCount')}</span>
                </div>
                <div className="car-spec-val">{t('adminPages.carDetail._doors', { count: vehicle.doors })}</div>
              </div>

              {extraSpecs?.luggageCapacityBags !== undefined && (
                <div className="car-spec-row">
                  <div className="car-spec-label">
                    <Briefcase size={18} color="#8A7090" />
                    <span>{t('adminPages.carDetail.luggage')}</span>
                  </div>
                  <div className="car-spec-val">
                    {t('adminPages.carDetail._largeBags', { count: Number(extraSpecs.luggageCapacityBags) || 0 })} {extraSpecs.cabinBagsCapacity ? t('adminPages.carDetail._cabinBags', { count: Number(extraSpecs.cabinBagsCapacity) }) : ''}
                  </div>
                </div>
              )}

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Palette size={18} color="#8A7090" />
                  <span>{t('adminPages.carDetail.exteriorColor')}</span>
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
                  {vehicle.color || t('adminPages.addCar._color_White')}
                </div>
              </div>

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Shield size={18} color="#8A7090" />
                  <span>{t('adminPages.carDetail.vin')}</span>
                </div>
                <div className="car-spec-val" style={{ fontFamily: 'monospace' }}>
                  {vehicle.vin || 'VIN-NOT-SET'}
                </div>
              </div>

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Car size={18} color="#8A7090" />
                  <span>{t('adminPages.carDetail.ownership')}</span>
                </div>
                <div className="car-spec-val">{vehicle.ownershipType || 'OWNED'}</div>
              </div>

              <div className="car-spec-row">
                <div className="car-spec-label">
                  <Cpu size={18} color="#8A7090" />
                  <span>{t('adminPages.carDetail.telematics')}</span>
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
              <h3 className="car-submodule-title">{t('adminPages.carDetail.ratesTitle')}</h3>
              <p className="car-submodule-sub">
                {t('adminPages.carDetail.ratesSubtitle')}
              </p>
            </div>
            <button
              type="button"
              className="car-btn-primary"
              onClick={() => setIsAddPricingOpen(true)}
            >
              <Plus size={16} />
              <span>{t('adminPages.carDetail.addTier')}</span>
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
                  {t('adminPages.carDetail.contractedMethod')}{' '}
                  {vehicle.pricingMethod === 'per_km'
                    ? t('adminPages.carDetail.methodB')
                    : vehicle.pricingMethod === 'hourly'
                    ? t('adminPages.carDetail.methodD')
                    : vehicle.pricingMethod === 'monthly'
                    ? t('adminPages.carDetail.methodE')
                    : vehicle.pricingMethod === 'daily_extra_km'
                    ? t('adminPages.carDetail.methodC')
                    : t('adminPages.carDetail.methodA')}
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
                  {t('adminPages.carDetail.enforced')}
                </span>
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: '#66566A', lineHeight: 1.5 }}>
                {t('adminPages.carDetail.methodExplainer')}
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
            <div className="car-metric-card">
              <div className="car-metric-body">
                <div className="car-metric-value">
                  {vehicle.currency || APP_CURRENCY}{' '}
                  {vehicle.pricingMethod === 'per_km'
                    ? Number(vehicle.perKmRate || 0).toLocaleString()
                    : vehicle.pricingMethod === 'hourly'
                    ? Number(vehicle.hourlyRate || 0).toLocaleString()
                    : vehicle.pricingMethod === 'monthly'
                    ? Number(vehicle.monthlyRate || 0).toLocaleString()
                    : Number(vehicle.dailyRate || 0).toLocaleString()}
                  <span className="car-metric-unit">
                    {vehicle.pricingMethod === 'per_km'
                      ? '/km'
                      : vehicle.pricingMethod === 'hourly'
                      ? '/hr'
                      : vehicle.pricingMethod === 'monthly'
                      ? '/mo'
                      : '/day'}
                  </span>
                </div>
                <div className="car-metric-label">
                  {vehicle.pricingMethod === 'per_km'
                    ? t('adminPages.carDetail.rateKm')
                    : vehicle.pricingMethod === 'hourly'
                    ? t('adminPages.carDetail.rateHourly')
                    : vehicle.pricingMethod === 'monthly'
                    ? t('adminPages.carDetail.rateMonthly')
                    : t('adminPages.carDetail.rateDaily')}
                </div>
              </div>
            </div>

            {/* Condition/Threshold Card */}
            <div className="car-metric-card">
              <div className="car-metric-body">
                <div className="car-metric-value" style={{ fontSize: '1.25rem' }}>
                  {vehicle.pricingMethod === 'per_km'
                    ? `${vehicle.currency || APP_CURRENCY} ${Number(vehicle.minimumTripCharge || 0).toLocaleString()}`
                    : vehicle.pricingMethod === 'hourly'
                    ? t('adminPages.carDetail._hoursMin', { hours: vehicle.minimumBillableHours || 1 })
                    : vehicle.pricingMethod === 'monthly'
                    ? (vehicle.partialMonthPolicy === 'prorated_daily' ? t('adminPages.carDetail.prorated') : t('adminPages.carDetail.fullMonth'))
                    : vehicle.pricingMethod === 'daily_extra_km'
                    ? t('adminPages.carDetail._kmPerDay', { km: vehicle.mileageLimitPerDay || 200 })
                    : vehicle.mileageLimitPerDay ? t('adminPages.carDetail._kmPerDay', { km: vehicle.mileageLimitPerDay }) : t('adminPages.carDetail.unlimited')}
                </div>
                <div className="car-metric-label">
                  {vehicle.pricingMethod === 'per_km'
                    ? t('adminPages.carDetail.minTrip')
                    : vehicle.pricingMethod === 'hourly'
                    ? t('adminPages.carDetail._increment', { minutes: vehicle.billingIncrementMinutes || 60 })
                    : vehicle.pricingMethod === 'monthly'
                    ? t('adminPages.carDetail.partialPolicy')
                    : vehicle.pricingMethod === 'daily_extra_km'
                    ? t('adminPages.carDetail._extraKm', { amount: `${vehicle.currency || APP_CURRENCY} ${Number(vehicle.extraMileageCharge || 0)}` })
                    : t('adminPages.carDetail.dailyAllowance')}
                </div>
              </div>
            </div>

            {/* Security Deposit Card */}
            <div className="car-metric-card">
              <div className="car-metric-body">
                <div className="car-metric-value">
                  {vehicle.currency || APP_CURRENCY} {Number(vehicle.securityDeposit || 0).toLocaleString()}
                </div>
                <div className="car-metric-label">{t('adminPages.carDetail.deposit')}</div>
              </div>
            </div>

            {/* Grace Period & Timing Card */}
            <div className="car-metric-card">
              <div className="car-metric-body">
                <div className="car-metric-value" style={{ fontSize: '1.25rem' }}>
                  {vehicle.gracePeriodMinutes || 0} {t('adminPages.carDetail.min')}
                </div>
                <div className="car-metric-label">{t('adminPages.carDetail.grace')}</div>
              </div>
            </div>
          </div>

          {/* Pricing Tiers Table */}
          <div className="car-table-responsive">
            <table className="car-data-table">
              <thead>
                <tr>
                  <th>{t('adminPages.carDetail.tierName')}</th>
                  <th>{t('adminPages.carDetail.method')}</th>
                  <th>{t('adminPages.carDetail.baseRate')}</th>
                  <th>{t('adminPages.carDetail.depositShort')}</th>
                  <th>{t('adminPages.carDetail.includedKm')}</th>
                  <th>{t('adminPages.carDetail.extraKmRate')}</th>
                  <th>{t('adminPages.carDetail.validPeriod')}</th>
                  <th>{t('adminPages.carDetail.status')}</th>
                  <th style={{ textAlign: 'right' }}>{t('adminPages.carDetail.actions')}</th>
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
                      {tier.currency || APP_CURRENCY} {Number(tier.baseRate).toLocaleString()}
                    </td>
                    <td>{tier.currency || APP_CURRENCY} {Number(tier.securityDeposit || 0).toLocaleString()}</td>
                    <td>{tier.includedKmPerDay ? `${tier.includedKmPerDay} km` : t('adminPages.carDetail.unlimited')}</td>
                    <td>
                      {tier.extraKmRate ? `${tier.currency || APP_CURRENCY} ${Number(tier.extraKmRate).toLocaleString()}/km` : '—'}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#66566A' }}>
                      {tier.validFrom ? new Date(tier.validFrom).toLocaleDateString() : t('adminPages.carDetail.always')} →{' '}
                      {tier.validUntil ? new Date(tier.validUntil).toLocaleDateString() : t('adminPages.carDetail.indefinite')}
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
                        {tier.isActive ? t('adminPages.carDetail.active') : t('adminPages.carDetail.inactive')}
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
                          <Banknote size={24} />
                        </div>
                        <div style={{ fontWeight: 700, color: '#1A0322' }}>
                          {t('adminPages.carDetail.standardRateActive')}
                        </div>
                        <div style={{ fontSize: '0.85rem' }}>
                          {t('adminPages.carDetail._standardRate', {
                            method: vehicle.pricingMethod,
                            amount: `${vehicle.currency || APP_CURRENCY} ${Number(
                              vehicle.pricingMethod === 'per_km'
                                ? vehicle.perKmRate || 0
                                : vehicle.pricingMethod === 'hourly'
                                ? vehicle.hourlyRate || 0
                                : vehicle.pricingMethod === 'monthly'
                                ? vehicle.monthlyRate || 0
                                : vehicle.dailyRate || 0
                            ).toLocaleString()}`,
                          })}
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
              <h3 className="car-submodule-title">{t('adminPages.carDetail.docsTitle')}</h3>
              <p className="car-submodule-sub">
                {t('adminPages.carDetail.docsSubtitle')}
              </p>
            </div>
            <button
              type="button"
              className="car-btn-primary"
              onClick={() => setIsAddDocOpen(true)}
            >
              <Plus size={16} />
              <span>{t('adminPages.carDetail.addDoc')}</span>
            </button>
          </div>

          {maintActionError && (
            <div role="alert" style={{ color: '#B91C1C', fontWeight: 600, marginBottom: '10px' }}>{maintActionError}</div>
          )}
          <div className="car-table-responsive">
            <table className="car-data-table">
              <thead>
                <tr>
                  <th>{t('adminPages.carDetail.type')}</th>
                  <th>{t('adminPages.carDetail.titleNumber')}</th>
                  <th>{t('adminPages.carDetail.issued')}</th>
                  <th>{t('adminPages.carDetail.expiry')}</th>
                  <th>{t('adminPages.carDetail.status')}</th>
                  <th>{t('adminPages.carDetail.verification')}</th>
                  <th>{t('adminPages.carDetail.file')}</th>
                  <th style={{ textAlign: 'right' }}>{t('adminPages.carDetail.actions')}</th>
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
                      {doc.issuedAt ? new Date(doc.issuedAt).toLocaleDateString() : t('adminPages.carDetail.notRecorded')}
                    </td>
                    <td>
                      <div>
                        {doc.expiresAt ? new Date(doc.expiresAt).toLocaleDateString() : t('adminPages.carDetail.noExpiry')}
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
                          <span>{t('adminPages.carDetail.view')}</span>
                        </a>
                      ) : (
                        <span style={{ color: '#A092A5' }}>{t('adminPages.carDetail.noFile')}</span>
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
                          {t('adminPages.carDetail.noDocs')}
                        </div>
                        <div style={{ fontSize: '0.85rem' }}>
                          {t('adminPages.carDetail.noDocsHint')}
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
              <h3 className="car-submodule-title">{t('adminPages.carDetail.maintTitle')}</h3>
              <p className="car-submodule-sub">
                {t('adminPages.carDetail.maintSubtitle')}
              </p>
            </div>
            <button
              type="button"
              className="car-btn-primary"
              onClick={() => setIsAddMaintOpen(true)}
            >
              <Plus size={16} />
              <span>{t('adminPages.carDetail.logMaint')}</span>
            </button>
          </div>

          <div className="car-table-responsive">
            <table className="car-data-table">
              <thead>
                <tr>
                  <th>{t('adminPages.carDetail.type')}</th>
                  <th>{t('adminPages.carDetail.description')}</th>
                  <th>{t('adminPages.carDetail.provider')}</th>
                  <th>{t('adminPages.carDetail.scheduledDate')}</th>
                  <th>{t('adminPages.carDetail.completedDate')}</th>
                  <th>{t('adminPages.carDetail.mileage')}</th>
                  <th>{t('adminPages.carDetail.cost')}</th>
                  <th>{t('adminPages.carDetail.status')}</th>
                  <th aria-label={t('adminPages.carDetail.actionsCol')} />
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
                    <td style={{ fontWeight: 600, color: '#1A0322' }}>
                      {m.title || m.description}
                      {m.title && m.description && m.description !== m.title && (
                        <div style={{ fontWeight: 400, fontSize: '0.8rem', color: '#685D73' }}>{m.description}</div>
                      )}
                    </td>
                    <td>{m.serviceProvider || t('adminPages.carDetail.authorizedCenter')}</td>
                    <td>{formatDay(m.scheduledDate ?? m.scheduledAt)}</td>
                    <td>
                      {m.completedDate || m.completedAt
                        ? formatDay(m.completedDate ?? m.completedAt)
                        : m.status === 'CANCELLED'
                          ? '—'
                          : t('adminPages.carDetail.inProgress')}
                    </td>
                    <td>{(m.odometerReading ?? m.odometerValue) ? `${Number(m.odometerReading ?? m.odometerValue).toLocaleString()} km` : '—'}</td>
                    <td style={{ fontWeight: 700, color: '#1A0322' }}>
                      {(m.cost ?? m.costAmount) !== null && (m.cost ?? m.costAmount) !== undefined
                        ? `${m.currency || APP_CURRENCY} ${Number(m.cost ?? m.costAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                        : '—'}
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
                        {t(`adminPages.carDetail.maintStatus.${m.status}`, { defaultValue: m.status })}
                      </span>
                    </td>
                    <td>
                      {(m.status === 'SCHEDULED' || m.status === 'IN_PROGRESS') && (
                        <button
                          type="button"
                          className="car-btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                          disabled={completingMaintId === m.id}
                          onClick={() => void completeMaintenance(m.id)}
                        >
                          <CheckCircle2 size={14} />
                          <span>{t('adminPages.carDetail.markDone')}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {maintenanceRecords.length === 0 && (
                  <tr>
                    <td colSpan={9}>
                      <div className="car-empty-box">
                        <div className="car-empty-icon">
                          <Wrench size={24} />
                        </div>
                        <div style={{ fontWeight: 700, color: '#1A0322' }}>
                          {t('adminPages.carDetail.noMaint')}
                        </div>
                        <div style={{ fontSize: '0.85rem' }}>
                          {t('adminPages.carDetail.noMaintHint')}
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
              <h3 className="car-submodule-title">{t('adminPages.carDetail.damageTitle')}</h3>
              <p className="car-submodule-sub">
                {t('adminPages.carDetail.damageSubtitle')}
              </p>
            </div>
            <button
              type="button"
              className="car-btn-primary"
              onClick={() => setIsAddDamageOpen(true)}
            >
              <Plus size={16} />
              <span>{t('adminPages.carDetail.reportDamage')}</span>
            </button>
          </div>

          <div className="car-table-responsive">
            <table className="car-data-table">
              <thead>
                <tr>
                  <th>{t('adminPages.carDetail.severity')}</th>
                  <th>{t('adminPages.carDetail.damageType')}</th>
                  <th>{t('adminPages.carDetail.description')}</th>
                  <th>{t('adminPages.carDetail.estimatedCost')}</th>
                  <th>{t('adminPages.carDetail.reportedDate')}</th>
                  <th>{t('adminPages.carDetail.resolution')}</th>
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
                            d.status === 'RESOLVED'
                              ? '#DEF7EC'
                              : (d.status === 'ASSESSED' || d.status === 'REPAIR_SCHEDULED')
                              ? '#FEF3C7'
                              : '#F3F4F6',
                          color:
                            d.status === 'RESOLVED'
                              ? '#03543F'
                              : (d.status === 'ASSESSED' || d.status === 'REPAIR_SCHEDULED')
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
                          {t('adminPages.carDetail.noDamage')}
                        </div>
                        <div style={{ fontSize: '0.85rem' }}>
                          {t('adminPages.carDetail.noDamageHint')}
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
              <h3 className="car-submodule-title">{t('adminPages.carDetail.odoTitle')}</h3>
              <p className="car-submodule-sub">
                {t('adminPages.carDetail.odoSubtitle')}
              </p>
            </div>
            <button
              type="button"
              className="car-btn-primary"
              onClick={() => setIsAddOdoOpen(true)}
            >
              <Plus size={16} />
              <span>{t('adminPages.carDetail.recordMileage')}</span>
            </button>
          </div>

          <div className="car-table-responsive">
            <table className="car-data-table">
              <thead>
                <tr>
                  <th>{t('adminPages.carDetail.timestamp')}</th>
                  <th>{t('adminPages.carDetail.reading')}</th>
                  <th>{t('adminPages.carDetail.source')}</th>
                  <th>{t('adminPages.carDetail.recordedBy')}</th>
                  <th>{t('adminPages.carDetail.notes')}</th>
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
                    <td>{log.recordedBy || t('adminPages.carDetail.systemAuto')}</td>
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
                          {t('adminPages.carDetail.noOdo')}
                        </div>
                        <div style={{ fontSize: '0.85rem' }}>
                          {t('adminPages.carDetail._odoCurrent', { km: vehicle.mileage.toLocaleString() })}
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
              <h3 className="car-submodule-title">{t('adminPages.carDetail.locTitle')}</h3>
              <p className="car-submodule-sub">
                {t('adminPages.carDetail.locSubtitle')}
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
                  {vehicle.branch?.name || t('adminPages.carDetail.centralRentalHub')}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#66566A' }}>
                  {t('adminPages.carDetail._currentBay', { bay: vehicle.parkingSpot || 'Bay A-12' })}
                  {t('adminPages.carDetail._branchCode', { code: vehicle.branch?.code || 'MAIN-01' })}
                </div>
              </div>
            </div>
          </div>

          <div className="car-table-responsive">
            <table className="car-data-table">
              <thead>
                <tr>
                  <th>{t('adminPages.carDetail.timestamp')}</th>
                  <th>{t('adminPages.carDetail.branch')}</th>
                  <th>{t('adminPages.carDetail.parkingBay')}</th>
                  <th>{t('adminPages.carDetail.source')}</th>
                  <th>{t('adminPages.carDetail.coordinates')}</th>
                  <th>{t('adminPages.carDetail.notes')}</th>
                </tr>
              </thead>
              <tbody>
                {locationLogs.map((loc) => (
                  <tr key={loc.id}>
                    <td>{new Date(loc.recordedAt).toLocaleString()}</td>
                    <td style={{ fontWeight: 700, color: '#1A0322' }}>
                      {loc.branch?.name || t('adminPages.carDetail.designatedBay')}
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
                        : t('adminPages.carDetail.hubFixed')}
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
                          {t('adminPages.carDetail.noLoc')}
                        </div>
                        <div style={{ fontSize: '0.85rem' }}>
                          {t('adminPages.carDetail._homeBranch', { branch: vehicle.branch?.name || t('adminPages.carDetail.centralHub') })}
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
                  {t('adminPages.carDetail.availTitle')}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.825rem', color: '#66566A' }}>
                  {t('adminPages.carDetail.availSubtitle')}
                </p>
              </div>
            </div>

            <form onSubmit={handleCheckAvailability} className="car-avail-form">
              <div className="car-field-group">
                <label className="car-field-label">{t('adminPages.carDetail.pickupDate')}</label>
                <input
                  type="datetime-local"
                  required
                  value={availStartDate}
                  onChange={(e) => setAvailStartDate(e.target.value)}
                  className="car-field-input"
                />
              </div>

              <div className="car-field-group">
                <label className="car-field-label">{t('adminPages.carDetail.returnDate')}</label>
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
                {isCheckingAvail ? t('adminPages.carDetail.verifying') : t('adminPages.carDetail.verify')}
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
                    {availResult.isAvailable ? t('adminPages.carDetail.availableForBooking') : t('adminPages.carDetail.conflict')}
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '0.85rem' }}>{availResult.reason}</div>
                  {availResult.conflictingBooking && (
                    <div style={{ marginTop: '6px', fontSize: '0.8rem', opacity: 0.9 }}>
                      {t('adminPages.carDetail._conflicting', { number: availResult.conflictingBooking.bookingNumber, status: availResult.conflictingBooking.status })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Booking History Table */}
          <div className="car-submodule-actions">
            <div>
              <h3 className="car-submodule-title">{t('adminPages.carDetail._bookingHistory', { count: bookings.length })}</h3>
              <p className="car-submodule-sub">
                {t('adminPages.carDetail.bookingHistoryHint')}
              </p>
            </div>
          </div>

          <div className="car-table-responsive">
            <table className="car-data-table">
              <thead>
                <tr>
                  <th>{t('adminPages.carDetail.bookingNumber')}</th>
                  <th>{t('adminPages.carDetail.customer')}</th>
                  <th>{t('adminPages.carDetail.pickupDateShort')}</th>
                  <th>{t('adminPages.carDetail.returnDateShort')}</th>
                  <th>{t('adminPages.carDetail.duration')}</th>
                  <th>{t('adminPages.carDetail.total')}</th>
                  <th>{t('adminPages.carDetail.status')}</th>
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
                        {b.customer?.fullName || t('adminPages.carDetail.guest')}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#8A7090' }}>
                        {b.customer?.email || '—'}
                      </div>
                    </td>
                    <td>{new Date(b.pickupDateTime).toLocaleString()}</td>
                    <td>{new Date(b.returnDateTime).toLocaleString()}</td>
                    <td>{t('adminPages.carDetail._days', { count: b.totalDays })}</td>
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
                          {t('adminPages.carDetail.noBookings')}
                        </div>
                        <div style={{ fontSize: '0.85rem' }}>
                          {t('adminPages.carDetail.noBookingsHint')}
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
              <h3 className="car-submodule-title">{t('adminPages.carDetail.auditTitle')}</h3>
              <p className="car-submodule-sub">
                {t('adminPages.carDetail.auditSubtitle')}
              </p>
            </div>
          </div>

          <div className="car-table-responsive">
            <table className="car-data-table">
              <thead>
                <tr>
                  <th>{t('adminPages.carDetail.timestamp')}</th>
                  <th>{t('adminPages.carDetail.action')}</th>
                  <th>{t('adminPages.carDetail.details')}</th>
                  <th>{t('adminPages.carDetail.actor')}</th>
                  <th>{t('adminPages.carDetail.ip')}</th>
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
                    <td>{log.userEmail || log.userId || t('adminPages.carDetail.system')}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#8A7090' }}>
                      {log.ipAddress || '—'}
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
                          {t('adminPages.carDetail.noAudit')}
                        </div>
                        <div style={{ fontSize: '0.85rem' }}>
                          {t('adminPages.carDetail.noAuditHint')}
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
            void refreshVehicle();
          }}
        />
      )}

      {/* ================= MODAL: FINISH MAINTENANCE ================= */}
      {isFinishMaintOpen && (
        <FinishMaintenanceModal
          vehicleId={vehicle.id}
          currentMileage={vehicle.mileage}
          openJobs={openMaintenance.length}
          onClose={() => setIsFinishMaintOpen(false)}
          onSuccess={() => {
            setIsFinishMaintOpen(false);
            void refreshVehicle();
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
                {vehicle.status === 'ARCHIVED' ? t('adminPages.carDetail.restoreTitle') : t('adminPages.carDetail.archiveTitle')}
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
                    {t('adminPages.carDetail._restoreText', { name: `${vehicle.brand} ${vehicle.model}`, plate: vehicle.registrationNumber })}
                  </>
                ) : (
                  <>
                    {t('adminPages.carDetail._archiveText', { name: `${vehicle.brand} ${vehicle.model}` })}
                    <br />
                    <br />
                    <span style={{ fontSize: '0.85rem', color: '#66566A' }}>
                      {t('adminPages.carDetail.archiveNote')}
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
                {t('adminPages.carDetail.cancel')}
              </button>
              <button
                type="button"
                disabled={archiveActionLoading}
                onClick={handleArchiveToggle}
                className={vehicle.status === 'ARCHIVED' ? 'car-btn-primary' : 'car-btn-danger'}
              >
                {archiveActionLoading
                  ? t('adminPages.carDetail.processing')
                  : vehicle.status === 'ARCHIVED'
                  ? t('adminPages.carDetail.confirmRestore')
                  : t('adminPages.carDetail.confirmArchive')}
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
  const { t } = useTranslation();
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
      setError(err.message || t('adminPages.carDetail.errSaveDoc'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="car-modal-overlay" onClick={onClose}>
      <div className="car-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="car-modal-header">
          <h3 className="car-modal-title">{t('adminPages.carDetail.uploadDoc')}</h3>
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
              <label className="car-field-label">{t('adminPages.carDetail.docType')}</label>
              <CustomSelect
                value={documentType}
                onChange={(val) => setDocumentType(val)}
                options={[
                  { value: 'INSURANCE', label: t('adminPages.carDetail.docInsurance') },
                  { value: 'REGISTRATION', label: t('adminPages.carDetail.docRegistration') },
                  { value: 'ROAD_TAX', label: t('adminPages.carDetail.docRoadTax') },
                  { value: 'SAFETY_INSPECTION', label: t('adminPages.carDetail.docInspection') },
                  { value: 'COMMERCIAL_PERMIT', label: t('adminPages.carDetail.docPermit') },
                  { value: 'OTHER', label: t('adminPages.carDetail.docOther') },
                ]}
              />
            </div>

            <div className="car-field-group">
              <label className="car-field-label">{t('adminPages.carDetail.docTitle')}</label>
              <input
                type="text"
                required
                placeholder={t('adminPages.carDetail.docTitlePlaceholder')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="car-field-input"
              />
            </div>

            <div className="car-field-group">
              <label className="car-field-label">{t('adminPages.carDetail.docNumber')}</label>
              <input
                type="text"
                placeholder="e.g. POL-2026-991823"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                className="car-field-input"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: '12px' }}>
              <div className="car-field-group">
                <label className="car-field-label">{t('adminPages.carDetail.issued')}</label>
                <input
                  type="date"
                  value={issuedAt}
                  onChange={(e) => setIssuedAt(e.target.value)}
                  className="car-field-input"
                />
              </div>

              <div className="car-field-group">
                <label className="car-field-label">{t('adminPages.carDetail.expiry')}</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="car-field-input"
                />
              </div>
            </div>

            <div className="car-field-group">
              <label className="car-field-label">{t('adminPages.carDetail.docUrl')}</label>
              <input
                type="text"
                placeholder={t('adminPages.carDetail.docUrlPlaceholder')}
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                className="car-field-input"
              />
            </div>

            <div className="car-field-group">
              <label className="car-field-label">{t('adminPages.carDetail.docNotes')}</label>
              <textarea
                rows={2}
                placeholder={t('adminPages.carDetail.docNotesPlaceholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="car-field-input"
              />
            </div>
          </div>

          <div className="car-modal-footer">
            <button type="button" onClick={onClose} className="car-btn-secondary">
              {t('adminPages.carDetail.cancel')}
            </button>
            <button type="submit" disabled={isSubmitting} className="car-btn-primary">
              {isSubmitting ? t('adminPages.carDetail.saving') : t('adminPages.carDetail.registerDoc')}
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
  const { t } = useTranslation();
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
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await fleetApi.createMaintenance(vehicleId, {
        maintenanceType: maintenanceType as any,
        description,
        serviceProvider: serviceProvider || undefined,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        completedAt: completedAt ? new Date(completedAt).toISOString() : undefined,
        odometerValue: odometerValue ? Number(odometerValue) : undefined,
        costAmount: costAmount ? Number(costAmount) : undefined,
        status: status as any,
        notes: notes || undefined,
      });
      onSuccess();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('adminPages.carDetail.errMaintAction'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="car-modal-overlay" onClick={onClose}>
      <div className="car-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="car-modal-header">
          <h3 className="car-modal-title">{t('adminPages.carDetail.maintModalTitle')}</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="car-modal-body">
            <div className="car-field-group">
              <label className="car-field-label">{t('adminPages.carDetail.maintCategory')}</label>
              <CustomSelect
                value={maintenanceType}
                onChange={(val) => setMaintenanceType(val)}
                options={[
                  { value: 'SCHEDULED_SERVICE', label: t('adminPages.carDetail.mtScheduled') },
                  { value: 'OIL_CHANGE', label: t('adminPages.carDetail.mtOil') },
                  { value: 'TIRE_ROTATION_REPLACEMENT', label: t('adminPages.carDetail.mtTire') },
                  { value: 'BRAKE_SERVICE', label: t('adminPages.carDetail.mtBrake') },
                  { value: 'REPAIR', label: t('adminPages.carDetail.mtMechanical') },
                  { value: 'BODY_WORK', label: t('adminPages.carDetail.mtBody') },
                  { value: 'BATTERY_CHECK', label: t('adminPages.carDetail.mtElectrical') },
                  { value: 'OTHER', label: t('adminPages.carDetail.mtOther') },
                ]}
              />
            </div>

            <div className="car-field-group">
              <label className="car-field-label">{t('adminPages.carDetail.workDescription')}</label>
              <input
                type="text"
                required
                placeholder={t('adminPages.carDetail.workPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="car-field-input"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: '12px' }}>
              <div className="car-field-group">
                <label className="car-field-label">{t('adminPages.carDetail.provider')}</label>
                <input
                  type="text"
                  placeholder={t('adminPages.carDetail.providerPlaceholder')}
                  value={serviceProvider}
                  onChange={(e) => setServiceProvider(e.target.value)}
                  className="car-field-input"
                />
              </div>

              <div className="car-field-group">
                <label className="car-field-label">{t('adminPages.carDetail._costLabel', { currency: APP_CURRENCY })}</label>
                <input
                  type="number"
                  step="0.01"
                  value={costAmount}
                  onChange={(e) => setCostAmount(Number(e.target.value))}
                  className="car-field-input"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: '12px' }}>
              <div className="car-field-group">
                <label className="car-field-label">{t('adminPages.carDetail.scheduledDate')}</label>
                <input
                  type="date"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="car-field-input"
                />
              </div>

              <div className="car-field-group">
                <label className="car-field-label">{t('adminPages.carDetail.completedDate')}</label>
                <input
                  type="date"
                  value={completedAt}
                  onChange={(e) => setCompletedAt(e.target.value)}
                  className="car-field-input"
                />
              </div>
            </div>

            <div className="car-field-group">
              <label className="car-field-label">{t('adminPages.carDetail.currentStatus')}</label>
              <CustomSelect
                value={status}
                onChange={(val) => setStatus(val)}
                options={[
                  { value: 'SCHEDULED', label: t('adminPages.carDetail.stScheduled') },
                  { value: 'IN_PROGRESS', label: t('adminPages.carDetail.inProgress') },
                  { value: 'COMPLETED', label: t('adminPages.carDetail.stCompleted') },
                  { value: 'CANCELLED', label: t('adminPages.carDetail.stCancelled') },
                ]}
              />
            </div>

            <div className="car-field-group">
              <label className="car-field-label">{t('adminPages.carDetail.odometerAtService')}</label>
              <input
                type="number"
                value={odometerValue}
                onChange={(e) => setOdometerValue(Number(e.target.value))}
                className="car-field-input"
              />
            </div>

            <div className="car-field-group">
              <label className="car-field-label">{t('adminPages.carDetail.workNotes')}</label>
              <textarea
                rows={2}
                placeholder={t('adminPages.carDetail.workNotesPlaceholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="car-field-input"
              />
            </div>
            {submitError && <div role="alert" style={{ color: '#B91C1C', fontWeight: 600, fontSize: '0.875rem' }}>{submitError}</div>}
          </div>

          <div className="car-modal-footer">
            <button type="button" onClick={onClose} className="car-btn-secondary">
              {t('adminPages.carDetail.cancel')}
            </button>
            <button type="submit" disabled={isSubmitting} className="car-btn-primary">
              {isSubmitting ? t('adminPages.carDetail.saving') : t('adminPages.carDetail.saveMaint')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Date only, or a dash when there is none */
function formatDay(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

/** Finishes the maintenance and puts the car back on the market. */
function FinishMaintenanceModal({
  vehicleId,
  currentMileage,
  openJobs,
  onClose,
  onSuccess,
}: {
  vehicleId: string;
  currentMileage: number;
  openJobs: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState('');
  const [cost, setCost] = useState('');
  const [odometer, setOdometer] = useState(String(currentMileage || ''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await fleetApi.finishMaintenance(vehicleId, {
        notes: notes.trim() || undefined,
        cost: cost === '' ? null : Number(cost),
        odometerReading: odometer === '' ? null : Number(odometer),
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('adminPages.carDetail.errMaintAction'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="car-modal-overlay" onClick={onClose}>
      <div
        className="car-modal-box"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t('adminPages.carDetail.finishMaintTitle')}
      >
        <div className="car-modal-header">
          <h3 className="car-modal-title">{t('adminPages.carDetail.finishMaintTitle')}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('adminPages.carDetail.cancel')}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="car-modal-body">
            <p style={{ margin: 0, color: '#4A315A', fontSize: '0.9rem' }}>
              {t('adminPages.carDetail.finishMaintText', { count: openJobs })}
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))',
                gap: '12px',
              }}
            >
              <div className="car-field-group">
                <label className="car-field-label" htmlFor="finish-maint-odometer">
                  {t('adminPages.carDetail.odometerAtService')}
                </label>
                <input
                  id="finish-maint-odometer"
                  type="number"
                  min={currentMileage || 0}
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  className="car-field-input"
                />
              </div>
              <div className="car-field-group">
                <label className="car-field-label" htmlFor="finish-maint-cost">
                  {t('adminPages.carDetail._costLabel', {
                    currency: APP_CURRENCY,
                  })}
                </label>
                <input
                  id="finish-maint-cost"
                  type="number"
                  min={0}
                  step="0.01"
                  value={cost}
                  placeholder="0.00"
                  onChange={(e) => setCost(e.target.value)}
                  className="car-field-input"
                />
              </div>
            </div>
            <div className="car-field-group">
              <label className="car-field-label" htmlFor="finish-maint-notes">
                {t('adminPages.carDetail.workNotes')}
              </label>
              <textarea
                id="finish-maint-notes"
                rows={3}
                maxLength={2000}
                placeholder={t('adminPages.carDetail.finishMaintNotesPlaceholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="car-field-input"
              />
            </div>
            {error && (
              <div
                role="alert"
                style={{
                  color: '#B91C1C',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                {error}
              </div>
            )}
          </div>
          <div className="car-modal-footer">
            <button type="button" onClick={onClose} className="car-btn-secondary">
              {t('adminPages.carDetail.cancel')}
            </button>
            <button type="submit" disabled={isSubmitting} className="car-btn-primary">
              <CheckCircle2 size={16} />
              <span>
                {isSubmitting ? t('adminPages.carDetail.saving') : t('adminPages.carDetail.finishMaintConfirm')}
              </span>
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
  const { t } = useTranslation();
  const [damageType, setDamageType] = useState('SCRATCH');
  const [severity, setSeverity] = useState('LOW');
  const [description, setDescription] = useState('');
  const [estimatedRepairCost, setEstimatedRepairCost] = useState<number>(150);
  const [status, setStatus] = useState('REPORTED');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await fleetApi.createDamageReport(vehicleId, {
        damageType,
        severity: severity as any,
        description,
        estimatedRepairCost: estimatedRepairCost ? Number(estimatedRepairCost) : undefined,
        status: status as any,
        notes: notes || undefined,
      });
      onSuccess();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('adminPages.carDetail.errMaintAction'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="car-modal-overlay" onClick={onClose}>
      <div className="car-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="car-modal-header">
          <h3 className="car-modal-title">{t('adminPages.carDetail.damageModalTitle')}</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="car-modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: '12px' }}>
              <div className="car-field-group">
                <label className="car-field-label">{t('adminPages.carDetail.damageTypeReq')}</label>
                <CustomSelect
                  value={damageType}
                  onChange={(val) => setDamageType(val)}
                  options={[
                    { value: 'SCRATCH', label: t('adminPages.carDetail.dmScratch') },
                    { value: 'DENT', label: t('adminPages.carDetail.dmDent') },
                    { value: 'WINDSHIELD', label: t('adminPages.carDetail.dmWindshield') },
                    { value: 'INTERIOR', label: t('adminPages.carDetail.dmInterior') },
                    { value: 'WHEEL', label: t('adminPages.carDetail.dmWheel') },
                    { value: 'MECHANICAL', label: t('adminPages.carDetail.dmMechanical') },
                    { value: 'OTHER', label: t('adminPages.carDetail.dmOther') },
                  ]}
                />
              </div>

              <div className="car-field-group">
                <label className="car-field-label">{t('adminPages.carDetail.severityReq')}</label>
                <CustomSelect
                  value={severity}
                  onChange={(val) => setSeverity(val)}
                  options={[
                    { value: 'LOW', label: t('adminPages.carDetail.svLow') },
                    { value: 'MEDIUM', label: t('adminPages.carDetail.svMedium') },
                    { value: 'HIGH', label: t('adminPages.carDetail.svHigh') },
                    { value: 'CRITICAL', label: t('adminPages.carDetail.svCritical') },
                  ]}
                />
              </div>
            </div>

            <div className="car-field-group">
              <label className="car-field-label">{t('adminPages.carDetail.damageDescription')}</label>
              <textarea
                rows={3}
                required
                placeholder={t('adminPages.carDetail.damagePlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="car-field-input"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: '12px' }}>
              <div className="car-field-group">
                <label className="car-field-label">{t('adminPages.carDetail._repairCostLabel', { currency: APP_CURRENCY })}</label>
                <input
                  type="number"
                  step="0.01"
                  value={estimatedRepairCost}
                  onChange={(e) => setEstimatedRepairCost(Number(e.target.value))}
                  className="car-field-input"
                />
              </div>

              <div className="car-field-group">
                <label className="car-field-label">{t('adminPages.carDetail.initialStatus')}</label>
                <CustomSelect
                  value={status}
                  onChange={(val) => setStatus(val)}
                  options={[
                    { value: 'REPORTED', label: t('adminPages.carDetail.dsReported') },
                    { value: 'ASSESSED', label: t('adminPages.carDetail.dsReview') },
                    { value: 'REPAIR_SCHEDULED', label: t('adminPages.carDetail.dsRepair') },
                    { value: 'RESOLVED', label: t('adminPages.carDetail.dsResolved') },
                  ]}
                />
              </div>
            </div>

            <div className="car-field-group">
              <label className="car-field-label">{t('adminPages.carDetail.additionalNotes')}</label>
              <textarea
                rows={2}
                placeholder={t('adminPages.carDetail.additionalPlaceholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="car-field-input"
              />
            </div>
          </div>

          {submitError && (
            <div role="alert" style={{ color: '#B91C1C', fontWeight: 600, fontSize: '0.875rem', padding: '0 24px 12px' }}>{submitError}</div>
          )}
          <div className="car-modal-footer">
            <button type="button" onClick={onClose} className="car-btn-secondary">
              {t('adminPages.carDetail.cancel')}
            </button>
            <button type="submit" disabled={isSubmitting} className="car-btn-primary">
              {isSubmitting ? t('adminPages.carDetail.submitting') : t('adminPages.carDetail.fileDamage')}
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
  const { t } = useTranslation();
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
        title: t('adminPages.carDetail.rollbackTitle'),
        message: t('adminPages.carDetail._rollbackMessage', { reading: Number(reading).toLocaleString(), current: currentMileage.toLocaleString() }),
        note: t('adminPages.carDetail.rollbackNote'),
        confirmText: t('adminPages.carDetail.confirmRollback'),
        cancelText: t('adminPages.carDetail.cancel'),
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
      setError(err.message || t('adminPages.carDetail.errOdo'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="car-modal-overlay" onClick={onClose}>
      <div className="car-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="car-modal-header">
          <h3 className="car-modal-title">{t('adminPages.carDetail.odoModalTitle')}</h3>
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
              <label className="car-field-label">{t('adminPages.carDetail.currentReading')}</label>
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
              <label className="car-field-label">{t('adminPages.carDetail.logSource')}</label>
              <CustomSelect
                value={source}
                onChange={(val) => setSource(val)}
                options={[
                  { value: 'MANUAL_AUDIT', label: t('adminPages.carDetail.srcManual') },
                  { value: 'TRIP_RETURN', label: t('adminPages.carDetail.srcReturn') },
                  { value: 'TRIP_START', label: t('adminPages.carDetail.srcStart') },
                  { value: 'MAINTENANCE', label: t('adminPages.carDetail.srcMaintenance') },
                  { value: 'CALIBRATION', label: t('adminPages.carDetail.srcCalibration') },
                ]}
              />
            </div>

            <div className="car-field-group">
              <label className="car-field-label">{t('adminPages.carDetail.notes')}</label>
              <textarea
                rows={2}
                placeholder={t('adminPages.carDetail.odoNotesPlaceholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="car-field-input"
              />
            </div>
          </div>

          <div className="car-modal-footer">
            <button type="button" onClick={onClose} className="car-btn-secondary">
              {t('adminPages.carDetail.cancel')}
            </button>
            <button type="submit" disabled={isSubmitting} className="car-btn-primary">
              {isSubmitting ? t('adminPages.carDetail.recording') : t('adminPages.carDetail.updateOdo')}
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
  const { t } = useTranslation();
  const [rateName, setRateName] = useState('High Season Special');
  const [pricingMethod, setPricingMethod] = useState<'daily' | 'per_km' | 'daily_extra_km' | 'hourly' | 'monthly'>('daily');
  const currency = APP_CURRENCY;
  const [baseRate, setBaseRate] = useState<number>(dailyRate || 8000);
  const [securityDeposit, setSecurityDeposit] = useState<number>(25000);
  const [includedKmPerDay, setIncludedKmPerDay] = useState<number>(200);
  const [extraKmRate, setExtraKmRate] = useState<number>(50);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
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
      setSubmitError(err instanceof Error ? err.message : t('adminPages.carDetail.errMaintAction'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="car-modal-overlay" onClick={onClose}>
      <div className="car-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="car-modal-header">
          <h3 className="car-modal-title">{t('adminPages.carDetail.tierModalTitle')}</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="car-modal-body">
            <div className="car-field-group">
              <label className="car-field-label">{t('adminPages.carDetail.tierNameReq')}</label>
              <input
                type="text"
                required
                placeholder={t('adminPages.carDetail.tierPlaceholder')}
                value={rateName}
                onChange={(e) => setRateName(e.target.value)}
                className="car-field-input"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: '12px' }}>
              <div className="car-field-group">
                <label className="car-field-label">{t('adminPages.carDetail.pricingMethodReq')}</label>
                <CustomSelect
                  value={pricingMethod}
                  onChange={(val) => setPricingMethod(val as any)}
                  options={[
                    { value: 'daily', label: t('adminPages.carDetail.pmDaily') },
                    { value: 'per_km', label: t('adminPages.carDetail.pmKm') },
                    { value: 'daily_extra_km', label: t('adminPages.carDetail.dailyExtra') },
                    { value: 'hourly', label: t('adminPages.carDetail.pmHourly') },
                    { value: 'monthly', label: t('adminPages.carDetail.pmMonthly') },
                  ]}
                />
              </div>

              <div className="car-field-group">
                <label className="car-field-label">{t('adminPages.carDetail.currencyReq')}</label>
                <input type="text" value={currency} readOnly className="car-field-input" aria-readonly="true" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: '12px' }}>
              <div className="car-field-group">
                <label className="car-field-label">{t('adminPages.carDetail._tierBase', { currency })}</label>
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
                <label className="car-field-label">{t('adminPages.carDetail._tierDeposit', { currency })}</label>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: '12px' }}>
                <div className="car-field-group">
                  <label className="car-field-label">{t('adminPages.carDetail.includedKmDay')}</label>
                  <input
                    type="number"
                    value={includedKmPerDay}
                    onChange={(e) => setIncludedKmPerDay(Number(e.target.value))}
                    className="car-field-input"
                  />
                </div>

                <div className="car-field-group">
                  <label className="car-field-label">{t('adminPages.carDetail._tierExtra', { currency })}</label>
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

          {submitError && (
            <div role="alert" style={{ color: '#B91C1C', fontWeight: 600, fontSize: '0.875rem', padding: '0 24px 12px' }}>{submitError}</div>
          )}
          <div className="car-modal-footer">
            <button type="button" onClick={onClose} className="car-btn-secondary">
              {t('adminPages.carDetail.cancel')}
            </button>
            <button type="submit" disabled={isSubmitting} className="car-btn-primary">
              {isSubmitting ? t('adminPages.carDetail.creating') : t('adminPages.carDetail.createTier')}
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
  const { t } = useTranslation();
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
        title={t('adminPages.carDetail.closeViewer')}
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
            title={t('adminPages.carDetail.prevPhotoKey')}
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
            title={t('adminPages.carDetail.nextPhotoKey')}
          >
            <ChevronRight size={28} />
          </button>
        </>
      )}

      <div className="car-lightbox-content" onClick={(e) => e.stopPropagation()}>
        <img
          src={currentPhoto}
          alt={t('adminPages.carDetail._largeView', { name: carName })}
          className="car-lightbox-img"
          onError={(e) => {
            const target = e.currentTarget;
            if (photos[0] && !target.src.includes(photos[0])) {
              target.src = photos[0];
            }
          }}
        />
      </div>
    </div>
  );
}
