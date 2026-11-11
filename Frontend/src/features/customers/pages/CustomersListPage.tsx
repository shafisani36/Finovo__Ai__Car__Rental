import { useState, useEffect } from 'react';
import { customerApi } from '../api/customerApi';
import type { Customer, CreateCustomerPayload, UpdateCustomerPayload } from '../api/customerApi';
import {
  Users,
  Search,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Mail,
  Phone,
  Car,
  AlertCircle,
} from 'lucide-react';
import {
  PageContainer,
  PageHeader,
  StatCard,
  StatGrid,
  Modal,
} from '../../../components/common';
import { useConfirm } from '../../../components/common/ConfirmModal';

export function CustomersListPage() {
  const { confirm } = useConfirm();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VERIFIED' | 'PENDING'>('ALL');

  // Modals state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form states
  const [formData, setFormData] = useState<CreateCustomerPayload>({
    fullName: '',
    email: '',
    phone: '',
    driverLicenseNumber: '',
    licenseExpiryDate: '',
    isLicenseVerified: false,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async (search?: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await customerApi.getCustomers(search);
      if (res.success) {
        setCustomers(res.customers || []);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to load customers list');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadCustomers(searchQuery);
  };

  const handleOpenAddModal = () => {
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      driverLicenseNumber: '',
      licenseExpiryDate: '',
      isLicenseVerified: false,
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({
      fullName: c.fullName,
      email: c.email,
      phone: c.phone || '',
      driverLicenseNumber: c.driverLicenseNumber || '',
      licenseExpiryDate: c.licenseExpiryDate ? c.licenseExpiryDate.split('T')[0] : '',
      isLicenseVerified: c.isLicenseVerified,
    });
    setFormError(null);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.email.trim()) {
      setFormError('Customer Full Name and Email are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      const res = await customerApi.createCustomer(formData);
      if (res.success && res.customer) {
        setIsAddModalOpen(false);
        await loadCustomers();
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setFormError(e.message || 'Failed to create customer profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    if (!formData.fullName.trim() || !formData.email.trim()) {
      setFormError('Customer Full Name and Email are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      const payload: UpdateCustomerPayload = {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone || undefined,
        driverLicenseNumber: formData.driverLicenseNumber || undefined,
        licenseExpiryDate: formData.licenseExpiryDate || undefined,
        isLicenseVerified: formData.isLicenseVerified,
      };
      const res = await customerApi.updateCustomer(editingCustomer.id, payload);
      if (res.success && res.customer) {
        setEditingCustomer(null);
        await loadCustomers();
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setFormError(e.message || 'Failed to update customer details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCustomer = async (c: Customer) => {
    const confirmed = await confirm({
      title: `Delete Customer ${c.fullName}?`,
      message: `Are you sure you want to delete customer account (${c.email})? This action cannot be undone.`,
      confirmText: 'Delete Customer',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      const res = await customerApi.deleteCustomer(c.id);
      if (res.success) {
        setCustomers((prev) => prev.filter((item) => item.id !== c.id));
        if (selectedCustomer?.id === c.id) {
          setSelectedCustomer(null);
        }
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(e.message || 'Failed to delete customer record.');
    }
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
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(e.message || 'Failed to update driver license verification status');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    if (statusFilter === 'VERIFIED') return c.isLicenseVerified;
    if (statusFilter === 'PENDING') return !c.isLicenseVerified;
    return true;
  });

  const totalCustomers = customers.length;
  const verifiedCount = customers.filter((c) => c.isLicenseVerified).length;
  const pendingCount = totalCustomers - verifiedCount;

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title="Customer Directory & CRM Management"
        subtitle="Manage renter accounts, verify driver licenses, add or edit customer records, and inspect rental history."
        breadcrumbs={[
          { label: 'Admin', to: '/admin/dashboard' },
          { label: 'Customers' },
        ]}
        actions={
          <button
            onClick={handleOpenAddModal}
            style={{
              backgroundColor: '#FAB826',
              color: '#1A0322',
              fontWeight: 700,
              fontSize: '0.9rem',
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(250, 184, 38, 0.35)',
              transition: 'all 0.2s ease',
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add Customer</span>
          </button>
        }
      />

      {/* KPI Stats Cards */}
      <StatGrid columns={3}>
        <StatCard
          icon={Users}
          label="Total Registered Renters"
          value={totalCustomers}
          variant="purple"
          subtext="Active accounts in database"
        />
        <StatCard
          icon={ShieldCheck}
          label="Verified Driver Licenses"
          value={verifiedCount}
          variant="green"
          subtext="Approved for instant car handover"
        />
        <StatCard
          icon={ShieldAlert}
          label="Pending Review"
          value={pendingCount}
          variant={pendingCount > 0 ? 'amber' : 'green'}
          subtext="Awaiting administrative verification"
        />
      </StatGrid>

      {/* Search & Filter Toolbar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          padding: '16px 20px',
          border: '1px solid #ECEAEF',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#F7F5F8',
            borderRadius: '10px',
            padding: '8px 14px',
            border: '1px solid #ECEAEF',
            flex: '1 1 320px',
            maxWidth: '520px',
          }}
        >
          <Search size={18} color="#685D73" />
          <input
            type="text"
            placeholder="Search by name, email, phone, or license..."
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
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                loadCustomers('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#685D73',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              Clear
            </button>
          )}
          <button
            type="submit"
            style={{
              padding: '6px 14px',
              backgroundColor: '#1E0426',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            Search
          </button>
        </form>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['ALL', 'VERIFIED', 'PENDING'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setStatusFilter(mode)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: `1px solid ${statusFilter === mode ? '#1E0426' : '#ECEAEF'}`,
                backgroundColor: statusFilter === mode ? '#1E0426' : '#FFFFFF',
                color: statusFilter === mode ? '#FFFFFF' : '#685D73',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {mode === 'ALL' ? 'All Customers' : mode === 'VERIFIED' ? 'Verified' : 'Pending Review'}
            </button>
          ))}
        </div>
      </div>

      {/* Customers Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #ECEAEF',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        }}
      >
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#685D73' }}>
            <RotateCcw size={26} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
            <div style={{ marginTop: '12px', fontWeight: 600 }}>Loading customer records...</div>
          </div>
        ) : error ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <AlertCircle size={40} color="#DC2626" style={{ marginBottom: '12px' }} />
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1E0426' }}>
              Error loading customers
            </div>
            <p style={{ color: '#685D73', fontSize: '0.875rem', marginBottom: '16px' }}>{error}</p>
            <button
              onClick={() => loadCustomers(searchQuery)}
              style={{
                padding: '8px 18px',
                backgroundColor: '#1E0426',
                color: '#FFFFFF',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#685D73' }}>
            <Users size={40} color="#D1D5DB" style={{ marginBottom: '12px' }} />
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1E0426' }}>No customers found</div>
            <p style={{ fontSize: '0.875rem', color: '#685D73', marginTop: '4px' }}>
              Try adjusting your search criteria or register a new customer profile.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#FAF9FB', borderBottom: '1px solid #ECEAEF', color: '#685D73' }}>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Customer Name</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Contact Details</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Driver License</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Bookings</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c) => (
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
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            backgroundColor: '#1E0426',
                            color: '#FAB826',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                          }}
                        >
                          {c.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#1E0426' }}>{c.fullName}</div>
                          <div style={{ fontSize: '0.75rem', color: '#685D73' }}>
                            Member since {new Date(c.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1E0426' }}>
                        <Mail size={13} color="#685D73" />
                        <span>{c.email}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#685D73', marginTop: '4px' }}>
                        <Phone size={12} color="#685D73" />
                        <span>{c.phone || 'No phone'}</span>
                      </div>
                    </td>

                    {/* License */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 600, color: '#1E0426' }}>
                        {c.driverLicenseNumber || 'Not submitted'}
                      </div>
                      {c.licenseExpiryDate && (
                        <div style={{ fontSize: '0.75rem', color: '#685D73', marginTop: '2px' }}>
                          Exp: {new Date(c.licenseExpiryDate).toLocaleDateString()}
                        </div>
                      )}
                    </td>

                    {/* Verification Status */}
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

                    {/* Bookings Count */}
                    <td style={{ padding: '16px 20px' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: '#1E0432',
                          backgroundColor: '#F5EEF8',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                        }}
                      >
                        {c.totalBookings} rentals
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        {/* View Details */}
                        <button
                          onClick={() => setSelectedCustomer(c)}
                          title="View Details & History"
                          style={{
                            padding: '6px 10px',
                            backgroundColor: '#F7F5F8',
                            border: '1px solid #ECEAEF',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#1E0426',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => handleOpenEditModal(c)}
                          title="Edit Customer"
                          style={{
                            padding: '6px 10px',
                            backgroundColor: '#F7F5F8',
                            border: '1px solid #ECEAEF',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#1E0426',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Pencil size={13} />
                          <span>Edit</span>
                        </button>

                        {/* Toggle Verify */}
                        <button
                          onClick={() => handleToggleVerification(c)}
                          disabled={updatingId === c.id}
                          title={c.isLicenseVerified ? 'Revoke license' : 'Verify license'}
                          style={{
                            padding: '6px 10px',
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

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteCustomer(c)}
                          title="Delete Customer Profile"
                          style={{
                            padding: '6px 8px',
                            backgroundColor: '#FEF2F2',
                            border: '1px solid #FEE2E2',
                            color: '#DC2626',
                            borderRadius: '8px',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={13} />
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

      {/* Customer Booking History & Profile Modal */}
      {selectedCustomer && (
        <Modal
          isOpen={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          title={selectedCustomer.fullName}
          subtitle={`${selectedCustomer.email} • ${selectedCustomer.phone || 'No phone provided'}`}
          maxWidth="680px"
        >
          {/* Key details summary card */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              backgroundColor: '#FAF9FB',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid #ECEAEF',
              marginBottom: '20px',
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', color: '#685D73', display: 'block' }}>Driver License</span>
              <strong style={{ fontSize: '0.9rem', color: '#1E0426' }}>
                {selectedCustomer.driverLicenseNumber || 'Not submitted'}
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: '#685D73', display: 'block' }}>License Status</span>
              <strong
                style={{
                  fontSize: '0.85rem',
                  color: selectedCustomer.isLicenseVerified ? '#059669' : '#B45309',
                }}
              >
                {selectedCustomer.isLicenseVerified ? 'Verified Driver' : 'Pending Verification'}
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: '#685D73', display: 'block' }}>Expiry Date</span>
              <strong style={{ fontSize: '0.9rem', color: '#1E0426' }}>
                {selectedCustomer.licenseExpiryDate
                  ? new Date(selectedCustomer.licenseExpiryDate).toLocaleDateString()
                  : 'N/A'}
              </strong>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ fontWeight: 700, color: '#1E0426', fontSize: '0.95rem' }}>
              Reservation History ({selectedCustomer.recentBookings?.length || 0})
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto' }}>
            {selectedCustomer.recentBookings && selectedCustomer.recentBookings.length > 0 ? (
              selectedCustomer.recentBookings.map((b) => (
                <div
                  key={b.id}
                  style={{
                    padding: '14px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '10px',
                    border: '1px solid #ECEAEF',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: '#1E0426',
                        color: '#FAB826',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Car size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#1E0426' }}>{b.bookingNumber}</div>
                      <div style={{ fontSize: '0.75rem', color: '#685D73' }}>
                        {b.vehicle?.brand} {b.vehicle?.model} • {new Date(b.pickupDateTime).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: '#1E0426' }}>${Number(b.totalAmount).toFixed(2)}</div>
                    <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>{b.status}</div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '30px', textAlign: 'center', color: '#685D73', background: '#F9F8FA', borderRadius: '10px' }}>
                No reservation history recorded for this customer yet.
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={() => setSelectedCustomer(null)}
              style={{
                padding: '10px 22px',
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

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Add New Customer Profile"
          subtitle="Register a new renter with driver license details for immediate fleet reservation access."
          maxWidth="560px"
        >
          <form onSubmit={handleCreateCustomer}>
            {formError && (
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FEE2E2',
                  color: '#DC2626',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  marginBottom: '16px',
                }}
              >
                {formError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1E0426', marginBottom: '6px' }}>
                  Full Legal Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Johnathan Smith"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #ECEAEF',
                    outline: 'none',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1E0426', marginBottom: '6px' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #ECEAEF',
                    outline: 'none',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1E0426', marginBottom: '6px' }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+1 555-0199"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #ECEAEF',
                    outline: 'none',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1E0426', marginBottom: '6px' }}>
                    Driver License #
                  </label>
                  <input
                    type="text"
                    placeholder="DL-8837190"
                    value={formData.driverLicenseNumber}
                    onChange={(e) => setFormData({ ...formData, driverLicenseNumber: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #ECEAEF',
                      outline: 'none',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1E0426', marginBottom: '6px' }}>
                    License Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formData.licenseExpiryDate}
                    onChange={(e) => setFormData({ ...formData, licenseExpiryDate: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #ECEAEF',
                      outline: 'none',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={formData.isLicenseVerified}
                    onChange={(e) => setFormData({ ...formData, isLicenseVerified: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: '#1E0426' }}
                  />
                  <span>Mark driver license as verified immediately</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: '1px solid #ECEAEF',
                  backgroundColor: '#FFFFFF',
                  color: '#685D73',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  padding: '10px 22px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#1E0426',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: isSubmitting ? 'wait' : 'pointer',
                }}
              >
                {isSubmitting ? 'Creating...' : 'Create Customer'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <Modal
          isOpen={!!editingCustomer}
          onClose={() => setEditingCustomer(null)}
          title={`Edit Customer: ${editingCustomer.fullName}`}
          subtitle="Update customer profile information, contact numbers, or license verification."
          maxWidth="560px"
        >
          <form onSubmit={handleUpdateCustomer}>
            {formError && (
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FEE2E2',
                  color: '#DC2626',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  marginBottom: '16px',
                }}
              >
                {formError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1E0426', marginBottom: '6px' }}>
                  Full Legal Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #ECEAEF',
                    outline: 'none',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1E0426', marginBottom: '6px' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #ECEAEF',
                    outline: 'none',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1E0426', marginBottom: '6px' }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #ECEAEF',
                    outline: 'none',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1E0426', marginBottom: '6px' }}>
                    Driver License #
                  </label>
                  <input
                    type="text"
                    value={formData.driverLicenseNumber}
                    onChange={(e) => setFormData({ ...formData, driverLicenseNumber: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #ECEAEF',
                      outline: 'none',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1E0426', marginBottom: '6px' }}>
                    License Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formData.licenseExpiryDate}
                    onChange={(e) => setFormData({ ...formData, licenseExpiryDate: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #ECEAEF',
                      outline: 'none',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={formData.isLicenseVerified}
                    onChange={(e) => setFormData({ ...formData, isLicenseVerified: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: '#1E0426' }}
                  />
                  <span>Driver license is verified</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: '1px solid #ECEAEF',
                  backgroundColor: '#FFFFFF',
                  color: '#685D73',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  padding: '10px 22px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#1E0426',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: isSubmitting ? 'wait' : 'pointer',
                }}
              >
                {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </PageContainer>
  );
}
