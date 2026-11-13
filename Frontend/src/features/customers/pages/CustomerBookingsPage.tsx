import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Search,
  Car,
  Clock,
  MapPin,
  ChevronRight,
  Camera,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { customerPortalApi, type CustomerBookingItem } from '../api/customerPortalApi';
import { formatMoney, getCarImage } from '../../../utils/carImageHelper';
import './CustomerPortal.css';

const STATUS_TABS = ['ALL', 'PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const;
const CANCELLABLE_STATUSES = ['PENDING', 'RESERVED', 'CONFIRMED', 'READY_FOR_PICKUP'];

const STATUS_BADGE_CLASS: Record<string, string> = {
  PENDING: 'cp-badge-warning',
  REQUIRES_REVIEW: 'cp-badge-warning',
  RESERVED: 'cp-badge-info',
  CONFIRMED: 'cp-badge-info',
  READY_FOR_PICKUP: 'cp-badge-info',
  ACTIVE: 'cp-badge-warning',
  RETURN_INSPECTION: 'cp-badge-info',
  COMPLETED: 'cp-badge-success',
  CANCELLED: 'cp-badge-danger',
  REJECTED: 'cp-badge-danger',
  EXPIRED: 'cp-badge-danger',
};

export function CustomerBookingsPage() {
  const { t, i18n } = useTranslation();
  const formatDateTime = (value: string) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<CustomerBookingItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Cancellation Modal state
  const [cancelModalBooking, setCancelModalBooking] = useState<CustomerBookingItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Extension Modal state
  const [extendModalBooking, setExtendModalBooking] = useState<CustomerBookingItem | null>(null);
  const [extendDate, setExtendDate] = useState('');
  const [isExtending, setIsExtending] = useState(false);
  const [extendError, setExtendError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: any = {};
      if (activeTab !== 'ALL') params.status = activeTab;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await customerPortalApi.listBookings(params);
      if (res.success && res.bookings) {
        setBookings(res.bookings);
      }
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleCancelBooking = async () => {
    if (!cancelModalBooking) return;
    try {
      setIsCancelling(true);
      setCancelError(null);
      await customerPortalApi.cancelBooking(cancelModalBooking.id, cancelReason);
      setCancelModalBooking(null);
      setCancelReason('');
      await fetchBookings();
    } catch (err: any) {
      setCancelError(err?.message || t('portalPages.bookings.errCancel'));
    } finally {
      setIsCancelling(false);
    }
  };

  const handleExtendBooking = async () => {
    if (!extendModalBooking || !extendDate) return;
    try {
      setIsExtending(true);
      setExtendError(null);
      const newReturnDateTime = `${extendDate}T${extendModalBooking.returnDateTime.split('T')[1] || '10:00:00.000Z'}`;
      await customerPortalApi.extendBooking(extendModalBooking.id, newReturnDateTime);
      setExtendModalBooking(null);
      await fetchBookings();
    } catch (err: any) {
      setExtendError(err?.message || t('portalPages.bookings.errExtend'));
    } finally {
      setIsExtending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    return (
      <span className={`cp-badge ${STATUS_BADGE_CLASS[status] || 'cp-badge-primary'}`}>
        {t(`portalPages.bookings.status.${status}`, { defaultValue: status })}
      </span>
    );
  };

  return (
    <div className="cp-page-container">
      {/* Page Header */}
      <div className="cp-page-header">
        <div>
          <h1 className="cp-page-title">{t('portalPages.bookings.title')}</h1>
          <p className="cp-page-subtitle">{t('portalPages.bookings.subtitle')}</p>
        </div>
        <div className="cp-header-actions">
          <Link to="/customer/cars" className="cp-btn-primary">
            <Car size={16} />
            {t('portalPages.bookings.reserveNew')}
          </Link>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="cp-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div className="cp-tabs-bar" style={{ border: 'none', padding: 0 }}>
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                className={`cp-tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {t(`portalPages.bookings.tabs.${tab}`)}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', width: 'min(100%, 280px)', flex: '1 1 220px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--cp-text-muted)' }} />
            <input
              type="text"
              placeholder={t('portalPages.bookings.searchPlaceholder')}
              className="cp-input"
              style={{ paddingLeft: '38px', paddingRight: '12px', height: '40px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Bookings List */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="cp-card cp-skeleton" style={{ height: '180px' }} />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="cp-card cp-empty-state">
          <div className="cp-empty-icon">
            <Calendar size={32} />
          </div>
          <h3 className="cp-empty-title">{t('portalPages.bookings.emptyTitle')}</h3>
          <p className="cp-empty-desc">
            {activeTab !== 'ALL' || searchQuery.trim()
              ? t('portalPages.bookings.emptyFiltered')
              : t('portalPages.bookings.emptyAll')}
          </p>
          <Link to="/customer/cars" className="cp-btn-primary">
            {t('portalPages.bookings.exploreCars')}
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {bookings.map((booking) => {
            const pickupFormatted = formatDateTime(booking.pickupDateTime);
            const returnFormatted = formatDateTime(booking.returnDateTime);

            return (
              <div key={booking.id} className="cp-card" style={{ padding: '24px' }}>
                <div className="cp-booking-card-main">
                  {/* Left Column: Vehicle & Booking Info */}
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div
                      style={{
                        width: 'min(100%, 160px)',
                        height: '110px',
                        borderRadius: '12px',
                        background: '#F1EEF4',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={booking.vehicle?.primaryImageUrl || getCarImage(booking.vehicle)}
                        alt={booking.vehicle ? `${booking.vehicle.brand} ${booking.vehicle.model}` : t('portalPages.bookings.vehicle')}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 800, color: 'var(--cp-primary)', fontSize: '1.2rem' }}>
                          {booking.vehicle ? `${booking.vehicle.brand} ${booking.vehicle.model}` : t('portalPages.bookings.vehicle')}
                        </span>
                        {getStatusBadge(booking.status)}
                      </div>

                      <div style={{ fontSize: '0.85rem', color: 'var(--cp-text-muted)' }}>
                        {t('portalPages.bookings.bookingId')} <strong style={{ color: 'var(--cp-primary)' }}>#{booking.bookingNumber}</strong>
                      </div>

                      {/* Locations & Dates */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginTop: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.85rem' }}>
                          <MapPin size={16} color="var(--cp-accent)" style={{ marginTop: '2px', flexShrink: 0 }} />
                          <div>
                            <div style={{ color: 'var(--cp-text-muted)' }}>{t('portalPages.bookings.pickupAt', { branch: booking.pickupBranch?.name || '—' })}</div>
                            <div style={{ fontWeight: 600, color: 'var(--cp-primary)' }}>{pickupFormatted}</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.85rem' }}>
                          <Clock size={16} color="var(--cp-primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                          <div>
                            <div style={{ color: 'var(--cp-text-muted)' }}>{t('portalPages.bookings.returnAt', { branch: booking.returnBranch?.name || '—' })}</div>
                            <div style={{ fontWeight: 600, color: 'var(--cp-primary)' }}>{returnFormatted}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Price & Main Action */}
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--cp-text-muted)' }}>{t('portalPages.bookings.totalAmount')}</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--cp-primary)' }}>
                      {formatMoney(Number(booking.totalAmount), booking.currency, 2)}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--cp-text-muted)' }}>
                      {t('portalPages.bookings.depositAmount', { amount: formatMoney(Number(booking.depositAmount), booking.currency, 2) })}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions Bar */}
                <div
                  style={{
                    borderTop: '1px solid var(--cp-border)',
                    marginTop: '20px',
                    paddingTop: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Link to={`/customer/bookings/${booking.id}/inspection`} className="cp-btn-outline" style={{ fontSize: '0.85rem' }}>
                      <Camera size={14} color="#FAB826" />
                      {t('portalPages.bookings.inspectionReport')}
                    </Link>

                    {booking.status === 'PENDING' && (
                      <Link to="/customer/payments" className="cp-btn-primary" style={{ fontSize: '0.85rem' }}>
                        {t('portalPages.bookings.payNow')}
                      </Link>
                    )}

                    {CANCELLABLE_STATUSES.includes(booking.status) && (
                      <button
                        className="cp-btn-danger"
                        style={{ fontSize: '0.85rem' }}
                        onClick={() => {
                          setCancelError(null);
                          setCancelModalBooking(booking);
                        }}
                      >
                        {t('portalPages.bookings.cancelReservation')}
                      </button>
                    )}

                    {booking.status === 'ACTIVE' && (
                      <button
                        className="cp-btn-outline"
                        style={{ fontSize: '0.85rem' }}
                        onClick={() => {
                          setExtendModalBooking(booking);
                          setExtendDate(booking.returnDateTime.split('T')[0]);
                        }}
                      >
                        <Clock size={14} />
                        {t('portalPages.bookings.extendTrip')}
                      </button>
                    )}
                  </div>

                  <Link to={`/customer/bookings/${booking.id}`} className="cp-btn-secondary" style={{ fontSize: '0.85rem' }}>
                    {t('portalPages.bookings.viewDetails')}
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancellation Modal */}
      {cancelModalBooking && (
        <div className="cp-modal-backdrop">
          <div className="cp-modal-box">
            <h2 className="cp-card-title" style={{ marginBottom: '12px' }}>
              {t('portalPages.bookings.cancelTitle', { number: cancelModalBooking.bookingNumber })}
            </h2>
            <p style={{ color: 'var(--cp-text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
              {t('portalPages.bookings.cancelQuestion', {
                vehicle: `${cancelModalBooking.vehicle?.brand || ''} ${cancelModalBooking.vehicle?.model || ''}`.trim(),
              })}
            </p>

            {cancelError && (
              <div role="alert" style={{ color: 'var(--cp-danger)', fontWeight: 600, fontSize: '0.88rem', marginBottom: '12px' }}>
                {cancelError}
              </div>
            )}

            <div className="cp-form-group">
              <label className="cp-label">{t('portalPages.bookings.reasonOptional')}</label>
              <textarea
                className="cp-textarea"
                rows={3}
                placeholder={t('portalPages.bookings.reasonPlaceholder')}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                className="cp-btn-outline"
                disabled={isCancelling}
                onClick={() => setCancelModalBooking(null)}
              >
                {t('portalPages.bookings.keepBooking')}
              </button>
              <button
                className="cp-btn-danger"
                disabled={isCancelling}
                onClick={handleCancelBooking}
              >
                {isCancelling ? t('portalPages.bookings.processing') : t('portalPages.bookings.confirmCancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extension Modal */}
      {extendModalBooking && (
        <div className="cp-modal-backdrop">
          <div className="cp-modal-box">
            <h2 className="cp-card-title" style={{ marginBottom: '12px' }}>
              {t('portalPages.bookings.extendTitle', { number: extendModalBooking.bookingNumber })}
            </h2>
            <p style={{ color: 'var(--cp-text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
              {t('portalPages.bookings.extendCurrent', { date: formatDateTime(extendModalBooking.returnDateTime) })}
            </p>

            {extendError && (
              <div
                style={{
                  background: 'var(--cp-danger-bg)',
                  color: 'var(--cp-danger)',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  marginBottom: '14px',
                  fontSize: '0.85rem',
                }}
              >
                {extendError}
              </div>
            )}

            <div className="cp-form-group">
              <label className="cp-label">{t('portalPages.bookings.newReturnDate')}</label>
              <input
                type="date"
                className="cp-input"
                min={extendModalBooking.returnDateTime.split('T')[0]}
                value={extendDate}
                onChange={(e) => setExtendDate(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                className="cp-btn-outline"
                disabled={isExtending}
                onClick={() => {
                  setExtendModalBooking(null);
                  setExtendError(null);
                }}
              >
                {t('portalPages.bookings.cancel')}
              </button>
              <button
                className="cp-btn-primary"
                disabled={isExtending || !extendDate}
                onClick={handleExtendBooking}
              >
                {isExtending ? t('portalPages.bookings.updating') : t('portalPages.bookings.confirmExtend')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
