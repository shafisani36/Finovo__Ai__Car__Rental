import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  DollarSign
} from 'lucide-react';
import { useConfirm } from '../../../components/common/ConfirmModal';
import {
  PageContainer,
  PageHeader,
  StatusBadge,
  Modal,
} from '../../../components/common';

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
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Selected booking modal state
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

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
        title="Bookings & Reservations"
        subtitle="Manage customer reservations, pricing allocations, and dispatch schedules."
        breadcrumbs={[
          { label: 'Admin', to: '/admin/dashboard' },
          { label: 'Reservations' },
        ]}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link
              to="/admin/bookings/calendar"
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
              <span>Calendar View</span>
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
              <span>New Booking</span>
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
          {['ALL', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'PENDING', 'CANCELLED'].map((st) => (
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
              {st === 'ALL' ? 'All Bookings' : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: 'min(100%, 280px)', flex: '1 1 220px' }}>
          <Search size={16} color="#9CA3AF" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search booking #, customer..."
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
                Loading reservations...
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
              No Bookings Found
            </div>
            <div style={{ fontSize: '0.85rem', maxWidth: '380px', color: '#6B7280' }}>
              No reservations match your current filter or search criteria.
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
                      <span>Reserved on {formatDate(b.createdAt)}</span>
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
                      brand={b.vehicle?.brand || 'Car'}
                      model={b.vehicle?.model || ''}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6C1E84', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Vehicle
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
                        Plate: <strong style={{ color: '#374151' }}>{b.vehicle?.registrationNumber || 'N/A'}</strong>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '2px' }}>
                        {b.vehicle?.category?.name || 'Coupe / Sports'}
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
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Customer
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
                        {b.customer?.fullName || 'Guest Customer'}
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
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Rental Period
                      </div>
                      <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.88rem' }}>
                        {formatDate(b.pickupDateTime)} – {formatDate(b.returnDateTime)}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={12} color="#9CA3AF" />
                        <span>{b.pickupBranch?.name || 'Finovo Hub'}</span>
                        <span style={{ fontWeight: 700, color: '#D97706' }}>
                          ({b.totalDays} {b.totalDays === 1 ? 'day' : 'days'})
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
                      <DollarSign size={18} color="#059669" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Total Amount
                      </div>
                      <div style={{ fontWeight: 800, color: '#1E0426', fontSize: '1.25rem', lineHeight: '1.2' }}>
                        ${Number(b.totalAmount).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: '2px' }}>
                        ${Number(b.dailyRate).toFixed(2)} / day
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
                  {b.status === 'CONFIRMED' && (
                    <button
                      onClick={() => navigate(`/admin/rentals/handover/${b.id}`)}
                      title="Handover Vehicle"
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
                      <span>Handover</span>
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
                    <span>Details</span>
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
            Showing <strong>{bookings.length}</strong> of <strong>{totalCount}</strong> reservations
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
              Previous
            </button>
            <span style={{ fontWeight: 700, color: '#111827', fontSize: '0.85rem' }}>
              Page {page} of {totalPages}
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
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ================= BOOKING DETAIL MODAL ================= */}
      {selectedBooking && (
        <Modal
          isOpen={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
          title={`Booking ${selectedBooking.bookingNumber}`}
          subtitle={`Created on ${formatDate(selectedBooking.createdAt)}`}
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
                Plate: {selectedBooking.vehicle.registrationNumber} • Category: {selectedBooking.vehicle.category.name}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Customer</div>
                <div style={{ fontWeight: 700 }}>{selectedBooking.customer.fullName}</div>
                <div style={{ fontSize: '0.8rem', color: '#4B5563' }}>{selectedBooking.customer.email}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Duration & Branches</div>
                <div style={{ fontWeight: 700 }}>{selectedBooking.totalDays} Days (${Number(selectedBooking.dailyRate).toFixed(2)}/day)</div>
                <div style={{ fontSize: '0.8rem', color: '#4B5563' }}>Pickup: {selectedBooking.pickupBranch.name}</div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #ECEAEF', paddingTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Subtotal</span>
                <strong>${Number(selectedBooking.subtotal).toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Taxes & Fees</span>
                <strong>${Number(selectedBooking.taxAmount).toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Security Deposit (Refundable)</span>
                <strong>${Number(selectedBooking.depositAmount).toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, borderTop: '1px solid #ECEAEF', paddingTop: '8px' }}>
                <span>Total Amount</span>
                <span style={{ color: '#059669' }}>${Number(selectedBooking.totalAmount).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            {selectedBooking.status === 'CONFIRMED' && (
              <button
                type="button"
                onClick={async () => {
                  const customerName = selectedBooking.customer?.fullName || 'the customer';
                  const ok = await confirm({
                    title: `Cancel Booking ${selectedBooking.bookingNumber}?`,
                    message: `Are you sure you want to cancel the booking for ${customerName}? Any security deposit pre-authorization will be released.`,
                    confirmText: 'Cancel Booking',
                    cancelText: 'Keep Booking',
                    variant: 'danger',
                    note: 'The allocated vehicle will immediately be returned to available fleet inventory.',
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
                Cancel Booking
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
                Proceed to Handover →
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
              Close
            </button>
          </div>
        </Modal>
      )}
    </PageContainer>
  );
}
