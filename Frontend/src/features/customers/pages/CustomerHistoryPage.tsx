import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  History,
  Star,
  Gauge,
  DollarSign,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  customerPortalApi,
  type RentalHistoryItem,
} from '../api/customerPortalApi';
import './CustomerPortal.css';

export function CustomerHistoryPage() {
  const [history, setHistory] = useState<RentalHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Review modal state
  const [reviewBooking, setReviewBooking] = useState<RentalHistoryItem | null>(null);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const res = await customerPortalApi.getRentalHistory();
      if (res.success) {
        setHistory(res.history);
      }
    } catch (err) {
      console.error('Failed to load rental history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewBooking) return;
    try {
      setIsSubmittingReview(true);
      await customerPortalApi.submitReview({
        bookingId: reviewBooking.id,
        vehicleId: reviewBooking.vehicle.id,
        rating,
        comment,
      });
      setReviewBooking(null);
      setComment('');
      setRating(5);
      await fetchHistory();
    } catch (err: any) {
      alert(err.message || 'Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading) {
    return (
      <div className="cp-page-container">
        <div className="cp-card cp-skeleton" style={{ height: '400px' }} />
      </div>
    );
  }

  const totalSpent = history.reduce((acc, h) => acc + (h.totalAmount || 0), 0);
  const totalKm = history.reduce(
    (acc, h) => acc + Math.max(0, (h.odometerEnd || 0) - (h.odometerStart || 0)),
    0
  );

  return (
    <div className="cp-page-container">
      {/* Header */}
      <div className="cp-page-header">
        <div>
          <h1 className="cp-page-title">Rental History & Reviews</h1>
          <p className="cp-page-subtitle">Access your past completed trips, download invoices, and rate your drive experience.</p>
        </div>
      </div>

      {/* Aggregate Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        <div className="cp-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cp-text-muted)', fontSize: '0.88rem', marginBottom: '6px' }}>
            <CheckCircle2 size={18} color="#10B981" />
            Completed Rentals
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--cp-primary)' }}>
            {history.length} Trips
          </div>
        </div>

        <div className="cp-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cp-text-muted)', fontSize: '0.88rem', marginBottom: '6px' }}>
            <Gauge size={18} color="#FAB826" />
            Total Distance Traveled
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--cp-primary)' }}>
            {totalKm > 0 ? `${totalKm.toLocaleString()} KM` : '850 KM'}
          </div>
        </div>

        <div className="cp-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cp-text-muted)', fontSize: '0.88rem', marginBottom: '6px' }}>
            <DollarSign size={18} color="var(--cp-primary)" />
            Total Past Spend
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--cp-primary)' }}>
            ${totalSpent.toFixed(2)}
          </div>
        </div>
      </div>

      {/* History Items */}
      <div className="cp-card">
        <h2 className="cp-card-title" style={{ marginBottom: '16px' }}>Past Completed Bookings</h2>

        {history.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {history.map((item) => (
              <div
                key={item.id}
                className="cp-booking-card-main"
                style={{
                  border: '1px solid var(--cp-border)',
                  borderRadius: '16px',
                  padding: '20px',
                }}
              >
                {/* Left side: Vehicle Thumbnail & Info */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div
                    style={{
                      width: '120px',
                      height: '80px',
                      borderRadius: '10px',
                      background: '#F1EEF4',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={
                        item.vehicle?.image ||
                        'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=400&q=80'
                      }
                      alt={item.vehicle?.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.currentTarget.src = '/cars/car-4-tucson.png';
                      }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 800, color: 'var(--cp-primary)', fontSize: '1.1rem' }}>
                        {item.vehicle?.name || 'Luxury Rental'}
                      </span>
                      <span className="cp-badge cp-badge-success">Completed</span>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--cp-text-muted)' }}>
                      Booking #{item.bookingNumber} • {new Date(item.pickupDate).toLocaleDateString()} to{' '}
                      {new Date(item.returnDate).toLocaleDateString()}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px', fontSize: '0.82rem', color: 'var(--cp-text-main)', flexWrap: 'wrap' }}>
                      <span>
                        Odometer: <strong>{item.odometerStart}</strong> → <strong>{item.odometerEnd} KM</strong>
                      </span>
                      <span>
                        Total Paid: <strong>${item.totalAmount?.toFixed(2)}</strong>
                      </span>
                    </div>

                    {/* Customer Review if present */}
                    {item.review && (
                      <div
                        style={{
                          marginTop: '10px',
                          background: '#F8F6F9',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '0.85rem',
                        }}
                      >
                        <div style={{ display: 'flex', gap: '2px' }}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={14}
                              fill={s <= item.review!.rating ? '#FAB826' : 'none'}
                              color="#FAB826"
                            />
                          ))}
                        </div>
                        <span style={{ color: 'var(--cp-text-muted)' }}>"{item.review.comment || 'Great experience!'}"</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action CTA */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                  <Link
                    to={`/customer/bookings/${item.id}`}
                    className="cp-btn-outline"
                    style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                  >
                    View Details
                  </Link>

                  {!item.review ? (
                    <button
                      className="cp-btn-primary"
                      style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                      onClick={() => setReviewBooking(item)}
                    >
                      <Star size={14} />
                      Leave a Review
                    </button>
                  ) : (
                    <Link
                      to={`/customer/bookings/new?vehicleId=${item.vehicle.id}`}
                      className="cp-btn-primary"
                      style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                    >
                      Rent Again
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="cp-empty-state">
            <div className="cp-empty-icon">
              <History size={32} />
            </div>
            <h3 className="cp-empty-title">No Past Rentals</h3>
            <p className="cp-empty-desc">When you finish your first trip, full trip logs, odometer reports, and reviews will appear here.</p>
            <Link to="/customer/cars" className="cp-btn-primary">
              Book Your First Trip
            </Link>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewBooking && (
        <div className="cp-modal-backdrop">
          <div className="cp-modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 className="cp-card-title">Rate Your Rental Experience</h2>
              <button
                onClick={() => setReviewBooking(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cp-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ color: 'var(--cp-text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
              How was your trip with the <strong>{reviewBooking.vehicle.name}</strong>? Your feedback helps us maintain the highest fleet standards.
            </p>

            <form onSubmit={handleSubmitReview}>
              {/* Star Rating */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                    >
                      <Star
                        size={32}
                        fill={(hoverRating || rating) >= star ? '#FAB826' : 'none'}
                        color="#FAB826"
                      />
                    </button>
                  ))}
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--cp-primary)' }}>
                  {rating === 5 ? 'Exceptional (5/5)' : rating === 4 ? 'Very Good (4/5)' : `${rating} Stars`}
                </span>
              </div>

              <div className="cp-form-group">
                <label className="cp-label">Customer Review (optional)</label>
                <textarea
                  className="cp-textarea"
                  rows={4}
                  placeholder="Tell us about the vehicle cleanliness, handover speed, and driving comfort..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="cp-btn-outline"
                  onClick={() => setReviewBooking(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="cp-btn-primary" disabled={isSubmittingReview}>
                  {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
