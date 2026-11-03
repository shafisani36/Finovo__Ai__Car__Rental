import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { rentalApi } from '../api/rentalApi';
import type { RentalRecord } from '../api/rentalApi';
import {
  KeyRound,
  Search,
  RotateCcw,
  ShieldAlert,
  CheckCircle2,
  Car,
  Gauge,
  Droplet,
  MapPin,
  Calendar,
} from 'lucide-react';
import {
  PageContainer,
  PageHeader,
  StatCard,
  StatGrid,
  StatusBadge,
  Modal,
} from '../../../components/common';

export function RentalsListPage() {
  const [rentals, setRentals] = useState<RentalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'RETURNED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRental, setSelectedRental] = useState<RentalRecord | null>(null);

  useEffect(() => {
    loadRentals();
  }, [statusFilter]);

  const loadRentals = async () => {
    try {
      setLoading(true);
      const res = await rentalApi.getRentals(statusFilter);
      if (res.success) {
        setRentals(res.rentals);
      }
    } catch (err) {
      console.error('Failed to load rentals', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRentals = rentals.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.booking.bookingNumber.toLowerCase().includes(q) ||
      r.booking.customer.fullName.toLowerCase().includes(q) ||
      r.vehicle.brand.toLowerCase().includes(q) ||
      r.vehicle.model.toLowerCase().includes(q) ||
      r.vehicle.registrationNumber.toLowerCase().includes(q)
    );
  });

  const activeCount = rentals.filter((r) => r.status === 'ACTIVE').length;
  const returnedCount = rentals.filter((r) => r.status === 'RETURNED').length;

  return (
    <PageContainer>
      {/* Header & Actions */}
      <PageHeader
        title="Rental Operations & Handover"
        subtitle="Track active vehicles on the road, manage pickup handovers, and process returns with automated odometer verification."
        breadcrumbs={[
          { label: 'Admin', to: '/admin/dashboard' },
          { label: 'Rentals' },
        ]}
        actions={
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link
              to="/admin/bookings"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                backgroundColor: '#FFFFFF',
                color: '#1E0426',
                border: '1px solid #ECEAEF',
                borderRadius: '10px',
                fontSize: '0.875rem',
                fontWeight: 600,
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              <Calendar size={16} />
              <span>View Bookings</span>
            </Link>
            <Link
              to="/admin/inspections/new"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                backgroundColor: '#FAB826',
                color: '#1E0426',
                border: 'none',
                borderRadius: '10px',
                fontSize: '0.875rem',
                fontWeight: 700,
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              <ShieldAlert size={16} />
              <span>AI Vehicle Scan</span>
            </Link>
          </div>
        }
      />

      {/* KPI Stats Cards */}
      <StatGrid columns={3}>
        <StatCard
          icon={KeyRound}
          label="Active on Road"
          value={activeCount}
          variant="green"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed Returns"
          value={returnedCount}
          variant="blue"
        />
        <StatCard
          icon={Car}
          label="Total Fleet Tracked"
          value={rentals.length}
          variant="amber"
        />
      </StatGrid>

      {/* Filter Tabs & Search Bar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          padding: '16px 20px',
          border: '1px solid #ECEAEF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['ALL', 'ACTIVE', 'RETURNED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: statusFilter === tab ? '#1E0426' : '#F7F5F8',
                color: statusFilter === tab ? '#FFFFFF' : '#685D73',
                fontWeight: 600,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {tab === 'ALL' ? 'All Rentals' : tab === 'ACTIVE' ? 'Active on Road' : 'Returned'}
            </button>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#F7F5F8',
            borderRadius: '10px',
            padding: '8px 14px',
            border: '1px solid #ECEAEF',
            width: '320px',
          }}
        >
          <Search size={16} color="#685D73" />
          <input
            type="text"
            placeholder="Search booking #, customer, car..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '0.875rem',
              width: '100%',
              color: '#1E0426',
            }}
          />
        </div>
      </div>

      {/* Rentals Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #ECEAEF',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#685D73' }}>
            <RotateCcw size={24} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
            <div style={{ marginTop: '12px', fontWeight: 600 }}>Loading rental operations...</div>
          </div>
        ) : filteredRentals.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#685D73' }}>
            <KeyRound size={40} color="#D1D5DB" style={{ marginBottom: '12px' }} />
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1E0426' }}>No rental agreements found</div>
            <p style={{ margin: '6px 0 0', fontSize: '0.875rem' }}>
              Confirm confirmed bookings to initiate a vehicle handover and generate rental agreements.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#FAF9FB', borderBottom: '1px solid #ECEAEF', color: '#685D73' }}>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Rental / Booking</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Vehicle</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Customer</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Dispatched</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Odometer & Fuel</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRentals.map((rental) => {
                  const isActive = rental.status === 'ACTIVE';
                  return (
                    <tr
                      key={rental.id}
                      style={{
                        borderBottom: '1px solid #ECEAEF',
                        transition: 'background-color 0.15s',
                      }}
                    >
                      {/* Booking Info */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 700, color: '#1E0426' }}>{rental.booking.bookingNumber}</div>
                        <div style={{ fontSize: '0.75rem', color: '#685D73', marginTop: '2px' }}>
                          ID: {rental.id.slice(0, 8)}...
                        </div>
                      </td>

                      {/* Vehicle */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img
                            src={rental.vehicle.primaryImageUrl || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=120&q=80'}
                            alt=""
                            style={{
                              width: '46px',
                              height: '32px',
                              borderRadius: '6px',
                              objectFit: 'cover',
                              backgroundColor: '#ECEAEF',
                            }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, color: '#1E0426' }}>
                              {rental.vehicle.brand} {rental.vehicle.model}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#685D73' }}>
                              {rental.vehicle.registrationNumber} • {rental.vehicle.category?.name || 'Standard'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Customer */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 600, color: '#1E0426' }}>{rental.booking.customer.fullName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#685D73' }}>{rental.booking.customer.phone || rental.booking.customer.email}</div>
                      </td>

                      {/* Dispatched */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ color: '#1E0426', fontWeight: 600 }}>
                          {new Date(rental.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#685D73', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={12} />
                          {rental.booking.pickupBranch.name}
                        </div>
                      </td>

                      {/* Odometer & Fuel */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8125rem', color: '#1E0426', fontWeight: 600 }}>
                            <Gauge size={14} color="#685D73" />
                            {rental.startMileage.toLocaleString()} km
                            {rental.endMileage ? ` → ${rental.endMileage.toLocaleString()} km` : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#059669', marginTop: '2px' }}>
                          <Droplet size={12} />
                          Fuel: {rental.startFuelLevel} {rental.endFuelLevel ? `(returned ${rental.endFuelLevel})` : ''}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '16px 20px' }}>
                        <StatusBadge status={rental.status} />
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            onClick={() => setSelectedRental(rental)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#F7F5F8',
                              border: '1px solid #ECEAEF',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: '#1E0426',
                              cursor: 'pointer',
                            }}
                          >
                            Details
                          </button>

                          {isActive && (
                            <Link
                              to={`/admin/rentals/return/${rental.id}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 12px',
                                backgroundColor: '#1E0426',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: '#FFFFFF',
                                textDecoration: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              <RotateCcw size={13} />
                              <span>Process Return</span>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rental Details Modal */}
      {selectedRental && (
        <Modal
          isOpen={!!selectedRental}
          onClose={() => setSelectedRental(null)}
          title={`Rental Agreement #${selectedRental.booking.bookingNumber}`}
          subtitle={`Status: ${selectedRental.status} • Rental ID: ${selectedRental.id}`}
          maxWidth="640px"
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div style={{ padding: '14px', backgroundColor: '#FAF9FB', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.75rem', color: '#685D73', fontWeight: 600 }}>CUSTOMER</div>
              <div style={{ fontWeight: 700, color: '#1E0426', marginTop: '4px' }}>
                {selectedRental.booking.customer.fullName}
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#685D73' }}>
                {selectedRental.booking.customer.email}
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#685D73' }}>
                License: {selectedRental.booking.customer.driverLicenseNumber || 'Not provided'}
              </div>
            </div>

            <div style={{ padding: '14px', backgroundColor: '#FAF9FB', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.75rem', color: '#685D73', fontWeight: 600 }}>VEHICLE ASSIGNED</div>
              <div style={{ fontWeight: 700, color: '#1E0426', marginTop: '4px' }}>
                {selectedRental.vehicle.brand} {selectedRental.vehicle.model} ({selectedRental.vehicle.year})
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#685D73' }}>
                Plate: {selectedRental.vehicle.registrationNumber}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
            <div style={{ padding: '12px', border: '1px solid #ECEAEF', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: '#685D73' }}>Start Mileage</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1E0426', marginTop: '2px' }}>
                {selectedRental.startMileage.toLocaleString()} km
              </div>
            </div>
            <div style={{ padding: '12px', border: '1px solid #ECEAEF', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: '#685D73' }}>Start Fuel Level</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#059669', marginTop: '2px' }}>
                {selectedRental.startFuelLevel}
              </div>
            </div>
            <div style={{ padding: '12px', border: '1px solid #ECEAEF', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: '#685D73' }}>Dispatched At</div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1E0426', marginTop: '4px' }}>
                {new Date(selectedRental.startedAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {selectedRental.status === 'RETURNED' && (
            <div style={{ padding: '14px', backgroundColor: 'rgba(16, 185, 129, 0.08)', borderRadius: '10px', marginBottom: '20px' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#059669' }}>Return Recorded</div>
              <div style={{ fontSize: '0.875rem', color: '#1E0426', marginTop: '4px' }}>
                End Mileage: <strong>{selectedRental.endMileage?.toLocaleString()} km</strong> (Distance:{' '}
                <strong>{((selectedRental.endMileage || 0) - selectedRental.startMileage).toLocaleString()} km</strong>)
                • End Fuel: <strong>{selectedRental.endFuelLevel}</strong>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setSelectedRental(null)}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                backgroundColor: '#F7F5F8',
                border: '1px solid #ECEAEF',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Close
            </button>

            {selectedRental.status === 'ACTIVE' && (
              <Link
                to={`/admin/rentals/return/${selectedRental.id}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  backgroundColor: '#1E0426',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                }}
              >
                <RotateCcw size={16} />
                <span>Proceed to Return</span>
              </Link>
            )}
          </div>
        </Modal>
      )}
    </PageContainer>
  );
}
