import { useState, useEffect } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  Edit,
  Trash2,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Mail,
  Phone,
  Lock,
} from 'lucide-react';
import {
  PageContainer,
  PageHeader,
  StatCard,
  StatGrid,
  Modal,
} from '../../../components/common';
import { adminApi, type AdminUser } from '../../../api/services/admin.api';
import { useAuth } from '../../../features/auth/context';

export function UsersManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);

  // Form States
  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'CUSTOMER',
  });
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    status: 'ACTIVE' as AdminUser['status'],
    role: 'CUSTOMER',
    password: '',
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  const loadUsers = async (search?: string) => {
    try {
      setLoading(true);
      const res = await adminApi.listUsers({
        search: search !== undefined ? search : searchQuery,
        role: roleFilter,
      });
      if (res.success) {
        setUsers(res.users);
      }
    } catch (err: any) {
      console.error('Failed to load users:', err);
      setActionError('Failed to fetch system users.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers(searchQuery);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.fullName.trim() || !createForm.email.trim() || !createForm.password.trim()) {
      setActionError('Full Name, Email, and Password are required.');
      return;
    }

    try {
      setSaving(true);
      setActionError(null);
      const res = await adminApi.createUser({
        fullName: createForm.fullName.trim(),
        email: createForm.email.trim(),
        phone: createForm.phone.trim() || undefined,
        password: createForm.password.trim(),
        role: createForm.role,
      });

      if (res.success) {
        setActionSuccess(`User ${res.user.fullName} created successfully.`);
        setIsCreateOpen(false);
        setCreateForm({
          fullName: '',
          email: '',
          phone: '',
          password: '',
          role: 'CUSTOMER',
        });
        loadUsers();
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to create user.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditOpen = (user: AdminUser) => {
    setEditingUser(user);
    setEditForm({
      fullName: user.fullName,
      phone: user.phone || '',
      status: user.status,
      role: user.roles[0] || 'CUSTOMER',
      password: '',
    });
    setActionError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setSaving(true);
      setActionError(null);
      const res = await adminApi.updateUser(editingUser.id, {
        fullName: editForm.fullName.trim(),
        phone: editForm.phone.trim() || undefined,
        status: editForm.status,
        role: editForm.role,
        password: editForm.password.trim() || undefined,
      });

      if (res.success) {
        setActionSuccess(`User ${res.user.fullName} updated successfully.`);
        setEditingUser(null);
        loadUsers();
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to update user.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      setDeleting(true);
      setActionError(null);
      const res = await adminApi.deleteUser(userToDelete.id);
      if (res.success) {
        setActionSuccess('User removed successfully.');
        setUserToDelete(null);
        loadUsers();
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to remove user.');
    } finally {
      setDeleting(false);
    }
  };

  const totalUsers = users.length;
  const activeCount = users.filter((u) => u.status === 'ACTIVE').length;
  const adminCount = users.filter((u) => u.roles.includes('ADMIN') || u.roles.includes('SUPER_ADMIN')).length;
  const customerCount = users.filter((u) => u.roles.includes('CUSTOMER')).length;

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title="Manage Users & Access Roles"
        subtitle="Provision accounts, administer role-based privileges, review user statuses, and enforce security policies."
        breadcrumbs={[
          { label: 'Admin', to: '/admin/dashboard' },
          { label: 'Users' },
        ]}
      />

      {/* Alert Banners */}
      {actionSuccess && (
        <div
          style={{
            padding: '12px 18px',
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: '10px',
            color: '#065F46',
            fontWeight: 600,
            fontSize: '0.875rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{actionSuccess}</span>
          <button
            onClick={() => setActionSuccess(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#065F46', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {actionError && (
        <div
          style={{
            padding: '12px 18px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '10px',
            color: '#991B1B',
            fontWeight: 600,
            fontSize: '0.875rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <StatGrid columns={4}>
        <StatCard
          icon={Users}
          label="Total Users"
          value={totalUsers}
          variant="purple"
        />
        <StatCard
          icon={CheckCircle2}
          label="Active Accounts"
          value={activeCount}
          variant="green"
        />
        <StatCard
          icon={Shield}
          label="Administrators"
          value={adminCount}
          variant="purple"
        />
        <StatCard
          icon={Users}
          label="Customers"
          value={customerCount}
          variant="gold"
        />
      </StatGrid>

      {/* Controls Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
          padding: '16px 20px',
          borderRadius: '14px',
          border: '1px solid #ECEAEF',
        }}
      >
        {/* Role Filters */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['ALL', 'CUSTOMER', 'ADMIN', 'SUPER_ADMIN'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: roleFilter === r ? '1.5px solid #1E0426' : '1px solid #ECEAEF',
                backgroundColor: roleFilter === r ? '#1E0426' : '#FFFFFF',
                color: roleFilter === r ? '#FFFFFF' : '#4A315A',
                transition: 'all 0.15s ease',
              }}
            >
              {r === 'ALL' ? 'All Roles' : r.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search & Add User CTA */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', color: '#8A7090' }} />
              <input
                type="text"
                placeholder="Search by name, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '9px 12px 9px 36px',
                  borderRadius: '8px',
                  border: '1px solid #ECEAEF',
                  backgroundColor: '#FAF9FB',
                  fontSize: '0.875rem',
                  color: '#1E0426',
                  outline: 'none',
                  minWidth: '220px',
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                padding: '9px 16px',
                backgroundColor: '#1E0426',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.8125rem',
                cursor: 'pointer',
              }}
            >
              Search
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setIsCreateOpen(true);
              setActionError(null);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              backgroundColor: '#FAB826',
              color: '#1E0426',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.8125rem',
              cursor: 'pointer',
            }}
          >
            <UserPlus size={15} />
            Create User
          </button>
        </div>
      </div>

      {/* Users Table */}
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
            <RotateCcw size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <div style={{ marginTop: '12px', fontWeight: 600 }}>Loading user accounts...</div>
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#685D73' }}>
            <Users size={40} color="#D1D5DB" style={{ marginBottom: '12px' }} />
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1E0426' }}>No users found</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#FAF9FB', borderBottom: '1px solid #ECEAEF', color: '#685D73' }}>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>User Profile</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Contact</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Assigned Role</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Account Status</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Created Date</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isCurrent = currentUser?.email === u.email;
                  const isSuperAdmin = u.roles.includes('SUPER_ADMIN');
                  const isAdmin = u.roles.includes('ADMIN');

                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid #ECEAEF',
                        transition: 'background-color 0.15s',
                      }}
                    >
                      {/* Name & Avatar */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              backgroundColor: isSuperAdmin ? '#FAB826' : '#1E0426',
                              color: isSuperAdmin ? '#1E0426' : '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.8125rem',
                            }}
                          >
                            {u.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#1E0426' }}>
                              {u.fullName} {isCurrent && <span style={{ color: '#8A7090', fontSize: '0.75rem' }}>(You)</span>}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#8A7090' }}>
                              ID: {u.id.slice(0, 10)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ color: '#1E0426' }}>{u.email}</div>
                        <div style={{ fontSize: '0.75rem', color: '#685D73' }}>{u.phone || 'No phone'}</div>
                      </td>

                      {/* Role */}
                      <td style={{ padding: '16px 20px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: isSuperAdmin
                              ? 'rgba(250, 184, 38, 0.2)'
                              : isAdmin
                              ? 'rgba(74, 18, 112, 0.12)'
                              : 'rgba(59, 130, 246, 0.12)',
                            color: isSuperAdmin ? '#B45309' : isAdmin ? '#4A1270' : '#1D4ED8',
                          }}
                        >
                          {u.roles.join(', ') || 'CUSTOMER'}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '16px 20px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor:
                              u.status === 'ACTIVE'
                                ? 'rgba(16, 185, 129, 0.12)'
                                : u.status === 'SUSPENDED'
                                ? 'rgba(239, 68, 68, 0.12)'
                                : 'rgba(245, 183, 22, 0.15)',
                            color:
                              u.status === 'ACTIVE'
                                ? '#059669'
                                : u.status === 'SUSPENDED'
                                ? '#DC2626'
                                : '#B45309',
                          }}
                        >
                          {u.status}
                        </span>
                      </td>

                      {/* Date */}
                      <td style={{ padding: '16px 20px', fontSize: '0.8125rem', color: '#685D73' }}>
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleEditOpen(u)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              backgroundColor: '#F7F5F8',
                              border: '1px solid #ECEAEF',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: '#1E0426',
                              cursor: 'pointer',
                            }}
                          >
                            <Edit size={13} />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => setUserToDelete(u)}
                            disabled={isCurrent}
                            title={isCurrent ? 'Cannot delete your own account' : 'Delete User'}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '28px',
                              height: '28px',
                              backgroundColor: isCurrent ? '#F3F4F6' : '#FEF2F2',
                              border: '1px solid',
                              borderColor: isCurrent ? '#E5E7EB' : '#FECACA',
                              borderRadius: '8px',
                              color: isCurrent ? '#9CA3AF' : '#DC2626',
                              cursor: isCurrent ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
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

      {/* Create User Modal */}
      {isCreateOpen && (
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Create New User Account"
          subtitle="Provision an enterprise user with assigned role and credentials."
          maxWidth="520px"
        >
          <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#1E0426', marginBottom: '6px' }}>
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sarah Jenkins"
                value={createForm.fullName}
                onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #ECEAEF',
                  backgroundColor: '#FAF9FB',
                  fontSize: '0.875rem',
                  color: '#1E0426',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#1E0426', marginBottom: '6px' }}>
                Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="sarah.jenkins@company.com"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #ECEAEF',
                  backgroundColor: '#FAF9FB',
                  fontSize: '0.875rem',
                  color: '#1E0426',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#1E0426', marginBottom: '6px' }}>
                Phone Number (Optional)
              </label>
              <input
                type="text"
                placeholder="+966 50 123 4567"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #ECEAEF',
                  backgroundColor: '#FAF9FB',
                  fontSize: '0.875rem',
                  color: '#1E0426',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#1E0426', marginBottom: '6px' }}>
                Temporary Password * (minimum 8 characters)
              </label>
              <input
                type="password"
                required
                minLength={8}
                placeholder="••••••••"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #ECEAEF',
                  backgroundColor: '#FAF9FB',
                  fontSize: '0.875rem',
                  color: '#1E0426',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#1E0426', marginBottom: '6px' }}>
                System Role *
              </label>
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #ECEAEF',
                  backgroundColor: '#FAF9FB',
                  fontSize: '0.875rem',
                  color: '#1E0426',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              >
                <option value="CUSTOMER">CUSTOMER (Standard Renter)</option>
                <option value="ADMIN">ADMIN (Operations Manager)</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN (System Root)</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  backgroundColor: '#F7F5F8',
                  border: '1px solid #ECEAEF',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  color: '#1E0426',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '9px 22px',
                  borderRadius: '8px',
                  backgroundColor: '#1E0426',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.8125rem',
                  color: '#FFFFFF',
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <Modal
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          title={`Edit User: ${editingUser.fullName}`}
          subtitle={`Email: ${editingUser.email}`}
          maxWidth="520px"
        >
          <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#1E0426', marginBottom: '6px' }}>
                Full Name
              </label>
              <input
                type="text"
                value={editForm.fullName}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #ECEAEF',
                  backgroundColor: '#FAF9FB',
                  fontSize: '0.875rem',
                  color: '#1E0426',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#1E0426', marginBottom: '6px' }}>
                Phone Number
              </label>
              <input
                type="text"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #ECEAEF',
                  backgroundColor: '#FAF9FB',
                  fontSize: '0.875rem',
                  color: '#1E0426',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#1E0426', marginBottom: '6px' }}>
                Account Status
              </label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value as AdminUser['status'] })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #ECEAEF',
                  backgroundColor: '#FAF9FB',
                  fontSize: '0.875rem',
                  color: '#1E0426',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="PENDING_VERIFICATION">PENDING VERIFICATION</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#1E0426', marginBottom: '6px' }}>
                Access Role
              </label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #ECEAEF',
                  backgroundColor: '#FAF9FB',
                  fontSize: '0.875rem',
                  color: '#1E0426',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              >
                <option value="CUSTOMER">CUSTOMER</option>
                <option value="ADMIN">ADMIN</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#1E0426', marginBottom: '6px' }}>
                Reset Password (Optional - leave blank to keep unchanged)
              </label>
              <input
                type="password"
                placeholder="New password (optional)"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #ECEAEF',
                  backgroundColor: '#FAF9FB',
                  fontSize: '0.875rem',
                  color: '#1E0426',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  backgroundColor: '#F7F5F8',
                  border: '1px solid #ECEAEF',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  color: '#1E0426',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '9px 22px',
                  borderRadius: '8px',
                  backgroundColor: '#1E0426',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.8125rem',
                  color: '#FFFFFF',
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <Modal
          isOpen={!!userToDelete}
          onClose={() => setUserToDelete(null)}
          title="Confirm User Deletion"
          maxWidth="440px"
        >
          <div style={{ color: '#4A315A', fontSize: '0.925rem', lineHeight: '1.5' }}>
            Are you sure you want to permanently delete user <strong>{userToDelete.fullName}</strong> ({userToDelete.email})? This action cannot be reversed.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={() => setUserToDelete(null)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: '#F7F5F8',
                border: '1px solid #ECEAEF',
                fontWeight: 700,
                fontSize: '0.8125rem',
                color: '#1E0426',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteUser}
              disabled={deleting}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                backgroundColor: '#DC2626',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.8125rem',
                color: '#FFFFFF',
                cursor: deleting ? 'not-allowed' : 'pointer',
              }}
            >
              {deleting ? 'Deleting...' : 'Delete User'}
            </button>
          </div>
        </Modal>
      )}
    </PageContainer>
  );
}
