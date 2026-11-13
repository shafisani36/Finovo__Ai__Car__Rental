import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { telHref, useSiteInfo } from '../../../hooks/usePublicSite';
import {
  customerPortalApi,
  type PortalOverviewResponse,
} from '../api/customerPortalApi';
import { getCarImage, formatMoney } from '../../../utils/carImageHelper';
import {
  Car,
  CalendarCheck,
  CreditCard,
  FileCheck,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Clock,
  Sparkles,
  Award,
  ChevronRight,
  RefreshCw,
  Gift,
  Phone,
} from 'lucide-react';
import './CustomerPortal.css';

export function CustomerDashboardOverviewPage() {
  const site = useSiteInfo();
  const { t, i18n } = useTranslation();
  const formatDate = (value: string) => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(value));
  const formatDateTime = (value: string) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  const [data, setData] = useState<PortalOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsFallbackMode(false);
      const res = await customerPortalApi.getOverview();
      if (res && res.customer) {
        setData(res);
      } else {
        setData(null);
        setError(t('portal.unableLoad'));
      }
    } catch (err: unknown) {
      // Show the real error instead of invented dashboard data
      setData(null);
      setError(err instanceof Error ? err.message : t('portal.unableLoad'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="cp-page-container">
        <div className="cp-card cp-skeleton" style={{ height: '140px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '16px' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="cp-card cp-skeleton" style={{ height: '90px' }} />
          ))}
        </div>
        <div className="cp-card cp-skeleton" style={{ height: '260px' }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="cp-page-container">
        <div className="cp-card cp-empty-state">
          <AlertTriangle size={48} color="var(--cp-danger)" style={{ marginBottom: '16px' }} />
          <h2 className="cp-empty-title">{t('portal.unableLoad')}</h2>
          <p className="cp-empty-desc">{error}</p>
          <button onClick={loadData} className="cp-btn-secondary">
            <RefreshCw size={16} />
            <span>{t('portal.retryLoading')}</span>
          </button>
        </div>
      </div>
    );
  }

  const { customer, stats, activeRental, nextUpcomingBooking, recentCompletedBookings, actionAlerts } = data;

  return (
    <div className="cp-page-container">
      {isFallbackMode && (
        <div
          style={{
            backgroundColor: 'rgba(250, 184, 38, 0.1)',
            border: '1px solid rgba(250, 184, 38, 0.3)',
            borderRadius: '12px',
            padding: '12px 18px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#1E0426' }}>
            <Sparkles size={16} color="#B45309" />
            <span>{t('portal.previewBanner')}</span>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="cp-btn-secondary"
            style={{ padding: '6px 14px', fontSize: '0.75rem', minHeight: '32px', gap: '5px' }}
          >
            <RefreshCw size={12} />
            <span>{t('portal.sync')}</span>
          </button>
        </div>
      )}
      {/* 1. Welcome Banner */}
      <div className="cp-welcome-banner">
        <div style={{ zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span
              className={customer.isLicenseVerified ? 'cp-badge cp-badge-accent' : 'cp-badge cp-badge-warning'}
            >
              <ShieldCheck size={14} />
              {customer.isLicenseVerified ? t('portal.verifiedDriver') : t('portal.pendingVerification')}
            </span>
          </div>

          <h1
            style={{
              fontFamily: "var(--font-family-display, 'Archivo', sans-serif)",
              fontSize: 'clamp(1.5rem, 2.5vw, 2.1rem)',
              fontWeight: 800,
              margin: '0 0 8px 0',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}
          >
            {t('portal.welcomeBackUser')} {customer.fullName || t('portal.valuedRenter')}
          </h1>
          <p
            style={{
              color: 'rgba(255, 255, 255, 0.8)',
              margin: 0,
              fontSize: '0.925rem',
              maxWidth: '560px',
              lineHeight: 1.5,
            }}
          >
            {t('portal.overviewDesc')}
          </p>
        </div>

        <div className="cp-header-actions" style={{ zIndex: 2 }}>
          <Link to="/customer/cars" className="cp-btn-primary">
            <Car size={18} />
            <span>{t('portal.bookNextCar')}</span>
          </Link>

          <Link
            to="/customer/assistant"
            className="cp-btn-outline"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#FFFFFF',
              borderColor: 'rgba(255, 255, 255, 0.25)',
            }}
          >
            <Sparkles size={16} color="var(--cp-accent)" />
            <span>{t('portal.aiConcierge')}</span>
          </Link>
        </div>
      </div>

      {/* 2. Action Alerts (e.g. required documents or pending balances) */}
      {actionAlerts && actionAlerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {actionAlerts.map((alert) => (
            <div
              key={alert.id}
              className="cp-card"
              style={{
                backgroundColor: alert.type === 'WARNING' ? 'var(--cp-warning-bg)' : 'var(--cp-info-bg)',
                border: `1px solid ${alert.type === 'WARNING' ? 'var(--cp-warning-border)' : 'var(--cp-info-border)'}`,
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <AlertTriangle
                  size={20}
                  color={alert.type === 'WARNING' ? 'var(--cp-warning)' : 'var(--cp-info)'}
                />
                <div>
                  <strong
                    style={{
                      color: alert.type === 'WARNING' ? 'var(--cp-warning)' : 'var(--cp-info)',
                      fontSize: '0.9rem',
                      display: 'block',
                    }}
                  >
                    {alert.title}
                  </strong>
                  <span style={{ color: 'var(--cp-text-muted)', fontSize: '0.8125rem' }}>{alert.message}</span>
                </div>
              </div>

              <Link
                to={alert.actionUrl}
                className={alert.type === 'WARNING' ? 'cp-btn-primary' : 'cp-btn-secondary'}
                style={{ padding: '6px 14px', fontSize: '0.8125rem', height: 'auto', minHeight: '34px' }}
              >
                {alert.actionLabel} →
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* 3. Stat KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '16px' }}>
        <div className="cp-stat-card">
          <div className="cp-stat-icon-wrap" style={{ color: 'var(--cp-primary)' }}>
            <CalendarCheck size={24} />
          </div>
          <div>
            <div className="cp-stat-label">{t('portal.activeBookings')}</div>
            <div className="cp-stat-value">{stats.activeBookings}</div>
          </div>
        </div>

        <div className="cp-stat-card">
          <div className="cp-stat-icon-wrap" style={{ color: 'var(--cp-primary)' }}>
            <Car size={24} />
          </div>
          <div>
            <div className="cp-stat-label">{t('portal.totalReservations')}</div>
            <div className="cp-stat-value">{stats.totalBookings}</div>
          </div>
        </div>

        <div className="cp-stat-card">
          <div className="cp-stat-icon-wrap" style={{ color: 'var(--cp-warning)' }}>
            <CreditCard size={24} />
          </div>
          <div>
            <div className="cp-stat-label">{t('portal.pendingBalance')}</div>
            <div className="cp-stat-value" style={{ color: 'var(--cp-warning)' }}>
              {formatMoney(stats.pendingBalanceTotal, stats.currency)}
            </div>
          </div>
        </div>

        <div className="cp-stat-card">
          <div className="cp-stat-icon-wrap" style={{ color: '#D97706' }}>
            <Award size={24} />
          </div>
          <div>
            <div className="cp-stat-label">{t('portal.rewardPoints')}</div>
            <div className="cp-stat-value">{t('portalPages.dashboard.points', { count: stats.rewardPoints })}</div>
          </div>
        </div>
      </div>

      {/* 4. Active Trip or Next Upcoming Reservation */}
      {activeRental ? (
        <div
          className="cp-card"
          style={{
            borderColor: 'var(--cp-success-border)',
            borderWidth: '2px',
            boxShadow: '0 6px 20px rgba(5, 122, 85, 0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--cp-success)',
                  boxShadow: '0 0 0 3px rgba(5, 122, 85, 0.2)',
                }}
              />
              <span
                style={{
                  fontWeight: 800,
                  color: 'var(--cp-success)',
                  fontSize: '0.85rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {t('portalPages.dashboard.activeTrip', { number: activeRental.booking.bookingNumber })}
              </span>
            </div>
            <Link
              to={`/customer/bookings/${activeRental.booking.id}/inspection`}
              className="cp-btn-outline"
              style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: '32px' }}
            >
              <span>{t('portal.viewInspection')}</span>
              <ArrowRight size={14} className="rtl-mirror-arrow" />
            </Link>
          </div>

          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            {activeRental.vehicle.primaryImageUrl && (
              <div
                style={{
                  width: '160px',
                  height: '100px',
                  borderRadius: 'var(--cp-radius-md)',
                  overflow: 'hidden',
                  background: '#F1EEF4',
                  flexShrink: 0,
                }}
              >
                <img
                  src={getCarImage(activeRental.vehicle)}
                  alt={activeRental.vehicle.model}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    const fallback = getCarImage(activeRental.vehicle);
                    if (!e.currentTarget.src.includes(fallback)) {
                      e.currentTarget.src = fallback;
                    }
                  }}
                />
              </div>
            )}
            <div style={{ flex: 1, minWidth: '220px' }}>
              <h3
                style={{
                  margin: '0 0 6px 0',
                  fontSize: '1.25rem',
                  color: 'var(--cp-primary)',
                  fontWeight: 800,
                }}
              >
                {activeRental.vehicle.brand} {activeRental.vehicle.model} ({activeRental.vehicle.year})
              </h3>
              <p style={{ margin: '0 0 12px 0', color: 'var(--cp-text-muted)', fontSize: '0.85rem' }}>
                {t('portalPages.dashboard.activeTripLine', {
                  pickup: activeRental.booking.pickupBranch?.name || '—',
                  date: formatDate(activeRental.booking.returnDateTime),
                  returnBranch: activeRental.booking.returnBranch?.name || '—',
                })}
              </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Link
                  to={`/customer/bookings/${activeRental.booking.id}`}
                  className="cp-btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.825rem', minHeight: '36px' }}
                >
                  {t('portalPages.dashboard.manageTrip')}
                </Link>
                <Link
                  to={`/customer/bookings/${activeRental.booking.id}/inspection`}
                  className="cp-btn-outline"
                  style={{ padding: '8px 16px', fontSize: '0.825rem', minHeight: '36px' }}
                >
                  {t('portalPages.dashboard.conditionReports')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : nextUpcomingBooking ? (
        <div
          className="cp-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px',
          }}
        >
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            {nextUpcomingBooking.vehicle.primaryImageUrl && (
              <div
                style={{
                  width: '140px',
                  height: '90px',
                  borderRadius: 'var(--cp-radius-md)',
                  overflow: 'hidden',
                  background: '#F1EEF4',
                  flexShrink: 0,
                }}
              >
                <img
                  src={getCarImage(nextUpcomingBooking.vehicle)}
                  alt={nextUpcomingBooking.vehicle.model}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    const fallback = getCarImage(nextUpcomingBooking.vehicle);
                    if (!e.currentTarget.src.includes(fallback)) {
                      e.currentTarget.src = fallback;
                    }
                  }}
                />
              </div>
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className="cp-badge cp-badge-accent">
                  {t('portalPages.dashboard.nextTrip', { number: nextUpcomingBooking.bookingNumber })}
                </span>
                <span className="cp-badge cp-badge-info">
                  {t(`portalPages.bookings.status.${nextUpcomingBooking.status}`, { defaultValue: nextUpcomingBooking.status })}
                </span>
              </div>
              <h3
                style={{
                  margin: '0 0 4px 0',
                  fontSize: '1.2rem',
                  color: 'var(--cp-primary)',
                  fontWeight: 800,
                }}
              >
                {nextUpcomingBooking.vehicle.brand} {nextUpcomingBooking.vehicle.model}
              </h3>
              <p style={{ margin: 0, color: 'var(--cp-text-muted)', fontSize: '0.85rem' }}>
                {t('portalPages.dashboard.nextTripLine', {
                  date: formatDateTime(nextUpcomingBooking.pickupDateTime),
                  city: nextUpcomingBooking.pickupBranch?.city || '—',
                })}
              </p>
            </div>
          </div>

          <Link
            to={`/customer/bookings/${nextUpcomingBooking.id}`}
            className="cp-btn-secondary"
            style={{ padding: '10px 18px', fontSize: '0.85rem' }}
          >
            <span>{t('common.actions.viewDetails')}</span>
            <ChevronRight size={16} className="rtl-mirror-arrow" />
          </Link>
        </div>
      ) : null}

      {/* 5. Two-Column Grid: Recent Bookings & Quick Links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '24px' }}>
        {/* Left Column: Recent Trips */}
        <div className="cp-card">
          <div className="cp-card-header">
            <h2 className="cp-card-title">{t('admin.recentBookings')}</h2>
            <Link
              to="/customer/bookings"
              style={{
                color: 'var(--cp-primary)',
                fontWeight: 700,
                fontSize: '0.825rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>{t('common.actions.viewAll')} ({stats.totalBookings})</span>
              <ChevronRight size={14} className="rtl-mirror-arrow" />
            </Link>
          </div>

          {stats.totalBookings === 0 ? (
            <div className="cp-empty-state" style={{ padding: '24px 0' }}>
              <Car size={36} color="var(--cp-text-subtle)" style={{ marginBottom: '8px' }} />
              <div style={{ fontWeight: 700, color: 'var(--cp-primary)', marginBottom: '4px' }}>{t('common.empty.noData')}</div>
              <p className="cp-empty-desc" style={{ marginBottom: '16px' }}>{t('portal.overviewDesc')}</p>
              <Link to="/customer/cars" className="cp-btn-primary">
                {t('nav.browseFleet')}
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(nextUpcomingBooking ? [nextUpcomingBooking] : recentCompletedBookings).slice(0, 4).map((b) => (
                <Link
                  key={b.id}
                  to={`/customer/bookings/${b.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 'var(--cp-radius-md)',
                    backgroundColor: '#FAF8FB',
                    border: '1px solid var(--cp-border)',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'var(--cp-transition)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cp-text-subtle)' }}>
                      #{b.bookingNumber}
                    </div>
                    <div style={{ fontWeight: 800, color: 'var(--cp-primary)', fontSize: '0.9rem' }}>
                      {b.vehicle?.brand} {b.vehicle?.model}
                    </div>
                  </div>
                  <div style={{ textAlign: 'end' }}>
                    <div style={{ fontWeight: 800, color: 'var(--cp-primary)', fontSize: '0.9rem' }}>
                      {formatMoney(Number(b.totalAmount))}
                    </div>
                    <span
                      className={`cp-badge ${
                        b.status === 'COMPLETED'
                          ? 'cp-badge-success'
                          : b.status === 'ACTIVE'
                          ? 'cp-badge-warning'
                          : 'cp-badge-info'
                      }`}
                      style={{ fontSize: '0.68rem', padding: '2px 6px' }}
                    >
                      {t(`common.status.${b.status.toLowerCase()}`, { defaultValue: b.status })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Portal Shortcuts & Services */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="cp-card">
            <h2 className="cp-card-title" style={{ marginBottom: '16px' }}>
              {t('portal.quickShortcuts')}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 145px), 1fr))', gap: '12px' }}>
              <Link
                to="/customer/documents"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '16px',
                  borderRadius: 'var(--cp-radius-md)',
                  backgroundColor: '#FAF8FB',
                  border: '1px solid var(--cp-border)',
                  textDecoration: 'none',
                  color: 'var(--cp-primary)',
                  transition: 'var(--cp-transition)',
                }}
              >
                <FileCheck size={20} color="var(--cp-primary)" />
                <span style={{ fontWeight: 800, fontSize: '0.875rem' }}>{t('nav.driverDocuments')}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--cp-text-muted)' }}>{t('portal.verifiedDriver')}</span>
              </Link>

              <Link
                to="/customer/payments"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '16px',
                  borderRadius: 'var(--cp-radius-md)',
                  backgroundColor: '#FAF8FB',
                  border: '1px solid var(--cp-border)',
                  textDecoration: 'none',
                  color: 'var(--cp-primary)',
                  transition: 'var(--cp-transition)',
                }}
              >
                <CreditCard size={20} color="var(--cp-primary)" />
                <span style={{ fontWeight: 800, fontSize: '0.875rem' }}>{t('nav.paymentsInvoices')}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--cp-text-muted)' }}>{t('portal.pendingBalance')}</span>
              </Link>

              <Link
                to="/customer/support"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '16px',
                  borderRadius: 'var(--cp-radius-md)',
                  backgroundColor: '#FAF8FB',
                  border: '1px solid var(--cp-border)',
                  textDecoration: 'none',
                  color: 'var(--cp-primary)',
                  transition: 'var(--cp-transition)',
                }}
              >
                <Clock size={20} color="var(--cp-primary)" />
                <span style={{ fontWeight: 800, fontSize: '0.875rem' }}>{t('nav.supportTickets')}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--cp-text-muted)' }}>{t('home.stats.customerSupport')}</span>
              </Link>

              <Link
                to="/customer/rewards"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '16px',
                  borderRadius: 'var(--cp-radius-md)',
                  backgroundColor: '#FAF8FB',
                  border: '1px solid var(--cp-border)',
                  textDecoration: 'none',
                  color: 'var(--cp-primary)',
                  transition: 'var(--cp-transition)',
                }}
              >
                <Gift size={20} color="#D97706" />
                <span style={{ fontWeight: 800, fontSize: '0.875rem' }}>{t('nav.rewardsReferrals')}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--cp-text-muted)' }}>{t('portal.rewardPoints')}</span>
              </Link>
            </div>
          </div>

          {/* Roadside Assistance Bar */}
          <div
            className="cp-card"
            style={{
              background: 'linear-gradient(135deg, var(--cp-primary) 0%, #2E0B3C 100%)',
              color: '#FFFFFF',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: 'var(--cp-accent)',
                  letterSpacing: '0.04em',
                }}
              >
                {t('nav.roadsideTitle')}
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('nav.roadsideDesc')}</div>
            </div>
{site?.supportPhone && (
            <a
              href={telHref(site.supportPhone)}
              className="cp-btn-primary"
              style={{
                padding: '8px 16px',
                fontSize: '0.8125rem',
                minHeight: '36px',
                textDecoration: 'none',
              }}
            >
              <Phone size={14} />
              {t('contact.callUs')}
            </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
