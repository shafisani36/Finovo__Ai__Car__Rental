import { useState, useEffect } from 'react';
import {
  LifeBuoy,
  MessageSquare,
  Phone,
  Mail,
  Plus,
  Send,
  X,
  ChevronRight,
} from 'lucide-react';
import { customerPortalApi, type SupportTicketItem } from '../api/customerPortalApi';
import { CustomSelect } from '../../../components/common/CustomSelect';
import './CustomerPortal.css';
import { telHref, useSiteInfo } from '../../../hooks/usePublicSite';
import { useTranslation } from 'react-i18next';

export function CustomerSupportPage() {
  const { t, i18n } = useTranslation();
  const formatDate = (value: string) => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(value));
  const formatDateTime = (value: string) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  const [formError, setFormError] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);
  const site = useSiteInfo();
  const [tickets, setTickets] = useState<SupportTicketItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New ticket modal
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('BOOKING');
  const [priority, setPriority] = useState('NORMAL');
  const [bookingId, setBookingId] = useState('');
  const [message, setMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Active ticket drawer
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketItem | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const res = await customerPortalApi.listSupportTickets();
      if (res.success) {
        setTickets(res.tickets);
        if (selectedTicket) {
          const updated = res.tickets.find((t) => t.id === selectedTicket.id);
          if (updated) setSelectedTicket(updated);
        }
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) return;
    try {
      setIsCreating(true);
      setFormError(null);
      const res = await customerPortalApi.createSupportTicket({
        subject,
        category,
        priority,
        bookingId: bookingId || undefined,
        message,
      });
      if (res.success) {
        setIsNewTicketOpen(false);
        setSubject('');
        setMessage('');
        setBookingId('');
        await fetchTickets();
      }
    } catch (err: any) {
      setFormError(err?.message || t('portalPages.support.errCreate'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;
    try {
      setIsReplying(true);
      setReplyError(null);
      await customerPortalApi.replySupportTicket(selectedTicket.id, replyMessage.trim());
      setReplyMessage('');
      await fetchTickets();
    } catch (err: any) {
      setReplyError(err?.message || t('portalPages.support.errReply'));
    } finally {
      setIsReplying(false);
    }
  };

  const openNewTicket = () => {
    setFormError(null);
    setIsNewTicketOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <span className="cp-badge cp-badge-warning">{t('portalPages.support.status.OPEN')}</span>;
      case 'IN_PROGRESS':
        return <span className="cp-badge cp-badge-info">{t('portalPages.support.status.IN_PROGRESS')}</span>;
      case 'RESOLVED':
        return <span className="cp-badge cp-badge-success">{t('portalPages.support.status.RESOLVED')}</span>;
      default:
        return <span className="cp-badge cp-badge-primary">{t('portalPages.support.status.CLOSED')}</span>;
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
          <h1 className="cp-page-title">{t('portalPages.support.title')}</h1>
          <p className="cp-page-subtitle">{t('portalPages.support.subtitle')}</p>
        </div>
        <div className="cp-header-actions">
          <button className="cp-btn-primary" onClick={openNewTicket}>
            <Plus size={16} />
            {t('portalPages.support.newTicket')}
          </button>
        </div>
      </div>

      {/* Emergency Hotline Contact Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px' }}>
        {site?.supportPhone && (
        <div className="cp-card" style={{ background: '#FFFDF5', borderColor: '#FDE68A' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Phone size={20} color="#D97706" />
            <span style={{ fontWeight: 800, color: '#92400E', fontSize: '1rem' }}>{t('portalPages.support.phoneTitle')}</span>
          </div>
          <a
            href={telHref(site.supportPhone)}
            className="phone-number"
            style={{ display: 'block', fontSize: '1.4rem', fontWeight: 800, color: 'var(--cp-primary)', textDecoration: 'none', overflowWrap: 'anywhere' }}
          >
            {site.supportPhone}
          </a>
          <p style={{ fontSize: '0.82rem', color: 'var(--cp-text-muted)', margin: '6px 0 0 0' }}>
            {t('portalPages.support.phoneDesc')}
          </p>
        </div>
        )}

        {site?.supportEmail && (
        <div className="cp-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Mail size={20} color="var(--cp-primary)" />
            <span style={{ fontWeight: 800, color: 'var(--cp-primary)', fontSize: '1rem' }}>{t('portalPages.support.emailTitle')}</span>
          </div>
          <a
            href={`mailto:${site.supportEmail}`}
            style={{ display: 'block', fontSize: '1.2rem', fontWeight: 700, color: 'var(--cp-primary)', textDecoration: 'none', overflowWrap: 'anywhere' }}
          >
            {site.supportEmail}
          </a>
          <p style={{ fontSize: '0.82rem', color: 'var(--cp-text-muted)', margin: '6px 0 0 0' }}>
            {t('portalPages.support.emailDesc')}
          </p>
        </div>
        )}
      </div>

      {/* Tickets List */}
      <div className="cp-card">
        <h2 className="cp-card-title" style={{ marginBottom: '16px' }}>{t('portalPages.support.listTitle')}</h2>

        {tickets.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                style={{
                  border: '1px solid var(--cp-border)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'var(--cp-transition)',
                }}
                onClick={() => {
                  setReplyError(null);
                  setSelectedTicket(ticket);
                }}
                className="hover-card"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: '#F8F6F9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MessageSquare size={18} color="var(--cp-primary)" />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--cp-primary)', fontSize: '0.98rem' }}>
                        {ticket.subject}
                      </span>
                      {getStatusBadge(ticket.status)}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--cp-text-muted)', marginTop: '2px' }}>
                      {t('portalPages.support.ticketLine', {
                        number: ticket.ticketNumber,
                        category: t(`portalPages.support.categories.${ticket.category}`, { defaultValue: ticket.category }),
                        priority: t(`portalPages.support.priorities.${ticket.priority}`, { defaultValue: ticket.priority }),
                        date: formatDate(ticket.updatedAt),
                      })}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--cp-text-muted)' }}>
                    {t('portalPages.support.messages', { count: ticket.messages?.length || 1 })}
                  </span>
                  <ChevronRight size={16} color="var(--cp-text-muted)" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="cp-empty-state">
            <div className="cp-empty-icon">
              <LifeBuoy size={32} />
            </div>
            <h3 className="cp-empty-title">{t('portalPages.support.emptyTitle')}</h3>
            <p className="cp-empty-desc">
              {t('portalPages.support.emptyDesc')}
            </p>
            <button className="cp-btn-primary" onClick={openNewTicket}>
              {t('portalPages.support.firstTicket')}
            </button>
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      {isNewTicketOpen && (
        <div className="cp-modal-backdrop">
          <div className="cp-modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 className="cp-card-title">{t('portalPages.support.modalTitle')}</h2>
              <button
                onClick={() => setIsNewTicketOpen(false)}
                aria-label={t('portalPages.support.close')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cp-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket}>
              {formError && (
                <div role="alert" style={{ color: 'var(--cp-danger)', fontWeight: 600, fontSize: '0.88rem', marginBottom: '12px' }}>
                  {formError}
                </div>
              )}
              <div className="cp-form-group">
                <label className="cp-label">{t('portalPages.support.subject')}</label>
                <input
                  type="text"
                  className="cp-input"
                  placeholder={t('portalPages.support.subjectPlaceholder')}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: '12px' }}>
                <div className="cp-form-group">
                  <label className="cp-label">{t('portalPages.support.category')}</label>
                  <CustomSelect
                    value={category}
                    onChange={(val) => setCategory(String(val))}
                    options={[
                      ...(['BOOKING', 'PAYMENT', 'INSPECTION', 'ROADSIDE', 'GENERAL'] as const).map((value) => ({
                        value,
                        label: t(`portalPages.support.categories.${value}`),
                      })),
                    ]}
                    size="md"
                  />
                </div>

                <div className="cp-form-group">
                  <label className="cp-label">{t('portalPages.support.priority')}</label>
                  <CustomSelect
                    value={priority}
                    onChange={(val) => setPriority(String(val))}
                    options={[
                      ...(['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const).map((value) => ({
                        value,
                        label: t(`portalPages.support.priorities.${value}`),
                      })),
                    ]}
                    size="md"
                  />
                </div>
              </div>

              <div className="cp-form-group">
                <label className="cp-label">{t('portalPages.support.message')}</label>
                <textarea
                  className="cp-textarea"
                  rows={4}
                  placeholder={t('portalPages.support.messagePlaceholder')}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="cp-btn-outline" onClick={() => setIsNewTicketOpen(false)}>
                  {t('portalPages.support.cancel')}
                </button>
                <button type="submit" className="cp-btn-primary" disabled={isCreating}>
                  {isCreating ? t('portalPages.support.submitting') : t('portalPages.support.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Conversation Modal / Drawer */}
      {selectedTicket && (
        <div className="cp-modal-backdrop">
          <div className="cp-modal-box" style={{ maxWidth: '680px', display: 'flex', flexDirection: 'column', height: 'min(82dvh, 640px)', maxHeight: 'calc(100dvh - 24px)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--cp-border)', paddingBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="cp-badge cp-badge-accent">#{selectedTicket.ticketNumber}</span>
                  {getStatusBadge(selectedTicket.status)}
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--cp-primary)', margin: '6px 0 0 0' }}>
                  {selectedTicket.subject}
                </h2>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                aria-label={t('portalPages.support.close')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cp-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages Scrollable Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {selectedTicket.messages?.map((msg) => {
                const isCustomer = msg.senderType === 'CUSTOMER';
                return (
                  <div
                    key={msg.id}
                    style={{
                      alignSelf: isCustomer ? 'flex-end' : 'flex-start',
                      maxWidth: '80%',
                      background: isCustomer ? 'var(--cp-primary)' : '#F8F6F9',
                      color: isCustomer ? '#FFFFFF' : 'var(--cp-primary)',
                      padding: '12px 16px',
                      borderRadius: isCustomer ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '4px', fontWeight: 600 }}>
                      {msg.senderName} • {formatDateTime(msg.createdAt)}
                    </div>
                    <div style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{msg.message}</div>
                  </div>
                );
              })}
            </div>

            {replyError && (
              <div role="alert" style={{ color: 'var(--cp-danger)', fontWeight: 600, fontSize: '0.85rem', paddingTop: '8px' }}>
                {replyError}
              </div>
            )}

            {/* Reply Input Bar */}
            <form onSubmit={handleSendReply} style={{ borderTop: '1px solid var(--cp-border)', paddingTop: '16px', display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder={t('portalPages.support.replyPlaceholder')}
                className="cp-input"
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                required
              />
              <button type="submit" className="cp-btn-primary" disabled={isReplying || !replyMessage.trim()}>
                <Send size={16} />
                {t('portalPages.support.send')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
