import type { CSSProperties } from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { bookingApi, type Booking } from '../api/bookingApi';
import {
  Calendar,
  Search,
  Plus,
  Car,
  KeyRound,
  User,
  MapPin,
  Clock,
  Banknote,
  ShieldCheck
} from 'lucide-react';
import { useConfirm } from '../../../components/common/ConfirmModal';
import {
  PageContainer,
  PageHeader,
  StatusBadge,
  Modal,
} from '../../../components/common';
import { formatMoney } from '../../../utils/carImageHelper';
import { useTranslation } from 'react-i18next';
import { rentalApi, type RentalAgreementSummary } from '../../rentals/api/rentalApi';
import { downloadProtectedFile } from '../../../utils/downloadFile';
import { BookingReviewModal } from '../components/BookingReviewModal';

const CAPTION_STYLE: CSSProperties = { fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' };

function VehicleThumbnail({ src, brand, model }: { src?: string; brand: string; model: string }) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        style={{
          width: '110px',
          height: '76px',
          borderRadius: '10px',
          backgroundColor: '#F5EFF8',
          border: '1px solid #ECEAEF',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          flexShrink: 0,
        }}
      >
        <Car size={24} color="#6C1E84" />
        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#6C1E84', textTransform: 'uppercase' }}>
          {brand}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '110px',
        height: '76px',
        borderRadius: '10px',
        backgroundColor: '#F9FAFB',
        border: '1px solid #ECEAEF',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <img
        src={src}
        alt={`${brand} ${model}`}
        onError={() => setHasError(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  );
}

export function BookingsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchParams, setSearchParams] = useSearchParams();
  // Staff email links open the document check directly: ?review=<bookingId>
  const reviewId = searchParams.get('review');
  const openReview = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('review', id);
    setSearchParams(next);
  };
  const closeReview = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('review');
    setSearchParams(next);
  };
  // A link can open the list already filtered, for example ?search=FIN-2026-0001
  const [search, setSearch] = useState(() => (searchParams.get('search') || '').slice(0, 100));
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Selected booking modal state
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  // Signed rental agreement of the booking open in the details dialog, remembered with its booking id
  const [loadedAgreement, setLoadedAgreement] = useState<{ bookingId: string; agreement: RentalAgreementSummary | null } | null>(null);
  const [agreementError, setAgreementError] = useState<{ bookingId: string; message: string } | null>(null);
  const selectedAgreement = selectedBooking && loadedAgreement?.bookingId === selectedBooking.id ? loadedAgreement.agreement : null;
  const selectedAgreementError = selectedBooking && agreementError?.bookingId === selectedBooking.id ? agreementError.message : null;

  useEffect(() => {
    if (!selectedBooking) return;
    let active = true;
    const bookingId = selectedBooking.id;
    rentalApi
      .getAgreement(bookingId)
      .then((res) => {
        if (active) setLoadedAgreement({ bookingId, agreement: res.agreement });
      })
      .catch(() => {
        if (active) setLoadedAgreement({ bookingId, agreement: null });
      });
    return () => {
      active = false;
    };
  }, [selectedBooking]);

  const downloadSelectedAgreement = async () => {
    if (!selectedBooking || !selectedAgreement) return;
    try {
      setAgreementError(null);
      await downloadProtectedFile(rentalApi.agreementPdfEndpoint(selectedBooking.id), `${selectedAgreement.agreementNumber}.pdf`);
    } catch (err) {
      setAgreementError({
        bookingId: selectedBooking.id,
        message: err instanceof Error ? err.message : t('adminPages.handover.errDownload'),
      });
    }
  };

  const loadBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await bookingApi.list({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: search.trim() || undefined,
        page,
        limit: 10,
      });
      if (res?.bookings) {
        setBookings(res.bookings);
        setTotalPages(res.pagination.totalPages || 1);
        setTotalCount(res.pagination.total || 0);
      }
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await bookingApi.updateStatus(id, newStatus);
      setSelectedBooking(null);
      await loadBookings();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const renderStatusPill = (status: Booking['status']) => (
    <StatusBadge status={status} />
  );

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return isoStr;
    }
  };

  return (
    <PageContainer>
      {/* ================= HEADER ================= */}
      <PageHeader
        title={t('adminPages.bookings.title')}
        subtitle={t('adminPages.bookings.subtitle')}
        breadcrumbs={[
          { label: t('adminPages.bookings.crumbAdmin'), to: '/admin/dashboard' },
          { label: t('adminPages.bookings.crumb') },
        ]}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link
              to="/admin/calendar"
              style={{
                backgroundColor: '#FFFFFF',
                color: '#1A0322',
                fontWeight: 700,
                fontSize: '0.9rem',
                padding: '10px 18px',
                borderRadius: '10px',
                border: '1px solid #ECEAEF',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
              }}
            >
              <Calendar size={16} />
              <span>{t('adminPages.bookings.calendarView')}</span>
            </Link>

            <Link
              to="/admin/bookings/new"
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
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E5A61F')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FAB826')}
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>{t('adminPages.bookings.newBooking')}</span>
            </Link>
          </div>
        }
      />

      {/* ================= CONTROLS ROW ================= */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '16px 20px',
          border: '1px solid #ECEAEF',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {['ALL', 'REQUIRES_REVIEW', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'PENDING', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              style={{
                border: 'none',
                borderRadius: '8px',
                padding: '7px 14px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: statusFilter === st ? '#1E0426' : '#F9FAFB',
                color: statusFilter === st ? '#FFFFFF' : '#4B5563',
                transition: 'all 0.15s ease',
              }}
            >
              {st === 'ALL' ? t('adminPages.bookings._allBookings') : t(`portalPages.bookings.status.${st}`, { defaultValue: st.charAt(0) + st.slice(1).toLowerCase() })}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: 'min(100%, 280px)', flex: '1 1 220px' }}>
          <Search size={16} color="#9CA3AF" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder={t('adminPages.bookings.search')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{
              width: '100%',
              height: '38px',
              paddingLeft: '36px',
              paddingRight: '12px',
              borderRadius: '10px',
              border: '1px solid #D1D5DB',
              outline: 'none',
              fontSize: '0.85rem',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* ================= BOOKINGS CARD LIST ================= */}
      <div style={{ marginBottom: '24px' }}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #ECEAEF',
                  padding: '24px',
                  height: '140px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#9CA3AF',
                }}
              >
                {t('adminPages.bookings.loading')}
              </div>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #ECEAEF',
              padding: '56px 24px',
              textAlign: 'center',
              color: '#6B7280',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#F5EEF8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6C1E84',
              }}
            >
              <Calendar size={28} />
            </div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#111827' }}>
              {t('adminPages.bookings.emptyTitle')}
            </div>
            <div style={{ fontSize: '0.85rem', maxWidth: '380px', color: '#6B7280' }}>
              {t('adminPages.bookings.emptyDesc')}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {bookings.map((b) => (
              <div
                key={b.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #ECEAEF',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  padding: '20px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#DACDE0';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(30, 4, 38, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#ECEAEF';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)';
                }}
              >
                {/* Card Top Header: Reference & Status */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: '14px',
                    borderBottom: '1px solid #F3F4F6',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        backgroundColor: '#F5EEF8',
                        color: '#6C1E84',
                        fontWeight: 800,
                        fontSize: '0.88rem',
                        padding: '5px 12px',
                        borderRadius: '8px',
                        letterSpacing: '0.02em',
                        border: '1px solid rgba(108, 30, 132, 0.12)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      #{b.bookingNumber}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#6B7280', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <Clock size={13} color="#9CA3AF" />
                      <span>{t('adminPages.bookings._reservedOn', { date: formatDate(b.createdAt) })}</span>
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {renderStatusPill(b.status)}
                  </div>
                </div>

                {/* Card Main Body: 4-Column Responsive Grid Flow */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '20px',
                    alignItems: 'center',
                  }}
                >
                  {/* Vehicle Section */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <VehicleThumbnail
                      src={b.vehicle?.primaryImageUrl}
                      brand={b.vehicle?.brand || t('adminPages.bookings.car')}
                      model={b.vehicle?.model || ''}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6C1E84', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {t('adminPages.bookings.vehicle')}
                      </div>
                      <div
                        style={{
                          fontWeight: 800,
                          color: '#111827',
                          fontSize: '1rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={`${b.vehicle?.brand} ${b.vehicle?.model}`}
                      >
                        {b.vehicle?.brand} {b.vehicle?.model}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: '2px' }}>
                        {t('adminPages.bookings.plate')} <strong style={{ color: '#374151' }}>{b.vehicle?.registrationNumber || 'N/A'}</strong>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '2px' }}>
                        {b.vehicle?.category?.name || t('adminPages.bookings.uncategorized')}
                      </div>
                    </div>
                  </div>

                  {/* Customer Section */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        backgroundColor: '#F3F4F6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#4B5563',
                        flexShrink: 0,
                      }}
                    >
                      <User size={18} color="#6B7280" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={CAPTION_STYLE}>
                        {t('adminPages.bookings.customer')}
                      </div>
                      <div
                        style={{
                          fontWeight: 700,
                          color: '#111827',
                          fontSize: '0.92rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {b.customer?.fullName || t('adminPages.bookings.guest')}
                      </div>
                      <div
                        style={{
                          fontSize: '0.78rem',
                          color: '#6B7280',
                          marginTop: '2px',
                          wordBreak: 'break-all',
                        }}
                      >
                        {b.customer?.email}
                      </div>
                      {b.customer?.phone && (
                        <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '2px' }}>
                          {b.customer.phone}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dates & Branches Section */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        backgroundColor: '#FFF7ED',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Calendar size={18} color="#D97706" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={CAPTION_STYLE}>
                        {t('adminPages.bookings.period')}
                      </div>
                      <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.88rem' }}>
                        {formatDate(b.pickupDateTime)} – {formatDate(b.returnDateTime)}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={12} color="#9CA3AF" />
                        <span>{b.pickupBranch?.name || t('adminPages.bookings.hub')}</span>
                        <span style={{ fontWeight: 700, color: '#D97706' }}>
                          ({t('adminPages.counts.days', { count: b.totalDays })})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing Section */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        backgroundColor: '#ECFDF5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Banknote size={18} color="#059669" />
                    </div>
                    <div>
                      <div style={CAPTION_STYLE}>
                        {t('adminPages.bookings.totalAmount')}
                      </div>
                      <div style={{ fontWeight: 800, color: '#1E0426', fontSize: '1.25rem', lineHeight: '1.2' }}>
                        {formatMoney(Number(b.totalAmount), b.currency, 2)}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: '2px' }}>
                        {t('adminPages.bookings._perDay', { amount: formatMoney(Number(b.dailyRate), b.currency, 2) })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions Bottom Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    paddingTop: '12px',
                    borderTop: '1px solid #F9FAFB',
                    gap: '10px',
                    flexWrap: 'wrap',
                  }}
                >
                  {b.status === 'REQUIRES_REVIEW' && (
                    <button
                      onClick={() => openReview(b.id)}
                      style={{
                        backgroundColor: '#047857',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: '#FFFFFF',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <ShieldCheck size={15} />
                      <span>{t('adminPages.bookingReview.reviewButton')}</span>
                    </button>
                  )}

                  {b.status === 'CONFIRMED' && (
                    <button
                      onClick={() => navigate(`/admin/rentals/handover/${b.id}`)}
                      title={t('adminPages.bookings.handoverVehicle')}
                      style={{
                        backgroundColor: '#FAB826',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: '#1C0324',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 6px rgba(250, 184, 38, 0.3)',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E5A61F')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FAB826')}
                    >
                      <KeyRound size={15} />
                      <span>{t('adminPages.bookings.handover')}</span>
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedBooking(b)}
                    style={{
                      backgroundColor: '#F3F4F6',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#374151',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E5E7EB')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F3F4F6')}
                  >
                    <span>{t('adminPages.bookings.details')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ================= PAGINATION BAR ================= */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderRadius: '14px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #ECEAEF',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            fontSize: '0.85rem',
            color: '#6B7280',
            flexWrap: 'wrap',
            gap: '12px',
            marginTop: '16px',
          }}
        >
          <div>
            {t('adminPages.bookings._showing', { shown: bookings.length, total: totalCount })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                border: '1px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                borderRadius: '6px',
                padding: '6px 14px',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                opacity: page <= 1 ? 0.5 : 1,
                fontWeight: 600,
                fontSize: '0.825rem',
              }}
            >
              {t('adminPages.bookings.previous')}
            </button>
            <span style={{ fontWeight: 700, color: '#111827', fontSize: '0.85rem' }}>
              {t('adminPages.bookings._page', { page, pages: totalPages })}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                border: '1px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                borderRadius: '6px',
                padding: '6px 14px',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                opacity: page >= totalPages ? 0.5 : 1,
                fontWeight: 600,
                fontSize: '0.825rem',
              }}
            >
              {t('adminPages.bookings.next')}
            </button>
          </div>
        </div>
      </div>

      {/* ================= BOOKING DETAIL MODAL ================= */}
      {selectedBooking && (
        <Modal
          isOpen={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
          title={t('adminPages.bookings._modalTitle', { number: selectedBooking.bookingNumber })}
          subtitle={t('adminPages.bookings._createdOn', { date: formatDate(selectedBooking.createdAt) })}
          maxWidth="560px"
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
            {renderStatusPill(selectedBooking.status)}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.875rem' }}>
            <div style={{ backgroundColor: '#F9FAFB', padding: '12px 14px', borderRadius: '10px' }}>
              <div style={{ fontWeight: 700, color: '#111827', marginBottom: '2px' }}>
                {selectedBooking.vehicle.brand} {selectedBooking.vehicle.model}
              </div>
              <div style={{ color: '#6B7280', fontSize: '0.8rem' }}>
                {t('adminPages.bookings._plateCategory', { plate: selectedBooking.vehicle.registrationNumber, category: selectedBooking.vehicle.category.name })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{t('adminPages.bookings.customer')}</div>
                <div style={{ fontWeight: 700 }}>{selectedBooking.customer.fullName}</div>
                <div style={{ fontSize: '0.8rem', color: '#4B5563' }}>{selectedBooking.customer.email}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{t('adminPages.bookings.durationBranches')}</div>
                <div style={{ fontWeight: 700 }}>{t('adminPages.bookings._days', { count: selectedBooking.totalDays, rate: formatMoney(Number(selectedBooking.dailyRate), selectedBooking.currency, 2) })}</div>
                <div style={{ fontSize: '0.8rem', color: '#4B5563' }}>{t('adminPages.bookings._pickupBranch', { branch: selectedBooking.pickupBranch.name })}</div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #ECEAEF', paddingTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>{t('adminPages.bookings.subtotal')}</span>
                <strong>{formatMoney(Number(selectedBooking.subtotal), selectedBooking.currency, 2)}</strong>
              </div>
              {Number(selectedBooking.deliveryFee || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>{t('adminPages.bookingExtras.deliveryFee')}</span>
                  <strong>{formatMoney(Number(selectedBooking.deliveryFee), selectedBooking.currency, 2)}</strong>
                </div>
              )}
              {Number(selectedBooking.promoDiscount || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>{t('adminPages.bookingExtras.promo', { code: selectedBooking.promoCode?.code || '' })}</span>
                  <strong>−{formatMoney(Number(selectedBooking.promoDiscount), selectedBooking.currency, 2)}</strong>
                </div>
              )}
              {Number(selectedBooking.pointsDiscount || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>{t('adminPages.bookingExtras.points', { count: selectedBooking.pointsRedeemed || 0 })}</span>
                  <strong>−{formatMoney(Number(selectedBooking.pointsDiscount), selectedBooking.currency, 2)}</strong>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>{t('adminPages.bookings.taxes')}</span>
                <strong>{formatMoney(Number(selectedBooking.taxAmount), selectedBooking.currency, 2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>{t('adminPages.bookings.deposit')}</span>
                <strong>{formatMoney(Number(selectedBooking.depositAmount), selectedBooking.currency, 2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, borderTop: '1px solid #ECEAEF', paddingTop: '8px' }}>
                <span>{t('adminPages.bookings.totalAmount')}</span>
                <span style={{ color: '#059669' }}>{formatMoney(Number(selectedBooking.totalAmount), selectedBooking.currency, 2)}</span>
              </div>
              {selectedBooking.status === 'CANCELLED' && selectedBooking.cancellationFee !== null && selectedBooking.cancellationFee !== undefined && (
                <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#4B5563' }}>
                  {t('adminPages.bookingExtras.cancelled', {
                    fee: formatMoney(Number(selectedBooking.cancellationFee), selectedBooking.currency, 2),
                    refund: formatMoney(Number(selectedBooking.refundAmount || 0), selectedBooking.currency, 2),
                  })}
                </div>
              )}
            </div>

            {(selectedBooking.deliveryAddress || selectedBooking.collectionAddress) && (
              <div style={{ borderTop: '1px solid #ECEAEF', paddingTop: '12px', fontSize: '0.88rem' }}>
                {selectedBooking.deliveryAddress && (
                  <div>{t('adminPages.handover.deliverTo', { address: selectedBooking.deliveryAddress })}</div>
                )}
                {selectedBooking.collectionAddress && (
                  <div>{t('adminPages.handover.collectFrom', { address: selectedBooking.collectionAddress })}</div>
                )}
              </div>
            )}

            {selectedAgreement && (
              <div style={{ borderTop: '1px solid #ECEAEF', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', fontSize: '0.88rem' }}>
                <span>
                  {t('adminPages.bookingExtras.agreement', {
                    number: selectedAgreement.agreementNumber,
                    name: selectedAgreement.signerName,
                  })}
                </span>
                <button
                  type="button"
                  onClick={downloadSelectedAgreement}
                  style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #ECEAEF', background: '#FFFFFF', fontWeight: 600, cursor: 'pointer' }}
                >
                  {t('adminPages.handover.downloadPdf')}
                </button>
                {selectedAgreementError && <span role="alert" style={{ color: '#B91C1C' }}>{selectedAgreementError}</span>}
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            {selectedBooking.status === 'CONFIRMED' && (
              <button
                type="button"
                onClick={async () => {
                  const customerName = selectedBooking.customer?.fullName || t('adminPages.bookings._theCustomer');
                  const ok = await confirm({
                    title: t('adminPages.bookings._cancelTitle', { number: selectedBooking.bookingNumber }),
                    message: t('adminPages.bookings._cancelMessage', { name: customerName }),
                    confirmText: t('adminPages.bookings.cancelBooking'),
                    cancelText: t('adminPages.bookings.keepBooking'),
                    variant: 'danger',
                    note: t('adminPages.bookings.cancelNote'),
                  });
                  if (!ok) return;
                  handleStatusChange(selectedBooking.id, 'CANCELLED');
                }}
                style={{
                  backgroundColor: '#FEE2E2',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontWeight: 700,
                  color: '#B91C1C',
                  cursor: 'pointer',
                }}
              >
                {t('adminPages.bookings.cancelBooking')}
              </button>
            )}
            {selectedBooking.status === 'REQUIRES_REVIEW' && (
              <button
                type="button"
                onClick={() => {
                  const id = selectedBooking.id;
                  setSelectedBooking(null);
                  openReview(id);
                }}
                style={{
                  backgroundColor: '#047857',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  cursor: 'pointer',
                }}
              >
                {t('adminPages.bookingReview.reviewButton')}
              </button>
            )}
            {selectedBooking.status === 'CONFIRMED' && (
              <button
                type="button"
                onClick={() => {
                  navigate(`/admin/rentals/handover/${selectedBooking.id}`);
                }}
                style={{
                  backgroundColor: '#FAB826',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontWeight: 700,
                  color: '#1C0324',
                  cursor: 'pointer',
                }}
              >
                {t('adminPages.bookings.proceedHandover')}
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedBooking(null)}
              style={{
                backgroundColor: '#F3F4F6',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t('adminPages.bookings.close')}
            </button>
          </div>
        </Modal>
      )}

      {reviewId && <BookingReviewModal key={reviewId} bookingId={reviewId} onClose={closeReview} onDecided={() => void loadBookings()} />}
    </PageContainer>
  );
}
