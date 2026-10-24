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
import { customerPortalApi, type CustomerBookingDetail } from '../api/customerPortalApi';
import './CustomerPortal.css';

export function CustomerBookingDetailPage() {
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
      setErrorMessage(err.message || 'Unable to retrieve reservation details');
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
      const timePart = booking.returnDateTime.split('T')[1] || '10:00:00.000Z';
      await customerPortalApi.extendBooking(booking.id, `${newReturnDate}T${timePart}`);
      setIsExtendOpen(false);
      await loadBooking();
    } catch (err: any) {
      alert(err.message || 'Failed to extend trip');
    } finally {
      setIsExtending(false);
    }
  };

  const handleCancel = async () => {
    if (!booking) return;
    try {
      setIsCancelling(true);
      await customerPortalApi.cancelBooking(booking.id, cancelReason);
      setIsCancelOpen(false);
      await loadBooking();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel reservation');
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
          <h2 className="cp-empty-title">Booking Not Found</h2>
          <p className="cp-empty-desc">{errorMessage || 'The requested booking could not be found or you do not have permission to view it.'}</p>
          <Link to="/customer/bookings" className="cp-btn-primary">
            Back to My Bookings
          </Link>
        </div>
      </div>
    );
  }

  const pickupDateFormatted = new Date(booking.pickupDateTime).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const returnDateFormatted = new Date(booking.returnDateTime).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

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
          Back to Bookings
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
                {booking.status}
              </span>
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>
              {booking.vehicle ? `${booking.vehicle.brand} ${booking.vehicle.model} (${booking.vehicle.year})` : 'Vehicle Reservation'}
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => window.print()}
              className="cp-btn-outline"
              style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#FFFFFF', borderColor: 'rgba(255, 255, 255, 0.2)' }}
            >
              <Printer size={16} />
              Print Receipt
            </button>
            <Link to={`/customer/bookings/${booking.id}/inspection`} className="cp-btn-primary">
              <Camera size={16} />
              AI Damage Inspection
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
            <h2 className="cp-card-title" style={{ marginBottom: '20px' }}>Rental Progress Timeline</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { title: 'Booking Confirmed', done: true, time: new Date(booking.createdAt).toLocaleDateString() },
                {
                  title: 'Pre-Trip Computer Vision Inspection',
                  done: booking.inspections.some((i) => i.type === 'PICKUP') || booking.status === 'ACTIVE' || booking.status === 'COMPLETED',
                  time: 'Scheduled at branch handover',
                },
                { title: 'Vehicle Handover & Drive Off', done: booking.hasRentalStarted || booking.status === 'ACTIVE' || booking.status === 'COMPLETED', time: pickupDateFormatted },
                { title: 'Trip Return & AI Damage Scan', done: booking.status === 'COMPLETED', time: returnDateFormatted },
                { title: 'Final Settlement & Security Deposit Release', done: booking.status === 'COMPLETED', time: 'Instant automated release' },
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
                Pickup Station
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--cp-primary)', margin: '0 0 6px 0' }}>
                {booking.pickupBranch?.name || 'Central Hub'}
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--cp-text-muted)', margin: '0 0 12px 0' }}>
                {booking.pickupBranch?.address || 'King Fahd Road, Luxury Motor Complex, Riyadh'}
              </p>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--cp-primary)' }}>
                {pickupDateFormatted}
              </div>
            </div>

            <div className="cp-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cp-text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>
                <MapPin size={16} color="var(--cp-primary)" />
                Return Station
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--cp-primary)', margin: '0 0 6px 0' }}>
                {booking.returnBranch?.name || 'Central Hub'}
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--cp-text-muted)', margin: '0 0 12px 0' }}>
                {booking.returnBranch?.address || 'King Fahd Road, Luxury Motor Complex, Riyadh'}
              </p>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--cp-primary)' }}>
                {returnDateFormatted}
              </div>
            </div>
          </div>

          {/* Manage Trip Actions */}
          <div className="cp-card">
            <h2 className="cp-card-title" style={{ marginBottom: '14px' }}>Trip Operations</h2>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {booking.status === 'CONFIRMED' && (
                <button className="cp-btn-danger" onClick={() => setIsCancelOpen(true)}>
                  Cancel Booking
                </button>
              )}
              {booking.status === 'ACTIVE' && (
                <button
                  className="cp-btn-outline"
                  onClick={() => {
                    setNewReturnDate(booking.returnDateTime.split('T')[0]);
                    setIsExtendOpen(true);
                  }}
                >
                  <Clock size={16} />
                  Extend Return Date
                </button>
              )}
              <Link to="/customer/support" className="cp-btn-outline">
                <Mail size={16} />
                Need Assistance? Contact Support
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column: Financial Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="cp-card">
            <h3 className="cp-card-title" style={{ marginBottom: '16px' }}>Invoice Breakdown</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
              {booking.breakdownItems && booking.breakdownItems.length > 0 ? (
                booking.breakdownItems.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--cp-text-muted)' }}>{item.description}:</span>
                    <span style={{ fontWeight: 600, color: 'var(--cp-primary)' }}>${Number(item.amount).toFixed(2)}</span>
                  </div>
                ))
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--cp-text-muted)' }}>Rental Base ({booking.totalDays} days):</span>
                    <span style={{ fontWeight: 600, color: 'var(--cp-primary)' }}>${Number(booking.subtotal).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--cp-text-muted)' }}>Tax (VAT):</span>
                    <span style={{ fontWeight: 600, color: 'var(--cp-primary)' }}>${Number(booking.taxAmount).toFixed(2)}</span>
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
                <span style={{ fontWeight: 800, color: 'var(--cp-primary)', fontSize: '1rem' }}>Total Reservation:</span>
                <span style={{ fontWeight: 800, color: 'var(--cp-primary)', fontSize: '1.4rem' }}>
                  ${Number(booking.totalAmount).toFixed(2)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--cp-text-muted)' }}>Security Deposit Hold:</span>
                <span style={{ fontWeight: 700, color: '#10B981' }}>${Number(booking.depositAmount).toFixed(2)}</span>
              </div>
            </div>

            {/* Payments history */}
            {booking.payments && booking.payments.length > 0 && (
              <div style={{ marginTop: '20px', borderTop: '1px solid var(--cp-border)', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--cp-primary)', marginBottom: '10px' }}>
                  Recorded Transactions
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
                        <div style={{ fontWeight: 600, color: 'var(--cp-primary)' }}>{p.provider} Payment</div>
                        <div style={{ color: 'var(--cp-text-subtle)' }}>{new Date(p.createdAt).toLocaleDateString()}</div>
                      </div>
                      <div style={{ fontWeight: 800, color: '#10B981' }}>+${Number(p.amount).toFixed(2)}</div>
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
            <h2 className="cp-card-title" style={{ marginBottom: '12px' }}>Extend Reservation</h2>
            <p style={{ color: 'var(--cp-text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
              Select your preferred new return date:
            </p>
            <div className="cp-form-group">
              <label className="cp-label">New Return Date</label>
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
                Cancel
              </button>
              <button className="cp-btn-primary" disabled={isExtending} onClick={handleExtend}>
                {isExtending ? 'Saving...' : 'Confirm Extension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {isCancelOpen && (
        <div className="cp-modal-backdrop">
          <div className="cp-modal-box">
            <h2 className="cp-card-title" style={{ marginBottom: '12px' }}>Cancel Reservation</h2>
            <p style={{ color: 'var(--cp-text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
              Are you sure you want to cancel booking #{booking.bookingNumber}?
            </p>
            <div className="cp-form-group">
              <label className="cp-label">Reason</label>
              <textarea
                className="cp-textarea"
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation..."
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button className="cp-btn-outline" onClick={() => setIsCancelOpen(false)}>
                Keep Booking
              </button>
              <button className="cp-btn-danger" disabled={isCancelling} onClick={handleCancel}>
                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
