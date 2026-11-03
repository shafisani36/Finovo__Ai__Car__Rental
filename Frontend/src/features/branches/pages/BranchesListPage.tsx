import { useState, useEffect } from 'react';
import { branchApi } from '../api/branchApi';
import type { Branch, CreateBranchPayload } from '../api/branchApi';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Clock,
  Car,
  Plus,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import {
  PageContainer,
  PageHeader,
  Modal,
} from '../../../components/common';

export function BranchesListPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateBranchPayload>({
    name: '',
    code: '',
    city: '',
    address: '',
    phone: '',
    email: '',
    openingHours: '07:00 - 22:00 (Daily)',
  });

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      setLoading(true);
      const res = await branchApi.getBranches();
      if (res.success) {
        setBranches(res.branches);
      }
    } catch (err) {
      console.error('Failed to load branches', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await branchApi.createBranch(formData);
      if (res.success) {
        setShowAddModal(false);
        setFormData({
          name: '',
          code: '',
          city: '',
          address: '',
          phone: '',
          email: '',
          openingHours: '07:00 - 22:00 (Daily)',
        });
        loadBranches();
      }
    } catch (err) {
      alert('Failed to register new branch');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title="Operational Branches & Hubs"
        subtitle="Manage physical pick-up and drop-off stations, terminal logistics, and localized fleet allocations."
        breadcrumbs={[
          { label: 'Admin', to: '/admin/dashboard' },
          { label: 'Branches' },
        ]}
        actions={
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 22px',
              backgroundColor: '#1E0426',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Plus size={18} />
            <span>Add New Branch</span>
          </button>
        }
      />

      {/* Branches Grid */}
      {loading ? (
        <div style={{ padding: '80px', textAlign: 'center', color: '#685D73' }}>
          <RotateCcw size={28} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
          <div style={{ marginTop: '12px', fontWeight: 600 }}>Loading branch facilities...</div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '20px',
          }}
        >
          {branches.map((b) => (
            <div
              key={b.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #ECEAEF',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        backgroundColor: '#FAF9FB',
                        border: '1px solid #ECEAEF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#1E0426',
                      }}
                    >
                      <Building2 size={22} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1E0426' }}>
                        {b.name}
                      </h3>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#B45309',
                          backgroundColor: 'rgba(250, 184, 38, 0.2)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        CODE: {b.code}
                      </span>
                    </div>
                  </div>

                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      color: '#059669',
                    }}
                  >
                    <CheckCircle2 size={12} />
                    Active Hub
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem', color: '#685D73', marginTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={16} color="#1E0426" />
                    <span>{b.address || 'Address on file'}, {b.city}</span>
                  </div>
                  {b.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Phone size={16} color="#1E0426" />
                      <span>{b.phone}</span>
                    </div>
                  )}
                  {b.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Mail size={16} color="#1E0426" />
                      <span>{b.email}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={16} color="#1E0426" />
                    <span>{b.openingHours || '08:00 - 20:00 Daily'}</span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  borderTop: '1px solid #ECEAEF',
                  paddingTop: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', fontWeight: 700, color: '#1E0426' }}>
                  <Car size={16} color="#FAB826" />
                  <span>{b._count?.vehicles || 0} Vehicles Stationed</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Branch Modal */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Add New Operational Branch"
          subtitle="Register a new physical pick-up and drop-off facility."
          maxWidth="560px"
        >
          <form onSubmit={handleCreateBranch} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#685D73', marginBottom: '6px' }}>
                  Branch Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. West Coast Hub"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #ECEAEF',
                    backgroundColor: '#F7F5F8',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#685D73', marginBottom: '6px' }}>
                  Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WCH-01"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #ECEAEF',
                    backgroundColor: '#F7F5F8',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#685D73', marginBottom: '6px' }}>
                  City *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. San Francisco"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #ECEAEF',
                    backgroundColor: '#F7F5F8',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#685D73', marginBottom: '6px' }}>
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="+1 (555) 019-2831"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #ECEAEF',
                    backgroundColor: '#F7F5F8',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#685D73', marginBottom: '6px' }}>
                Street Address
              </label>
              <input
                type="text"
                placeholder="e.g. 450 Airport Concourse Way, Bay 3"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #ECEAEF',
                  backgroundColor: '#F7F5F8',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#685D73', marginBottom: '6px' }}>
                Operating Schedule
              </label>
              <input
                type="text"
                value={formData.openingHours || ''}
                onChange={(e) => setFormData({ ...formData, openingHours: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #ECEAEF',
                  backgroundColor: '#F7F5F8',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #ECEAEF',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  backgroundColor: '#1E0426',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? 'Creating...' : 'Register Hub'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </PageContainer>
  );
}
