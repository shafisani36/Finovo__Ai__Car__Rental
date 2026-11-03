import { useState, useEffect } from 'react';
import { customerApi } from '../api/customerApi';
import type { Customer } from '../api/customerApi';
import {
  Users,
  Search,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react';
import {
  PageContainer,
  PageHeader,
  StatCard,
  StatGrid,
  Modal,
} from '../../../components/common';

export function CustomersListPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async (search?: string) => {
    try {
      setLoading(true);
      const res = await customerApi.getCustomers(search);
      if (res.success) {
        setCustomers(res.customers);
      }
    } catch (err) {
      console.error('Failed to load customers', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadCustomers(searchQuery);
  };

  const handleToggleVerification = async (customer: Customer) => {
    try {
      setUpdatingId(customer.id);
      const newStatus = !customer.isLicenseVerified;
      const res = await customerApi.updateVerification(customer.id, newStatus);
      if (res.success) {
        setCustomers((prev) =>
          prev.map((c) => (c.id === customer.id ? { ...c, isLicenseVerified: newStatus } : c))
        );
        if (selectedCustomer?.id === customer.id) {
          setSelectedCustomer({ ...selectedCustomer, isLicenseVerified: newStatus });
        }
      }
    } catch (err) {
      alert('Failed to update driver license verification status');
    } finally {
      setUpdatingId(null);
    }
  };

  const totalCustomers = customers.length;
  const verifiedCount = customers.filter((c) => c.isLicenseVerified).length;
  const pendingCount = totalCustomers - verifiedCount;

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title="Customer Directory & Identity Verification"
        subtitle="Manage renter profiles, verify government-issued driver licenses, and review reservation history."
        breadcrumbs={[
          { label: 'Admin', to: '/admin/dashboard' },
          { label: 'Customers' },
        ]}
      />

      {/* KPI Stats Cards */}
      <StatGrid columns={3}>
        <StatCard
          icon={Users}
          label="Total Registered Renters"
          value={totalCustomers}
          variant="purple"
        />
        <StatCard
          icon={ShieldCheck}
          label="Verified Licenses"
          value={verifiedCount}
          variant="green"
        />
        <StatCard
          icon={ShieldAlert}
          label="Pending Review"
          value={pendingCount}
          variant={pendingCount > 0 ? 'amber' : 'green'}
        />
      </StatGrid>

      {/* Search Bar */}
      <form
        onSubmit={handleSearchSubmit}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          padding: '16px 20px',
          border: '1px solid #ECEAEF',
          display: 'flex',
          gap: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#F7F5F8',
            borderRadius: '10px',
            padding: '10px 14px',
            border: '1px solid #ECEAEF',
            flex: 1,
          }}
        >
          <Search size={18} color="#685D73" />
          <input
            type="text"
            placeholder="Search by name, email, phone, or license number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '0.9rem',
              width: '100%',
              color: '#1E0426',
            }}
          />
        </div>
        <button
          type="submit"
          style={{
            padding: '10px 22px',
            backgroundColor: '#1E0426',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          Search
        </button>
      </form>

      {/* Customers Table */}
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
            <div style={{ marginTop: '12px', fontWeight: 600 }}>Loading customer records...</div>
          </div>
        ) : customers.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#685D73' }}>
            <Users size={40} color="#D1D5DB" style={{ marginBottom: '12px' }} />
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1E0426' }}>No customers found</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#FAF9FB', borderBottom: '1px solid #ECEAEF', color: '#685D73' }}>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Customer Name</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Contact Details</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Driver License</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Verification Status</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Reservations</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    style={{
                      borderBottom: '1px solid #ECEAEF',
                      transition: 'background-color 0.15s',
                    }}
                  >
                    {/* Name */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: '#1E0426',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.8125rem',
                          }}
                        >
                          {c.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#1E0426' }}>{c.fullName}</div>
                          <div style={{ fontSize: '0.75rem', color: '#685D73' }}>
                            Joined {new Date(c.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ color: '#1E0426' }}>{c.email}</div>
                      <div style={{ fontSize: '0.75rem', color: '#685D73' }}>{c.phone || 'No phone provided'}</div>
                    </td>

                    {/* License */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 600, color: '#1E0426' }}>
                        {c.driverLicenseNumber || 'Not submitted'}
                      </div>
                      {c.licenseExpiryDate && (
                        <div style={{ fontSize: '0.75rem', color: '#685D73' }}>
                          Exp: {new Date(c.licenseExpiryDate).toLocaleDateString()}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '16px 20px' }}>
                      {c.isLicenseVerified ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: 'rgba(16, 185, 129, 0.12)',
                            color: '#059669',
                          }}
                        >
                          <CheckCircle2 size={12} />
                          VERIFIED
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: 'rgba(250, 184, 38, 0.15)',
                            color: '#B45309',
                          }}
                        >
                          <Clock size={12} />
                          PENDING
                        </span>
                      )}
                    </td>

                    {/* Bookings */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 700, color: '#1E0426' }}>{c.totalBookings} rentals</div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          onClick={() => setSelectedCustomer(c)}
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
                          History
                        </button>

                        <button
                          onClick={() => handleToggleVerification(c)}
                          disabled={updatingId === c.id}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: c.isLicenseVerified ? '#FFFFFF' : '#1E0426',
                            border: `1px solid ${c.isLicenseVerified ? '#ECEAEF' : '#1E0426'}`,
                            color: c.isLicenseVerified ? '#DC2626' : '#FFFFFF',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {c.isLicenseVerified ? 'Revoke' : 'Verify'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Booking History Modal */}
      {selectedCustomer && (
        <Modal
          isOpen={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          title={selectedCustomer.fullName}
          subtitle={`${selectedCustomer.email} • ${selectedCustomer.phone || 'No phone'}`}
          maxWidth="600px"
        >
          <div style={{ marginBottom: '16px', fontWeight: 700, color: '#1E0426' }}>
            Recent Booking History ({selectedCustomer.recentBookings?.length || 0})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
            {selectedCustomer.recentBookings && selectedCustomer.recentBookings.length > 0 ? (
              selectedCustomer.recentBookings.map((b) => (
                <div
                  key={b.id}
                  style={{
                    padding: '12px 14px',
                    backgroundColor: '#FAF9FB',
                    borderRadius: '10px',
                    border: '1px solid #ECEAEF',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: '#1E0426' }}>{b.bookingNumber}</div>
                    <div style={{ fontSize: '0.75rem', color: '#685D73' }}>
                      {b.vehicle.brand} {b.vehicle.model}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: '#1E0426' }}>${b.totalAmount.toFixed(2)}</div>
                    <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>{b.status}</div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: '#685D73' }}>
                No reservations recorded yet.
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button
              type="button"
              onClick={() => setSelectedCustomer(null)}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                backgroundColor: '#1E0426',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.875rem',
                border: 'none',
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
