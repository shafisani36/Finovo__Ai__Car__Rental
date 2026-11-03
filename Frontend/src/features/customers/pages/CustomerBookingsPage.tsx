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
import { customerPortalApi, type CustomerBookingItem } from '../api/customerPortalApi';
import './CustomerPortal.css';

export function CustomerBookingsPage() {
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
      await customerPortalApi.cancelBooking(cancelModalBooking.id, cancelReason);
      setCancelModalBooking(null);
      setCancelReason('');
      await fetchBookings();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel booking');
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
      setExtendError(err.message || 'Unable to extend booking for selected date');
    } finally {
      setIsExtending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="cp-badge cp-badge-info">Confirmed</span>;
      case 'ACTIVE':
        return <span className="cp-badge cp-badge-warning">In Progress</span>;
      case 'COMPLETED':
        return <span className="cp-badge cp-badge-success">Completed</span>;
      case 'CANCELLED':
        return <span className="cp-badge cp-badge-danger">Cancelled</span>;
      default:
        return <span className="cp-badge cp-badge-primary">{status}</span>;
    }
  };

  return (
    <div className="cp-page-container">
      {/* Page Header */}
      <div className="cp-page-header">
        <div>
          <h1 className="cp-page-title">My Rental Bookings</h1>
          <p className="cp-page-subtitle">Track, manage, and inspect your reservations in real-time.</p>
        </div>
        <div className="cp-header-actions">
          <Link to="/customer/cars" className="cp-btn-primary">
            <Car size={16} />
            Reserve New Vehicle
          </Link>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="cp-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div className="cp-tabs-bar" style={{ border: 'none', padding: 0 }}>
            {['ALL', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED'].map((tab) => (
              <button
                key={tab}
                className={`cp-tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'ALL' ? 'All Bookings' : tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--cp-text-muted)' }} />
            <input
              type="text"
              placeholder="Search reference or vehicle..."
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
          <h3 className="cp-empty-title">No Bookings Found</h3>
          <p className="cp-empty-desc">
            {activeTab !== 'ALL'
              ? `You do not have any ${activeTab.toLowerCase()} bookings.`
              : 'You have not reserved any cars yet. Discover our premium fleet and start driving today!'}
          </p>
          <Link to="/customer/cars" className="cp-btn-primary">
            Explore Available Cars
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {bookings.map((booking) => {
            const pickupFormatted = new Date(booking.pickupDateTime).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
            const returnFormatted = new Date(booking.returnDateTime).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div key={booking.id} className="cp-card" style={{ padding: '24px' }}>
                <div className="cp-booking-card-main">
                  {/* Left Column: Vehicle & Booking Info */}
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div
                      style={{
                        width: '160px',
                        height: '110px',
                        borderRadius: '12px',
                        background: '#F1EEF4',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={
                          booking.vehicle?.primaryImageUrl ||
                          'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=400&q=80'
                        }
                        alt="Vehicle"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 800, color: 'var(--cp-primary)', fontSize: '1.2rem' }}>
                          {booking.vehicle ? `${booking.vehicle.brand} ${booking.vehicle.model}` : 'Premium Rental'}
                        </span>
                        {getStatusBadge(booking.status)}
                      </div>

                      <div style={{ fontSize: '0.85rem', color: 'var(--cp-text-muted)' }}>
                        Booking ID: <strong style={{ color: 'var(--cp-primary)' }}>#{booking.bookingNumber}</strong>
                      </div>

                      {/* Locations & Dates */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginTop: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.85rem' }}>
                          <MapPin size={16} color="var(--cp-accent)" style={{ marginTop: '2px', flexShrink: 0 }} />
                          <div>
                            <div style={{ color: 'var(--cp-text-muted)' }}>Pickup: {booking.pickupBranch?.name || 'Central Hub'}</div>
                            <div style={{ fontWeight: 600, color: 'var(--cp-primary)' }}>{pickupFormatted}</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.85rem' }}>
                          <Clock size={16} color="var(--cp-primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                          <div>
                            <div style={{ color: 'var(--cp-text-muted)' }}>Return: {booking.returnBranch?.name || 'Central Hub'}</div>
                            <div style={{ fontWeight: 600, color: 'var(--cp-primary)' }}>{returnFormatted}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Price & Main Action */}
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--cp-text-muted)' }}>Total Amount</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--cp-primary)' }}>
                      ${Number(booking.totalAmount).toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--cp-text-muted)' }}>
                      Deposit: ${Number(booking.depositAmount).toFixed(2)}
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
                      AI Inspection Report
                    </Link>

                    {booking.status === 'CONFIRMED' && (
                      <button
                        className="cp-btn-danger"
                        style={{ fontSize: '0.85rem' }}
                        onClick={() => setCancelModalBooking(booking)}
                      >
                        Cancel Reservation
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
                        Extend Trip
                      </button>
                    )}
                  </div>

                  <Link to={`/customer/bookings/${booking.id}`} className="cp-btn-secondary" style={{ fontSize: '0.85rem' }}>
                    View Full Details
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
              Cancel Booking #{cancelModalBooking.bookingNumber}
            </h2>
            <p style={{ color: 'var(--cp-text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
              Are you sure you want to cancel your reservation for the{' '}
              <strong>
                {cancelModalBooking.vehicle?.brand} {cancelModalBooking.vehicle?.model}
              </strong>
              ? You will receive a full refund if canceled 24 hours prior to pickup.
            </p>

            <div className="cp-form-group">
              <label className="cp-label">Reason for cancellation (optional)</label>
              <textarea
                className="cp-textarea"
                rows={3}
                placeholder="Change of plans, found alternate transport, etc..."
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
                Keep Booking
              </button>
              <button
                className="cp-btn-danger"
                disabled={isCancelling}
                onClick={handleCancelBooking}
              >
                {isCancelling ? 'Processing...' : 'Confirm Cancellation'}
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
              Extend Trip for #{extendModalBooking.bookingNumber}
            </h2>
            <p style={{ color: 'var(--cp-text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
              Current Return Date:{' '}
              <strong>{new Date(extendModalBooking.returnDateTime).toLocaleDateString()}</strong>. Choose your new return date:
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
              <label className="cp-label">New Return Date</label>
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
                Cancel
              </button>
              <button
                className="cp-btn-primary"
                disabled={isExtending || !extendDate}
                onClick={handleExtendBooking}
              >
                {isExtending ? 'Updating Trip...' : 'Confirm Trip Extension'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
