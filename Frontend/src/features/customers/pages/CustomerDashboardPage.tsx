import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../auth/context';
import { authClient } from '../../auth/api/authClient';
import type { SessionInfo } from '../../auth/types/auth.types';
import { BrandLogo } from '../../../components/common/BrandLogo';
import {
  Car,
  ShieldCheck,
  Smartphone,
  LogOut,
  KeyRound,
  FileCheck,
} from 'lucide-react';
import { useConfirm } from '../../../components/common/ConfirmModal';

export function CustomerDashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { confirm } = useConfirm();

  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'license'>('overview');
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const data = await authClient.request<{ success: boolean; sessions: SessionInfo[] }>('/sessions');
      if (data?.sessions) {
        setSessions(data.sessions);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoadingData(true);
      try {
        await fetchSessions();
      } finally {
        if (isMounted) {
          setIsLoadingData(false);
        }
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [fetchSessions]);

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  const handleRevokeSession = async (sessionId: string) => {
    const ok = await confirm({
      title: 'Revoke Device Session?',
      message: 'This device will be immediately logged out of your account and will need to authenticate again.',
      confirmText: 'Revoke Session',
      cancelText: 'Cancel',
      variant: 'warning',
    });
    if (!ok) return;

    try {
      await authClient.request(`/sessions/${sessionId}`, { method: 'DELETE' });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setActionSuccess('Session revoked successfully.');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch {
      alert('Failed to revoke session');
    }
  };

  const handleRevokeOtherSessions = async () => {
    const ok = await confirm({
      title: 'Terminate All Other Sessions?',
      message: 'All other smartphones, tablets, or browser sessions logged into your Finovo account will be disconnected immediately.',
      confirmText: 'Terminate Other Sessions',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await authClient.request('/sessions', { method: 'DELETE' });
      await fetchSessions();
      setActionSuccess('All other sessions terminated.');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch {
      alert('Failed to terminate other sessions');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F8F6F9',
        fontFamily: 'var(--font-family-sans, "Manrope", sans-serif)',
        color: '#1E0528',
      }}
    >
      {/* Top Navigation Bar */}
      <header
        style={{
          backgroundColor: '#1E0528',
          color: '#FFFFFF',
          padding: '14px clamp(14px, 3vw, 28px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <BrandLogo size="sm" variant="light" />
          </Link>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              backgroundColor: 'rgba(250, 184, 38, 0.2)',
              color: '#FAB826',
              padding: '4px 10px',
              borderRadius: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Customer Renter Portal
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link
            to="/"
            style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.875rem',
              fontWeight: 600,
              textDecoration: 'none',
              padding: '8px 14px',
              borderRadius: '8px',
            }}
          >
            ← Browse Rental Fleet
          </Link>
          <button
            onClick={handleSignOut}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#FFFFFF',
              borderRadius: '10px',
              padding: '8px 16px',
              fontSize: '0.875rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1200px', margin: '36px auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* User Welcome Banner */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            padding: '28px 32px',
            boxShadow: '0 4px 20px rgba(46, 7, 56, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px',
            border: '1px solid #ECEAEF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#1E0528',
                color: '#FAB826',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 800,
              }}
            >
              {user?.fullName?.charAt(0).toUpperCase() || 'C'}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: '#1E0528' }}>
                  Welcome, {user?.fullName}
                </h1>
                <span
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    color: '#059669',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <ShieldCheck size={12} />
                  Verified Renter
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', color: '#685D73', fontSize: '0.9rem' }}>
                Account: <strong>{user?.email}</strong> • Direct Route: <code>/customer/dashboard</code>
              </p>
            </div>
          </div>

          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              backgroundColor: '#FAB826',
              color: '#1E0528',
              borderRadius: '12px',
              fontWeight: 800,
              fontSize: '0.925rem',
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(250, 184, 38, 0.35)',
            }}
          >
            <Car size={18} />
            <span>Book Next Vehicle</span>
          </Link>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid #ECEAEF',
            paddingBottom: '8px',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
          }}
        >
          {[
            { id: 'overview', label: 'My Bookings & Rentals', icon: KeyRound },
            { id: 'sessions', label: 'Security & Active Sessions', icon: Smartphone },
            { id: 'license', label: 'Driver License & Identity', icon: FileCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'overview' | 'sessions' | 'license')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: isActive ? '#1E0528' : 'transparent',
                  color: isActive ? '#FFFFFF' : '#685D73',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Overview & Rentals */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #ECEAEF',
                padding: '24px',
              }}
            >
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1E0528', margin: '0 0 16px 0' }}>
                Active Vehicle Reservations & Trips
              </h2>
              <div
                style={{
                  border: '1px solid #ECEAEF',
                  borderRadius: '14px',
                  padding: '20px',
                  backgroundColor: '#FAF9FB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <img
                    src="https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=300&q=80"
                    alt=""
                    style={{ width: '84px', height: '56px', borderRadius: '8px', objectFit: 'cover' }}
                  />
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#B45309', textTransform: 'uppercase' }}>
                      CONFIRMED RESERVATION • #BK-2026-9041
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E0528' }}>
                      BMW 3 Series Luxury Sedan
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#685D73' }}>
                      Pick-up: Downtown HQ Station • 3 Days Rental
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1E0528' }}>$354.00</div>
                  <span
                    style={{
                      display: 'inline-block',
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      color: '#059669',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      marginTop: '4px',
                    }}
                  >
                    READY FOR HANDOVER
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Security & Sessions */}
        {activeTab === 'sessions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #ECEAEF',
                padding: '24px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1E0528', margin: 0 }}>
                    Active Login Sessions
                  </h2>
                  <p style={{ margin: '4px 0 0 0', color: '#685D73', fontSize: '0.875rem' }}>
                    Devices and network sessions authenticated to your customer account.
                  </p>
                </div>

                <button
                  onClick={handleRevokeOtherSessions}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#FAF9FB',
                    border: '1px solid #ECEAEF',
                    borderRadius: '8px',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: '#DC2626',
                    cursor: 'pointer',
                  }}
                >
                  Terminate Other Sessions
                </button>
              </div>

              {actionSuccess && (
                <div style={{ padding: '12px 16px', backgroundColor: '#DEF7EC', color: '#03543F', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem' }}>
                  {actionSuccess}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {isLoadingData ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#685D73' }}>
                    Loading active sessions...
                  </div>
                ) : sessions.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#685D73' }}>
                    No active sessions found.
                  </div>
                ) : (
                  sessions.map((session) => (
                    <div
                      key={session.id}
                      style={{
                        border: '1px solid #ECEAEF',
                        borderRadius: '10px',
                        padding: '14px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                        backgroundColor: session.isCurrent ? 'rgba(250, 184, 38, 0.05)' : '#FFFFFF',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Smartphone size={20} color={session.isCurrent ? '#B45309' : '#685D73'} />
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1E0528' }}>
                            {session.userAgent || 'Chrome Web Client'}
                            {session.isCurrent && (
                              <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: '#B45309', fontWeight: 800 }}>
                                (THIS DEVICE)
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#685D73' }}>
                            IP: {session.ipAddress || '127.0.0.1'} • Last active: {new Date(session.lastActiveAt).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {!session.isCurrent && (
                        <button
                          onClick={() => handleRevokeSession(session.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#DC2626',
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: License & Identity */}
        {activeTab === 'license' && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #ECEAEF',
              padding: '24px',
            }}
          >
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1E0528', margin: '0 0 16px 0' }}>
              Driver License & Identity Verification
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div style={{ padding: '16px', backgroundColor: '#FAF9FB', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: '#685D73', fontWeight: 700 }}>DRIVER LICENSE NUMBER</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E0528', marginTop: '4px' }}>
                  DL-994821-B
                </div>
                <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700, marginTop: '4px' }}>
                  ✓ Status: Approved & Verified
                </div>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#FAF9FB', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: '#685D73', fontWeight: 700 }}>VERIFICATION EXPIRY</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E0528', marginTop: '4px' }}>
                  Dec 31, 2028
                </div>
                <div style={{ fontSize: '0.75rem', color: '#685D73', marginTop: '4px' }}>
                  Automated biometric & document check
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
