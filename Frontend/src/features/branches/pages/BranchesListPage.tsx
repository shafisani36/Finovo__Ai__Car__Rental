import type { CSSProperties } from 'react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  alertDialog,
} from '../../../components/common';

const LABEL_STYLE: CSSProperties = { display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#685D73', marginBottom: '6px' };
const INPUT_STYLE: CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ECEAEF', backgroundColor: '#F7F5F8', boxSizing: 'border-box' };

export function BranchesListPage() {
  const { t } = useTranslation();
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
      void alertDialog({ title: t('common.errorTitle'), message: t('adminPages.branches.errCreate'), variant: 'danger', confirmText: t('common.actions.close') });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title={t('adminPages.branches.title')}
        subtitle={t('adminPages.branches.subtitle')}
        breadcrumbs={[
          { label: t('adminPages.branches.crumbAdmin'), to: '/admin/dashboard' },
          { label: t('adminPages.branches.crumb') },
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
            <span>{t('adminPages.branches.add')}</span>
          </button>
        }
      />

      {/* Branches Grid */}
      {loading ? (
        <div style={{ padding: '80px', textAlign: 'center', color: '#685D73' }}>
          <RotateCcw size={28} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
          <div style={{ marginTop: '12px', fontWeight: 600 }}>{t('adminPages.branches.loading')}</div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
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
                        {t('adminPages.branches.codeLabel')} {b.code}
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
                    {t('adminPages.branches.active')}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem', color: '#685D73', marginTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={16} color="#1E0426" />
                    <span>{b.address || t('adminPages.branches.addressOnFile')}, {b.city}</span>
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
                  <span>{t('adminPages.branches._vehicles', { count: b._count?.vehicles || 0 })}</span>
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
          title={t('adminPages.branches.addTitle')}
          subtitle={t('adminPages.branches.addSubtitle')}
          maxWidth="560px"
        >
          <form onSubmit={handleCreateBranch} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))', gap: '12px' }}>
              <div>
                <label style={LABEL_STYLE}>
                  {t('adminPages.branches.fieldName')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('adminPages.branches.placeholderName')}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={INPUT_STYLE}
                />
              </div>

              <div>
                <label style={LABEL_STYLE}>
                  {t('adminPages.branches.fieldCode')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('adminPages.branches.placeholderCode')}
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  style={INPUT_STYLE}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: '12px' }}>
              <div>
                <label style={LABEL_STYLE}>
                  {t('adminPages.branches.fieldCity')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('adminPages.branches.placeholderCity')}
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  style={INPUT_STYLE}
                />
              </div>

              <div>
                <label style={LABEL_STYLE}>
                  {t('adminPages.branches.fieldPhone')}
                </label>
                <input
                  type="text"
                  placeholder="+1 (555) 019-2831"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  style={INPUT_STYLE}
                />
              </div>
            </div>

            <div>
              <label style={LABEL_STYLE}>
                {t('adminPages.branches.fieldAddress')}
              </label>
              <input
                type="text"
                placeholder={t('adminPages.branches.placeholderAddress')}
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                style={INPUT_STYLE}
              />
            </div>

            <div>
              <label style={LABEL_STYLE}>
                {t('adminPages.branches.fieldHours')}
              </label>
              <input
                type="text"
                value={formData.openingHours || ''}
                onChange={(e) => setFormData({ ...formData, openingHours: e.target.value })}
                style={INPUT_STYLE}
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
                {t('adminPages.branches.cancel')}
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
                {submitting ? t('adminPages.branches.creating') : t('adminPages.branches.create')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </PageContainer>
  );
}
