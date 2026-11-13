import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Camera,
  Printer,
  AlertCircle,
  CheckCircle2,
  Mail,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { customerPortalApi, type CustomerBookingDetail } from '../api/customerPortalApi';
import { formatMoney } from '../../../utils/carImageHelper';
import './CustomerPortal.css';

const CANCELLABLE_STATUSES = ['PENDING', 'RESERVED', 'CONFIRMED', 'READY_FOR_PICKUP'];
const COMPLETED_STATUSES = ['COMPLETED'];
const STARTED_STATUSES = ['ACTIVE', 'RETURN_INSPECTION', 'COMPLETED'];

export function CustomerBookingDetailPage() {
  const { t, i18n } = useTranslation();
  const [actionError, setActionError] = useState<string | null>(null);
  const formatDate = (value: string) => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(value));
  const formatDateTime = (value: string) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: 'full', timeStyle: 'short' }).format(new Date(value));
  const { bookingId } = useParams<{ bookingId: string }>();

  const [booking, setBooking] = useState<CustomerBookingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Extend trip state
  const [isExtendOpen, setIsExtendOpen] = useState(false);
  const [newReturnDate, setNewReturnDate] = useState('');
  const [isExtending, setIsExtending] = useState(false);

  // Cancel trip state
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const loadBooking = async () => {
    if (!bookingId) return;
    try {
      setIsLoading(true);
      const res = await customerPortalApi.getBookingById(bookingId);
      if (res.success && res.booking) {
        setBooking(res.booking);
      }
    } catch (err: any) {
      console.error('Failed to load booking details:', err);
      setErrorMessage(err?.message || t('portalPages.bookingDetail.errLoad'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  const handleExtend = async () => {
    if (!booking || !newReturnDate) return;
    try {
      setIsExtending(true);
      setActionError(null);
      const timePart = booking.returnDateTime.split('T')[1] || '10:00:00.000Z';
      await customerPortalApi.extendBooking(booking.id, `${newReturnDate}T${timePart}`);
      setIsExtendOpen(false);
      await loadBooking();
    } catch (err: any) {
      setActionError(err?.message || t('portalPages.bookings.errExtend'));
    } finally {
      setIsExtending(false);
    }
  };

  const handleCancel = async () => {
    if (!booking) return;
    try {
      setIsCancelling(true);
      setActionError(null);
      await customerPortalApi.cancelBooking(booking.id, cancelReason);
      setIsCancelOpen(false);
      await loadBooking();
    } catch (err: any) {
      setActionError(err?.message || t('portalPages.bookings.errCancel'));
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="cp-page-container">
        <div className="cp-card cp-skeleton" style={{ height: '450px' }} />
      </div>
    );
  }

  if (errorMessage || !booking) {
    return (
      <div className="cp-page-container">
        <div className="cp-card cp-empty-state">
          <AlertCircle size={36} color="var(--cp-danger)" />
          <h2 className="cp-empty-title">{t('portalPages.bookingDetail.notFound')}</h2>
          <p className="cp-empty-desc">{errorMessage || t('portalPages.bookingDetail.notFoundDesc')}</p>
          <Link to="/customer/bookings" className="cp-btn-primary">
            {t('portalPages.bookingDetail.backToBookings')}
          </Link>
        </div>
      </div>
    );
  }

  const pickupDateFormatted = formatDateTime(booking.pickupDateTime);

  const returnDateFormatted = formatDateTime(booking.returnDateTime);
  const money = (amount: number) => formatMoney(Number(amount), booking.currency, 2);

  return (
    <div className="cp-page-container">
      {/* Top Breadcrumb */}
      <div>
        <Link
          to="/customer/bookings"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--cp-text-muted)',
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: 600,
            marginBottom: '12px',
          }}
        >
          <ArrowLeft size={16} />
          {t('portalPages.bookingDetail.backToBookings')}
        </Link>
      </div>

      {/* Header Banner */}
      <div className="cp-card" style={{ background: 'linear-gradient(135deg, #1E0528 0%, #2E0B3C 100%)', color: '#FFFFFF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span className="cp-badge cp-badge-accent">#{booking.bookingNumber}</span>
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: '999px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  background:
                    booking.status === 'CONFIRMED'
                      ? 'rgba(59, 130, 246, 0.2)'
                      : booking.status === 'ACTIVE'
                      ? 'rgba(245, 158, 11, 0.2)'
                      : booking.status === 'COMPLETED'
                      ? 'rgba(16, 185, 129, 0.2)'
                      : 'rgba(239, 68, 68, 0.2)',
                  color:
                    booking.status === 'CONFIRMED'
                      ? '#60A5FA'
                      : booking.status === 'ACTIVE'
                      ? '#FBBF24'
                      : booking.status === 'COMPLETED'
                      ? '#34D399'
                      : '#F87171',
                }}
              >
                {t(`portalPages.bookings.status.${booking.status}`, { defaultValue: booking.status })}
              </span>
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>
              {booking.vehicle ? `${booking.vehicle.brand} ${booking.vehicle.model} (${booking.vehicle.year})` : t('portalPages.bookings.vehicle')}
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => window.print()}
              className="cp-btn-outline"
              style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#FFFFFF', borderColor: 'rgba(255, 255, 255, 0.2)' }}
            >
              <Printer size={16} />
              {t('portalPages.bookingDetail.printReceipt')}
            </button>
            <Link to={`/customer/bookings/${booking.id}/inspection`} className="cp-btn-primary">
              <Camera size={16} />
              {t('portalPages.bookingDetail.inspection')}
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="cp-responsive-grid-2col">
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Trip Timeline Tracker */}
          <div className="cp-card">
            <h2 className="cp-card-title" style={{ marginBottom: '20px' }}>{t('portalPages.bookingDetail.timeline')}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                {
                  title: t('portalPages.bookingDetail.stepBooked'),
                  done: true,
                  time: formatDate(booking.createdAt),
                },
                {
                  title: t('portalPages.bookingDetail.stepPickupInspection'),
                  done: booking.inspections.some((i) => i.type === 'PICKUP') || STARTED_STATUSES.includes(booking.status),
                  time: t('portalPages.bookingDetail.stepPickupInspectionTime'),
                },
                {
                  title: t('portalPages.bookingDetail.stepHandover'),
                  done: booking.hasRentalStarted || STARTED_STATUSES.includes(booking.status),
                  time: pickupDateFormatted,
                },
                {
                  title: t('portalPages.bookingDetail.stepReturn'),
                  done: booking.inspections.some((i) => i.type === 'RETURN') || COMPLETED_STATUSES.includes(booking.status),
                  time: returnDateFormatted,
                },
                {
                  title: t('portalPages.bookingDetail.stepSettlement'),
                  done: COMPLETED_STATUSES.includes(booking.status),
                  time: t('portalPages.bookingDetail.stepSettlementTime'),
                },
              ].map((step, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: step.done ? 'var(--cp-success)' : '#E9E4ED',
                      color: step.done ? '#FFFFFF' : 'var(--cp-text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {step.done ? <CheckCircle2 size={16} /> : <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{idx + 1}</span>}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: step.done ? 'var(--cp-primary)' : 'var(--cp-text-muted)', fontSize: '0.92rem' }}>
                      {step.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--cp-text-subtle)' }}>{step.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Locations */}
          <div className="cp-subgrid-2col">
            <div className="cp-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cp-text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>
                <MapPin size={16} color="var(--cp-accent)" />
                {t('portalPages.bookingDetail.pickupBranch')}
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--cp-primary)', margin: '0 0 6px 0' }}>
                {booking.pickupBranch?.name || '—'}
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--cp-text-muted)', margin: '0 0 12px 0' }}>
                {booking.pickupBranch?.address || booking.pickupBranch?.city || '—'}
              </p>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--cp-primary)' }}>
                {pickupDateFormatted}
              </div>
            </div>

            <div className="cp-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cp-text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>
                <MapPin size={16} color="var(--cp-primary)" />
                {t('portalPages.bookingDetail.returnBranch')}
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--cp-primary)', margin: '0 0 6px 0' }}>
                {booking.returnBranch?.name || '—'}
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--cp-text-muted)', margin: '0 0 12px 0' }}>
                {booking.returnBranch?.address || booking.returnBranch?.city || '—'}
              </p>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--cp-primary)' }}>
                {returnDateFormatted}
              </div>
            </div>
          </div>

          {/* Manage Trip Actions */}
          <div className="cp-card">
            <h2 className="cp-card-title" style={{ marginBottom: '14px' }}>{t('portalPages.bookingDetail.manageTrip')}</h2>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {booking.status === 'PENDING' && (
                <Link to="/customer/payments" className="cp-btn-primary">
                  {t('portalPages.bookings.payNow')}
                </Link>
              )}
              {CANCELLABLE_STATUSES.includes(booking.status) && (
                <button
                  className="cp-btn-danger"
                  onClick={() => {
                    setActionError(null);
                    setIsCancelOpen(true);
                  }}
                >
                  {t('portalPages.bookingDetail.cancelBooking')}
                </button>
              )}
              {booking.status === 'ACTIVE' && (
                <button
                  className="cp-btn-outline"
                  onClick={() => {
                    setActionError(null);
                    setNewReturnDate(booking.returnDateTime.split('T')[0]);
                    setIsExtendOpen(true);
                  }}
                >
                  <Clock size={16} />
                  {t('portalPages.bookingDetail.extendReturn')}
                </button>
              )}
              <Link to="/customer/support" className="cp-btn-outline">
                <Mail size={16} />
                {t('portalPages.bookingDetail.contactSupport')}
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column: Financial Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="cp-card">
            <h3 className="cp-card-title" style={{ marginBottom: '16px' }}>{t('portalPages.bookingDetail.invoice')}</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
              {booking.breakdownItems && booking.breakdownItems.length > 0 ? (
                // The deposit is shown on its own line below, so it is left out of the rental lines
                booking.breakdownItems.filter((item) => item.lineType !== 'deposit').map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                    <span style={{ color: 'var(--cp-text-muted)' }}>{item.description}</span>
                    <span style={{ fontWeight: 600, color: 'var(--cp-primary)', whiteSpace: 'nowrap' }}>{money(item.amount)}</span>
                  </div>
                ))
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--cp-text-muted)' }}>{t('portalPages.bookingDetail.rentalBase', { count: booking.totalDays })}</span>
                    <span style={{ fontWeight: 600, color: 'var(--cp-primary)' }}>{money(booking.subtotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--cp-text-muted)' }}>{t('portalPages.bookingDetail.tax')}</span>
                    <span style={{ fontWeight: 600, color: 'var(--cp-primary)' }}>{money(booking.taxAmount)}</span>
                  </div>
                </>
              )}

              <div
                style={{
                  borderTop: '1px solid var(--cp-border)',
                  paddingTop: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <span style={{ fontWeight: 800, color: 'var(--cp-primary)', fontSize: '1rem' }}>{t('portalPages.bookingDetail.total')}</span>
                <span style={{ fontWeight: 800, color: 'var(--cp-primary)', fontSize: '1.4rem' }}>
                  {money(booking.totalAmount)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--cp-text-muted)' }}>{t('portalPages.bookingDetail.deposit')}</span>
                <span style={{ fontWeight: 700, color: '#10B981' }}>{money(booking.depositAmount)}</span>
              </div>
            </div>

            {/* Payments history */}
            {booking.payments && booking.payments.length > 0 && (
              <div style={{ marginTop: '20px', borderTop: '1px solid var(--cp-border)', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--cp-primary)', marginBottom: '10px' }}>
                  {t('portalPages.bookingDetail.payments')}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {booking.payments.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        padding: '10px',
                        background: '#F8F6F9',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.82rem',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--cp-primary)' }}>{t('portalPages.bookingDetail.providerPayment', { provider: p.provider })}</div>
                        <div style={{ color: 'var(--cp-text-subtle)' }}>{formatDate(p.createdAt)}</div>
                      </div>
                      <div style={{ fontWeight: 800, color: '#10B981' }}>+{formatMoney(Number(p.amount), p.currency || booking.currency, 2)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Extension Modal */}
      {isExtendOpen && (
        <div className="cp-modal-backdrop">
          <div className="cp-modal-box">
            <h2 className="cp-card-title" style={{ marginBottom: '12px' }}>{t('portalPages.bookingDetail.extendTitle')}</h2>
            <p style={{ color: 'var(--cp-text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
              {t('portalPages.bookingDetail.extendDesc')}
            </p>
            {actionError && (
              <div role="alert" style={{ color: 'var(--cp-danger)', fontWeight: 600, fontSize: '0.88rem', marginBottom: '12px' }}>
                {actionError}
              </div>
            )}
            <div className="cp-form-group">
              <label className="cp-label">{t('portalPages.bookingDetail.newReturnDate')}</label>
              <input
                type="date"
                className="cp-input"
                min={booking.returnDateTime.split('T')[0]}
                value={newReturnDate}
                onChange={(e) => setNewReturnDate(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button className="cp-btn-outline" onClick={() => setIsExtendOpen(false)}>
                {t('portalPages.bookingDetail.cancel')}
              </button>
              <button className="cp-btn-primary" disabled={isExtending} onClick={handleExtend}>
                {isExtending ? t('portalPages.bookings.updating') : t('portalPages.bookings.confirmExtend')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {isCancelOpen && (
        <div className="cp-modal-backdrop">
          <div className="cp-modal-box">
            <h2 className="cp-card-title" style={{ marginBottom: '12px' }}>{t('portalPages.bookingDetail.cancelTitle')}</h2>
            <p style={{ color: 'var(--cp-text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
              {t('portalPages.bookingDetail.cancelQuestion', { number: booking.bookingNumber })}
            </p>
            {actionError && (
              <div role="alert" style={{ color: 'var(--cp-danger)', fontWeight: 600, fontSize: '0.88rem', marginBottom: '12px' }}>
                {actionError}
              </div>
            )}
            <div className="cp-form-group">
              <label className="cp-label">{t('portalPages.bookingDetail.reason')}</label>
              <textarea
                className="cp-textarea"
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={t('portalPages.bookingDetail.reasonPlaceholder')}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button className="cp-btn-outline" onClick={() => setIsCancelOpen(false)}>
                {t('portalPages.bookingDetail.keepBooking')}
              </button>
              <button className="cp-btn-danger" disabled={isCancelling} onClick={handleCancel}>
                {isCancelling ? t('portalPages.bookings.processing') : t('portalPages.bookings.confirmCancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
