import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  User,
  KeyRound,
  Smartphone,
  Save,
  CheckCircle2,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { customerPortalApi, type CustomerProfile } from '../api/customerPortalApi';
import { authClient } from '../../auth/api/authClient';
import type { SessionInfo } from '../../auth/types/auth.types';
import { CustomSelect } from '../../../components/common/CustomSelect';
import { useAuth } from '../../auth/context';
import { SUPPORTED_LANGUAGES, normalizeLanguageCode } from '../../../i18n/config';
import './CustomerPortal.css';

export function CustomerProfilePage() {
  const { t, i18n } = useTranslation();
  const [sessionError, setSessionError] = useState<string | null>(null);
  const { updatePreferredLanguage } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'sessions'>('profile');
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [driverLicenseNumber, setDriverLicenseNumber] = useState('');
  const [licenseExpiryDate, setLicenseExpiryDate] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Security password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passMessage, setPassMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchProfileAndSessions = async () => {
    try {
      setIsLoading(true);
      const res = await customerPortalApi.getOverview();
      if (res.success && res.customer) {
        setCustomer(res.customer);
        setFullName(res.customer.fullName || '');
        setPhone(res.customer.phone || '');
        setDriverLicenseNumber(res.customer.driverLicenseNumber || '');
        setLicenseExpiryDate(res.customer.licenseExpiryDate ? res.customer.licenseExpiryDate.split('T')[0] : '');
        setPreferredLanguage(res.customer.preferredLanguage || 'en');
      }

      // Fetch sessions
      try {
        const sRes = await authClient.request<{ success: boolean; sessions: SessionInfo[] }>('/sessions');
        if (sRes?.sessions) {
          setSessions(sRes.sessions);
        }
      } catch (e) {
        console.warn('Sessions endpoint not available:', e);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndSessions();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setSaveSuccess(null);
      setSaveError(null);

      const res = await customerPortalApi.updateProfile({
        fullName,
        phone,
        driverLicenseNumber,
        licenseExpiryDate: licenseExpiryDate ? new Date(licenseExpiryDate).toISOString() : undefined,
        preferredLanguage,
      });

      if (res.success) {
        setSaveSuccess(t('portalPages.profile.saved'));
        setCustomer(res.customer);
        const normalizedLang = normalizeLanguageCode(res.customer?.preferredLanguage || preferredLanguage);
        if (normalizedLang) {
          updatePreferredLanguage(normalizedLang);
          if (normalizeLanguageCode(i18n.language) !== normalizedLang) {
            await i18n.changeLanguage(normalizedLang);
          }
        }
        setTimeout(() => setSaveSuccess(null), 3000);
      }
    } catch (err: any) {
      setSaveError(err?.message || t('portalPages.profile.errSave'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPassMessage({ text: t('portalPages.profile.passwordMismatch'), type: 'error' });
      return;
    }
    if (newPassword.length < 8) {
      setPassMessage({ text: t('portalPages.profile.passwordShort'), type: 'error' });
      return;
    }

    try {
      setIsChangingPass(true);
      setPassMessage(null);
      await authClient.request('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPassMessage({ text: t('portalPages.profile.passwordChanged'), type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassMessage({ text: err?.message || t('portalPages.profile.errPassword'), type: 'error' });
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      setSessionError(null);
      await authClient.request(`/sessions/${sessionId}`, { method: 'DELETE' });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err: any) {
      setSessionError(err?.message || t('portalPages.profile.errRevoke'));
    }
  };

  if (isLoading) {
    return (
      <div className="cp-page-container">
        <div className="cp-card cp-skeleton" style={{ height: '400px' }} />
      </div>
    );
  }

  return (
    <div className="cp-page-container">
      {/* Header */}
      <div className="cp-page-header">
        <div>
          <h1 className="cp-page-title">{t('portalPages.profile.title')}</h1>
          <p className="cp-page-subtitle">{t('portalPages.profile.subtitle')}</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="cp-card" style={{ padding: '16px 20px' }}>
        <div className="cp-tabs-bar" style={{ border: 'none', padding: 0 }}>
          <button
            className={`cp-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={16} />
            {t('portalPages.profile.tabProfile')}
          </button>
          <button
            className={`cp-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <KeyRound size={16} />
            {t('portalPages.profile.tabSecurity')}
          </button>
          <button
            className={`cp-tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
            onClick={() => setActiveTab('sessions')}
          >
            <Smartphone size={16} />
            {t('portalPages.profile.tabSessions', { count: sessions.length })}
          </button>
        </div>
      </div>

      {/* Tab 1: Profile Information */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="cp-card" style={{ maxWidth: '800px' }}>
          <h2 className="cp-card-title" style={{ marginBottom: '20px' }}>{t('portalPages.profile.profileTitle')}</h2>

          {saveSuccess && (
            <div
              style={{
                background: 'var(--cp-success-bg)',
                color: 'var(--cp-success)',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.9rem',
              }}
            >
              <CheckCircle2 size={18} />
              {saveSuccess}
            </div>
          )}

          {saveError && (
            <div
              style={{
                background: 'var(--cp-danger-bg)',
                color: 'var(--cp-danger)',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.9rem',
              }}
            >
              <AlertCircle size={18} />
              {saveError}
            </div>
          )}

          <div className="cp-subgrid-2col" style={{ marginBottom: '16px' }}>
            <div className="cp-form-group">
              <label className="cp-label">{t('portalPages.profile.fullName')}</label>
              <input
                type="text"
                className="cp-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="cp-form-group">
              <label className="cp-label">{t('portalPages.profile.email')}</label>
              <input
                type="email"
                className="cp-input"
                value={customer?.email || ''}
                disabled
                style={{ background: '#F8F6F9', color: 'var(--cp-text-muted)' }}
              />
            </div>
          </div>

          <div className="cp-subgrid-2col" style={{ marginBottom: '16px' }}>
            <div className="cp-form-group">
              <label className="cp-label">{t('portalPages.profile.phone')}</label>
              <input
                type="tel"
                className="cp-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('portalPages.profile.phonePlaceholder')}
              />
            </div>
            <div className="cp-form-group">
              <label className="cp-label">{t('portalPages.profile.language')}</label>
              <CustomSelect
                value={preferredLanguage}
                onChange={(val) => setPreferredLanguage(String(val))}
                options={Object.values(SUPPORTED_LANGUAGES).map((lang) => ({
                  value: lang.code,
                  label: `${lang.nativeName} (${lang.name})`,
                  badge: lang.shortCode,
                }))}
                size="md"
              />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--cp-border)', paddingTop: '20px', marginTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <FileCheck size={18} color="var(--cp-accent)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--cp-primary)', margin: 0 }}>
                {t('portalPages.profile.licenseTitle')}
              </h3>
              {customer?.isLicenseVerified ? (
                <span className="cp-badge cp-badge-success">{t('portalPages.documents.status.VERIFIED')}</span>
              ) : (
                <span className="cp-badge cp-badge-warning">{t('portalPages.profile.verificationPending')}</span>
              )}
            </div>

            <div className="cp-subgrid-2col">
              <div className="cp-form-group">
                <label className="cp-label">{t('portalPages.profile.licenseNumber')}</label>
                <input
                  type="text"
                  className="cp-input"
                  value={driverLicenseNumber}
                  onChange={(e) => setDriverLicenseNumber(e.target.value)}
                  placeholder={t('portalPages.documents.numberPlaceholder')}
                />
              </div>
              <div className="cp-form-group">
                <label className="cp-label">{t('portalPages.profile.licenseExpiry')}</label>
                <input
                  type="date"
                  className="cp-input"
                  value={licenseExpiryDate}
                  onChange={(e) => setLicenseExpiryDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button type="submit" className="cp-btn-primary" disabled={isSaving}>
              <Save size={16} />
              {isSaving ? t('portalPages.profile.saving') : t('portalPages.profile.save')}
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Security & Password */}
      {activeTab === 'security' && (
        <form onSubmit={handleChangePassword} className="cp-card" style={{ maxWidth: '600px' }}>
          <h2 className="cp-card-title" style={{ marginBottom: '20px' }}>{t('portalPages.profile.passwordTitle')}</h2>

          {passMessage && (
            <div
              style={{
                background: passMessage.type === 'success' ? 'var(--cp-success-bg)' : 'var(--cp-danger-bg)',
                color: passMessage.type === 'success' ? 'var(--cp-success)' : 'var(--cp-danger)',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '0.9rem',
              }}
            >
              {passMessage.text}
            </div>
          )}

          <div className="cp-form-group">
            <label className="cp-label">{t('portalPages.profile.currentPassword')}</label>
            <input
              type="password"
              className="cp-input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>

          <div className="cp-form-group">
            <label className="cp-label">{t('portalPages.profile.newPassword')}</label>
            <input
              type="password"
              className="cp-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div className="cp-form-group">
            <label className="cp-label">{t('portalPages.profile.confirmPassword')}</label>
            <input
              type="password"
              className="cp-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button type="submit" className="cp-btn-secondary" disabled={isChangingPass}>
              <KeyRound size={16} />
              {isChangingPass ? t('portalPages.profile.updating') : t('portalPages.profile.updatePassword')}
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Active Sessions */}
      {activeTab === 'sessions' && (
        <div className="cp-card" style={{ maxWidth: '800px' }}>
          <h2 className="cp-card-title" style={{ marginBottom: '16px' }}>{t('portalPages.profile.sessionsTitle')}</h2>
          <p style={{ color: 'var(--cp-text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
            {t('portalPages.profile.sessionsDesc')}
          </p>

          {sessionError && (
            <div role="alert" style={{ color: 'var(--cp-danger)', fontWeight: 600, fontSize: '0.88rem', marginBottom: '12px' }}>
              {sessionError}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sessions.map((s) => (
              <div
                key={s.id}
                style={{
                  border: '1px solid var(--cp-border)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Smartphone size={16} color="var(--cp-primary)" />
                    <span style={{ fontWeight: 700, color: 'var(--cp-primary)' }}>{s.userAgent || t('portalPages.profile.browser')}</span>
                    {s.isCurrent && <span className="cp-badge cp-badge-success">{t('portalPages.profile.currentSession')}</span>}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--cp-text-muted)', marginTop: '4px' }}>
                    {t('portalPages.profile.sessionLine', {
                      ip: s.ipAddress || t('portalPages.profile.unknownIp'),
                      date: new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(s.lastActiveAt)),
                    })}
                  </div>
                </div>

                {!s.isCurrent && (
                  <button
                    onClick={() => handleRevokeSession(s.id)}
                    className="cp-btn-danger"
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  >
                    {t('portalPages.profile.revoke')}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
