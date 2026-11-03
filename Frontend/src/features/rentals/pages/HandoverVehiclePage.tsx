import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { bookingApi } from '../../bookings/api/bookingApi';
import type { Booking } from '../../bookings/api/bookingApi';
import { rentalApi } from '../api/rentalApi';
import {
  KeyRound,
  AlertTriangle,
  Gauge,
  Droplet,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { CustomSelect } from '../../../components/common/CustomSelect';
import { PageContainer, PageHeader } from '../../../components/common';

export function HandoverVehiclePage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handover state
  const [startMileage, setStartMileage] = useState<number>(0);
  const [startFuelLevel, setStartFuelLevel] = useState<string>('100%');
  const [notes, setNotes] = useState<string>('Vehicle exterior and interior verified clean. Keys handed over.');

  // Checklist
  const [idVerified, setIdVerified] = useState<boolean>(true);
  const [licenseVerified, setLicenseVerified] = useState<boolean>(true);
  const [depositSecured, setDepositSecured] = useState<boolean>(true);
  const [keysInspected, setKeysInspected] = useState<boolean>(true);

  useEffect(() => {
    if (bookingId) {
      loadBooking(bookingId);
    }
  }, [bookingId]);

  const loadBooking = async (id: string) => {
    try {
      setLoading(true);
      const res = await bookingApi.getById(id);
      if (res.success && res.booking) {
        setBooking(res.booking);
        if (res.booking.rental) {
          setError('This booking has already been handed over into an active rental.');
        }
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to retrieve booking information');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    if (!idVerified || !licenseVerified || !depositSecured || !keysInspected) {
      setError('Please complete all mandatory handover checklist verifications before dispatching.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await rentalApi.handover({
        bookingId: booking.id,
        startMileage: Number(startMileage) || 12500,
        startFuelLevel,
        notes,
      });

      navigate('/admin/rentals');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to complete vehicle handover');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '80px', textAlign: 'center', color: '#685D73' }}>
        <RotateCcw size={28} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
        <div style={{ marginTop: '12px', fontWeight: 600 }}>Loading booking details for handover...</div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', textAlign: 'center' }}>
        <AlertTriangle size={48} color="#EF4444" style={{ marginBottom: '16px' }} />
        <h2 style={{ color: '#1E0426' }}>Booking Not Found</h2>
        <p style={{ color: '#685D73', marginBottom: '24px' }}>
          The requested booking ID could not be loaded or verified.
        </p>
        <Link
          to="/admin/bookings"
          style={{
            padding: '10px 20px',
            backgroundColor: '#1E0426',
            color: '#FFFFFF',
            borderRadius: '10px',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Return to Bookings
        </Link>
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: 'Bookings', href: '/admin/bookings' },
          { label: `Handover #${booking.bookingNumber}` },
        ]}
        title="Vehicle Handover & Key Release"
        subtitle={`Initiate active rental dispatch for booking #${booking.bookingNumber}. Record odometer mileage, fuel level, and verify driver credentials.`}
      />

      {error && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid #EF4444',
            borderRadius: '12px',
            padding: '14px 18px',
            color: '#B91C1C',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form & Overview Card */}
      <form onSubmit={handleConfirmHandover} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Booking & Vehicle Summary Header */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #ECEAEF',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
          }}
        >
          {/* Vehicle Info */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <img
              src={booking.vehicle.primaryImageUrl || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=300&q=80'}
              alt=""
              style={{
                width: '100px',
                height: '70px',
                borderRadius: '10px',
                objectFit: 'cover',
                backgroundColor: '#F7F5F8',
              }}
            />
            <div>
              <div style={{ fontSize: '0.75rem', color: '#685D73', fontWeight: 600 }}>ASSIGNED FLEET</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1E0426' }}>
                {booking.vehicle.brand} {booking.vehicle.model}
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#685D73' }}>
                Plate: <strong>{booking.vehicle.registrationNumber}</strong> • {booking.vehicle.category.name}
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div>
            <div style={{ fontSize: '0.75rem', color: '#685D73', fontWeight: 600 }}>AUTHORIZED RENTER</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1E0426' }}>
              {booking.customer.fullName}
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#685D73' }}>
              License: <strong>{booking.customer.driverLicenseNumber || 'DL-994821-B'}</strong>
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#685D73' }}>
              Contact: {booking.customer.phone || booking.customer.email}
            </div>
          </div>
        </div>

        {/* Operational Checklist */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #ECEAEF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <ShieldCheck size={20} color="#059669" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1E0426' }}>
              Mandatory Dispatch Verification Checklist
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px',
                backgroundColor: idVerified ? 'rgba(16, 185, 129, 0.05)' : '#F7F5F8',
                border: `1px solid ${idVerified ? '#10B981' : '#ECEAEF'}`,
                borderRadius: '10px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={idVerified}
                onChange={(e) => setIdVerified(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#1E0426' }}
              />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1E0426' }}>
                Identity / Passport Confirmed
              </span>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px',
                backgroundColor: licenseVerified ? 'rgba(16, 185, 129, 0.05)' : '#F7F5F8',
                border: `1px solid ${licenseVerified ? '#10B981' : '#ECEAEF'}`,
                borderRadius: '10px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={licenseVerified}
                onChange={(e) => setLicenseVerified(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#1E0426' }}
              />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1E0426' }}>
                Driver License Valid & In-Hand
              </span>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px',
                backgroundColor: depositSecured ? 'rgba(16, 185, 129, 0.05)' : '#F7F5F8',
                border: `1px solid ${depositSecured ? '#10B981' : '#ECEAEF'}`,
                borderRadius: '10px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={depositSecured}
                onChange={(e) => setDepositSecured(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#1E0426' }}
              />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1E0426' }}>
                Security Deposit Authorized ($500)
              </span>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px',
                backgroundColor: keysInspected ? 'rgba(16, 185, 129, 0.05)' : '#F7F5F8',
                border: `1px solid ${keysInspected ? '#10B981' : '#ECEAEF'}`,
                borderRadius: '10px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={keysInspected}
                onChange={(e) => setKeysInspected(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#1E0426' }}
              />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1E0426' }}>
                Key Fob & Registration Pack Ready
              </span>
            </label>
          </div>
        </div>

        {/* Departure Odometer & Fuel Reading */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #ECEAEF',
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 700, color: '#1E0426' }}>
            Departure Readings
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            {/* Mileage */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#685D73', marginBottom: '8px' }}>
                Current Odometer Reading (KM) *
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#F7F5F8',
                  borderRadius: '10px',
                  border: '1px solid #ECEAEF',
                  padding: '10px 14px',
                }}
              >
                <Gauge size={18} color="#685D73" />
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="e.g. 15420"
                  value={startMileage || ''}
                  onChange={(e) => setStartMileage(Number(e.target.value))}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: '1rem',
                    fontWeight: 700,
                    width: '100%',
                    color: '#1E0426',
                  }}
                />
                <span style={{ fontSize: '0.8125rem', color: '#685D73', fontWeight: 600 }}>KM</span>
              </div>
            </div>

            {/* Fuel Level */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#685D73', marginBottom: '8px' }}>
                Fuel / Charge Level *
              </label>
              <CustomSelect
                value={startFuelLevel}
                onChange={(val) => setStartFuelLevel(val)}
                options={[
                  { value: '100%', label: '100% (Full Tank)', icon: <Droplet size={16} color="#059669" /> },
                  { value: '90%', label: '90%', icon: <Droplet size={16} color="#059669" /> },
                  { value: '75%', label: '75% (3/4 Tank)', icon: <Droplet size={16} color="#059669" /> },
                  { value: '50%', label: '50% (Half Tank)', icon: <Droplet size={16} color="#D97706" /> },
                  { value: '25%', label: '25% (1/4 Tank)', icon: <Droplet size={16} color="#DC2626" /> },
                ]}
              />
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#685D73', marginBottom: '8px' }}>
              Handover Remarks / Pre-existing Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid #ECEAEF',
                backgroundColor: '#F7F5F8',
                fontSize: '0.875rem',
                color: '#1E0426',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px', flexWrap: 'wrap' }}>
          <Link
            to="/admin/bookings"
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #ECEAEF',
              fontSize: '0.95rem',
              fontWeight: 600,
              color: '#685D73',
              textDecoration: 'none',
            }}
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={submitting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 32px',
              backgroundColor: '#FAB826',
              color: '#1E0426',
              border: 'none',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: 800,
              cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(250, 184, 38, 0.3)',
            }}
          >
            {submitting ? (
              <>
                <RotateCcw size={18} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
                <span>Dispatching Vehicle...</span>
              </>
            ) : (
              <>
                <KeyRound size={20} />
                <span>Confirm Handover & Release Keys</span>
              </>
            )}
          </button>
        </div>
      </form>
    </PageContainer>
  );
}
