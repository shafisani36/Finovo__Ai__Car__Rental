import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { employeeApi } from '../api/employeeApi';
import type { EmployeeUser } from '../api/employeeApi';
import {
  Users,
  ShieldCheck,
  UserCheck,
  RotateCcw,
  Search,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  PageContainer,
  PageHeader,
  StatCard,
  StatGrid,
  StatusBadge,
} from '../../../components/common';

export function EmployeesListPage() {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState<EmployeeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const res = await employeeApi.getEmployees();
      if (res.success) {
        setEmployees(res.users);
      }
    } catch (err) {
      console.error('Failed to load employees', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = employees.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.fullName.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.roles.some((r) => r.toLowerCase().includes(q))
    );
  });

  const totalEmployees = employees.length;
  const adminCount = employees.filter((e) => e.roles.includes('ADMIN') || e.roles.includes('SUPER_ADMIN')).length;
  const activeCount = employees.filter((e) => e.status === 'ACTIVE').length;

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title={t('adminPages.staff.title')}
        subtitle={t('adminPages.staff.subtitle')}
        breadcrumbs={[
          { label: t('adminPages.staff.crumbAdmin'), to: '/admin/dashboard' },
          { label: t('adminPages.staff.crumb') },
        ]}
      />

      {/* KPI Cards */}
      <StatGrid columns={3}>
        <StatCard
          icon={Users}
          label={t('adminPages.staff.statTotal')}
          value={totalEmployees}
          variant="purple"
        />
        <StatCard
          icon={ShieldCheck}
          label={t('adminPages.staff.statAdmins')}
          value={adminCount}
          variant="amber"
        />
        <StatCard
          icon={UserCheck}
          label={t('adminPages.staff.statActive')}
          value={activeCount}
          variant="green"
        />
      </StatGrid>

      {/* Search Input */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          padding: '16px 20px',
          border: '1px solid #ECEAEF',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <Search size={18} color="#685D73" />
        <input
          type="text"
          placeholder={t('adminPages.staff.search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            border: 'none',
            outline: 'none',
            fontSize: '0.9rem',
            width: '100%',
            color: '#1E0426',
          }}
        />
      </div>

      {/* Staff Table */}
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
            <div style={{ marginTop: '12px', fontWeight: 600 }}>{t('adminPages.staff.loading')}</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#685D73' }}>
            <Users size={40} color="#D1D5DB" style={{ marginBottom: '12px' }} />
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1E0426' }}>{t('adminPages.staff.empty')}</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#FAF9FB', borderBottom: '1px solid #ECEAEF', color: '#685D73' }}>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>{t('adminPages.staff.colMember')}</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>{t('adminPages.staff.colEmail')}</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>{t('adminPages.staff.colRoles')}</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>{t('adminPages.staff.colVerification')}</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>{t('adminPages.staff.colStatus')}</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>{t('adminPages.staff.colCreated')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr
                    key={user.id}
                    style={{
                      borderBottom: '1px solid #ECEAEF',
                      transition: 'background-color 0.15s',
                    }}
                  >
                    {/* User */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: '#1E0426',
                            color: '#FAB826',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.8125rem',
                          }}
                        >
                          {user.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#1E0426' }}>{user.fullName}</div>
                          <div style={{ fontSize: '0.75rem', color: '#685D73' }}>{t('adminPages.staff.idLabel')} {user.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ color: '#1E0426', fontWeight: 500 }}>{user.email}</div>
                    </td>

                    {/* Roles */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {user.roles.map((role) => (
                          <span
                            key={role}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor:
                                role === 'ADMIN' || role === 'SUPER_ADMIN'
                                  ? 'rgba(250, 184, 38, 0.2)'
                                  : 'rgba(30, 4, 38, 0.08)',
                              color: role === 'ADMIN' || role === 'SUPER_ADMIN' ? '#B45309' : '#1E0426',
                            }}
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Email verification */}
                    <td style={{ padding: '16px 20px' }}>
                      {user.isEmailVerified ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#059669',
                          }}
                        >
                          <CheckCircle2 size={13} />
                          {t('adminPages.staff.verified')}
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#D97706',
                          }}
                        >
                          <Clock size={13} />
                          {t('adminPages.staff.unverified')}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '16px 20px' }}>
                      <StatusBadge status={user.status} />
                    </td>

                    {/* Date */}
                    <td style={{ padding: '16px 20px', color: '#685D73' }}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
