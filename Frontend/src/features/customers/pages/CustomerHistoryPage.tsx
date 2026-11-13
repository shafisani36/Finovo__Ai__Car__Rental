import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  History,
  Star,
  Gauge,
  Banknote,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  customerPortalApi,
  type RentalHistoryItem,
} from '../api/customerPortalApi';
import { getCarImage, formatMoney } from '../../../utils/carImageHelper';
import './CustomerPortal.css';
import { useTranslation } from 'react-i18next';

export function CustomerHistoryPage() {
  const { t, i18n } = useTranslation();
  const formatNumber = (value: number) => new Intl.NumberFormat(i18n.language).format(value);
  const formatDate = (value: string) => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(value));
  const [history, setHistory] = useState<RentalHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Review modal state
  const [reviewBooking, setReviewBooking] = useState<RentalHistoryItem | null>(null);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

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
      setReviewError(null);
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
      setReviewError(err?.message || t('portalPages.history.errReview'));
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
          <h1 className="cp-page-title">{t('portalPages.history.title')}</h1>
          <p className="cp-page-subtitle">{t('portalPages.history.subtitle')}</p>
        </div>
      </div>

      {/* Aggregate Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        <div className="cp-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cp-text-muted)', fontSize: '0.88rem', marginBottom: '6px' }}>
            <CheckCircle2 size={18} color="#10B981" />
            {t('portalPages.history.completed')}
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--cp-primary)' }}>
            {formatNumber(history.length)}
          </div>
        </div>

        <div className="cp-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cp-text-muted)', fontSize: '0.88rem', marginBottom: '6px' }}>
            <Gauge size={18} color="#FAB826" />
            {t('portalPages.history.distance')}
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--cp-primary)' }}>
            {t('portalPages.history.km', { value: formatNumber(totalKm) })}
          </div>
        </div>

        <div className="cp-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cp-text-muted)', fontSize: '0.88rem', marginBottom: '6px' }}>
            <Banknote size={18} color="var(--cp-primary)" />
            {t('portalPages.history.spent')}
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--cp-primary)' }}>
            {formatMoney(totalSpent, history[0]?.currency, 2)}
          </div>
        </div>
      </div>

      {/* History Items */}
      <div className="cp-card">
        <h2 className="cp-card-title" style={{ marginBottom: '16px' }}>{t('portalPages.history.listTitle')}</h2>

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
                      src={item.vehicle?.image || getCarImage({ model: item.vehicle?.name })}
                      alt={item.vehicle?.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        const fallback = getCarImage({ model: item.vehicle?.name });
                        if (!e.currentTarget.src.includes(fallback)) {
                          e.currentTarget.src = fallback;
                        }
                      }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 800, color: 'var(--cp-primary)', fontSize: '1.1rem' }}>
                        {item.vehicle?.name || t('portalPages.bookings.vehicle')}
                      </span>
                      <span className="cp-badge cp-badge-success">{t('portalPages.bookings.status.COMPLETED')}</span>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--cp-text-muted)' }}>
                      {t('portalPages.history.bookingLine', {
                        number: item.bookingNumber,
                        from: formatDate(item.pickupDate),
                        to: formatDate(item.returnDate),
                      })}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px', fontSize: '0.82rem', color: 'var(--cp-text-main)', flexWrap: 'wrap' }}>
                      {item.odometerStart != null && item.odometerEnd != null && (
                        <span>
                          {t('portalPages.history.odometer')}{' '}
                          <strong>{formatNumber(item.odometerStart)}</strong> →{' '}
                          <strong>{t('portalPages.history.km', { value: formatNumber(item.odometerEnd) })}</strong>
                        </span>
                      )}
                      <span>
                        {t('portalPages.history.totalPaid')} <strong>{formatMoney(item.totalAmount || 0, item.currency, 2)}</strong>
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
                        {item.review.comment && <span style={{ color: 'var(--cp-text-muted)' }}>"{item.review.comment}"</span>}
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
                    {t('portalPages.history.viewDetails')}
                  </Link>

                  {!item.review ? (
                    <button
                      className="cp-btn-primary"
                      style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                      onClick={() => {
                        setReviewError(null);
                        setReviewBooking(item);
                      }}
                    >
                      <Star size={14} />
                      {t('portalPages.history.leaveReview')}
                    </button>
                  ) : (
                    <Link
                      to={`/customer/cars/${item.vehicle.id}`}
                      className="cp-btn-primary"
                      style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                    >
                      {t('portalPages.history.rentAgain')}
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
            <h3 className="cp-empty-title">{t('portalPages.history.emptyTitle')}</h3>
            <p className="cp-empty-desc">{t('portalPages.history.emptyDesc')}</p>
            <Link to="/customer/cars" className="cp-btn-primary">
              {t('portalPages.history.bookFirst')}
            </Link>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewBooking && (
        <div className="cp-modal-backdrop">
          <div className="cp-modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 className="cp-card-title">{t('portalPages.history.reviewTitle')}</h2>
              <button
                onClick={() => setReviewBooking(null)}
                aria-label={t('portalPages.history.close')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cp-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ color: 'var(--cp-text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
              {t('portalPages.history.reviewQuestion', { vehicle: reviewBooking.vehicle.name })}
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
                      aria-label={t('portalPages.history.stars', { count: star })}
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
                  {t(`portalPages.history.ratingLabels.r${rating}`)}
                </span>
              </div>

              <div className="cp-form-group">
                <label className="cp-label">{t('portalPages.history.comment')}</label>
                <textarea
                  className="cp-textarea"
                  rows={4}
                  placeholder={t('portalPages.history.commentPlaceholder')}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              {reviewError && (
                <div role="alert" style={{ color: 'var(--cp-danger)', fontWeight: 600, fontSize: '0.88rem', marginTop: '12px' }}>
                  {reviewError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="cp-btn-outline"
                  onClick={() => setReviewBooking(null)}
                >
                  {t('portalPages.history.cancel')}
                </button>
                <button type="submit" className="cp-btn-primary" disabled={isSubmittingReview}>
                  {isSubmittingReview ? t('portalPages.history.submitting') : t('portalPages.history.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
