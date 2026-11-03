import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { bookingApi, type Booking } from '../api/bookingApi';
import {
  Calendar,
  Search,
  Plus,
  Car,
  KeyRound,
} from 'lucide-react';
import { useConfirm } from '../../../components/common/ConfirmModal';
import {
  PageContainer,
  PageHeader,
  StatusBadge,
  Modal,
} from '../../../components/common';

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
        <div style={{ position: 'relative', width: '280px' }}>
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

      {/* ================= BOOKINGS TABLE ================= */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #ECEAEF',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          overflow: 'hidden',
          marginBottom: '24px',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#FAF9FB', borderBottom: '1px solid #ECEAEF', color: '#6B7280', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '14px 18px' }}>Booking Number</th>
                <th style={{ padding: '14px 18px' }}>Vehicle</th>
                <th style={{ padding: '14px 18px' }}>Customer</th>
                <th style={{ padding: '14px 18px' }}>Dates & Branches</th>
                <th style={{ padding: '14px 18px' }}>Daily Rate</th>
                <th style={{ padding: '14px 18px' }}>Total</th>
                <th style={{ padding: '14px 18px' }}>Status</th>
                <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#6B7280' }}>
                    Loading bookings...
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>
                    No bookings found matching criteria.
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr
                    key={b.id}
                    style={{ borderBottom: '1px solid #F3F4F6', transition: 'background-color 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FAF5FB')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '16px 18px', fontWeight: 800, color: '#1E0426' }}>
                      {b.bookingNumber}
                    </td>
                    <td style={{ padding: '16px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {b.vehicle.primaryImageUrl ? (
                          <img src={b.vehicle.primaryImageUrl} alt={b.vehicle.model} style={{ width: '42px', height: '28px', objectFit: 'contain' }} />
                        ) : (
                          <Car size={20} color="#6C1E84" />
                        )}
                        <div>
                          <div style={{ fontWeight: 700, color: '#111827' }}>{b.vehicle.brand} {b.vehicle.model}</div>
                          <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{b.vehicle.registrationNumber} • {b.vehicle.category.name}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 18px' }}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{b.customer.fullName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{b.customer.email}</div>
                    </td>
                    <td style={{ padding: '16px 18px' }}>
                      <div style={{ fontWeight: 600, color: '#374151', fontSize: '0.825rem' }}>
                        {formatDate(b.pickupDateTime)} → {formatDate(b.returnDateTime)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '2px' }}>
                        {b.pickupBranch.name} ({b.totalDays} days)
                      </div>
                    </td>
                    <td style={{ padding: '16px 18px', color: '#4B5563' }}>
                      ${Number(b.dailyRate).toFixed(2)}/day
                    </td>
                    <td style={{ padding: '16px 18px', fontWeight: 800, color: '#111827' }}>
                      ${Number(b.totalAmount).toFixed(2)}
                    </td>
                    <td style={{ padding: '16px 18px' }}>
                      {renderStatusPill(b.status)}
                    </td>
                    <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        {b.status === 'CONFIRMED' && (
                          <button
                            onClick={() => navigate(`/admin/rentals/handover/${b.id}`)}
                            title="Handover Vehicle"
                            style={{
                              backgroundColor: '#FAB826',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '6px 10px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              color: '#1C0324',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <KeyRound size={13} />
                            <span>Handover</span>
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedBooking(b)}
                          style={{
                            backgroundColor: '#F3F4F6',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            color: '#374151',
                            cursor: 'pointer',
                          }}
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderTop: '1px solid #ECEAEF',
            backgroundColor: '#FAF9FB',
            fontSize: '0.85rem',
            color: '#6B7280',
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
                padding: '6px 12px',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                opacity: page <= 1 ? 0.5 : 1,
              }}
            >
              Previous
            </button>
            <span style={{ fontWeight: 700, color: '#111827' }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                border: '1px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                borderRadius: '6px',
                padding: '6px 12px',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                opacity: page >= totalPages ? 0.5 : 1,
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
