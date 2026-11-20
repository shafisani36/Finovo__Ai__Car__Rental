import type { CSSProperties } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { LifeBuoy, Search, Send, Mail, Phone, CalendarCheck, RefreshCw } from 'lucide-react';
import { PageContainer, PageHeader, EmptyState, LoadingState } from '../../../components/common';
import {
  supportTicketApi,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type TicketDetail,
  type TicketPriority,
  type TicketStatus,
  type TicketSummary,
} from '../api/supportTicketApi';

const STATUS_STYLE: Record<TicketStatus, { bg: string; fg: string }> = {
  OPEN: { bg: '#FEF3C7', fg: '#92400E' },
  IN_PROGRESS: { bg: '#DBEAFE', fg: '#1D4ED8' },
  RESOLVED: { bg: '#D1FAE5', fg: '#047857' },
  CLOSED: { bg: '#F3F4F6', fg: '#4B5563' },
};
const PRIORITY_COLOR: Record<TicketPriority, string> = { LOW: '#6B7280', NORMAL: '#1D4ED8', HIGH: '#B45309', URGENT: '#B91C1C' };

const CARD: CSSProperties = { background: '#FFFFFF', border: '1px solid #EDE7F0', borderRadius: '14px' };
const SELECT: CSSProperties = { borderRadius: '8px', border: '1px solid #E5E7EB', padding: '6px 8px', fontWeight: 600, fontSize: '0.82rem', background: '#FFFFFF' };

/**
 * Staff inbox for the tickets customers open from their account: read the conversation, answer, and mark the
 * ticket as solved. Customers are emailed every time staff answer.
 */
export function SupportTicketsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('ticket');

  const [status, setStatus] = useState<TicketStatus | ''>('OPEN');
  const [search, setSearch] = useState('');
  const [tickets, setTickets] = useState<TicketSummary[] | null>(null);
  const [counts, setCounts] = useState<Record<TicketStatus, number> | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const [loadedTicket, setTicket] = useState<TicketDetail | null>(null);
  const [reply, setReply] = useState('');
  const [replyStatus, setReplyStatus] = useState<Exclude<TicketStatus, 'OPEN'>>('IN_PROGRESS');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);
  // Only the ticket that is open in the address bar is shown
  const ticket = loadedTicket && loadedTicket.id === selectedId ? loadedTicket : null;

  const loadList = useCallback(async () => {
    try {
      const res = await supportTicketApi.list({ status, search: search.trim() });
      setTickets(res.tickets);
      setCounts(res.counts);
      setListError(null);
    } catch (err) {
      setListError(err instanceof Error ? err.message : t('adminPages.supportTickets.errLoad'));
    }
  }, [status, search, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadList(), 250);
    return () => window.clearTimeout(timer);
  }, [loadList]);

  const loadTicket = useCallback(async (id: string) => {
    try {
      const res = await supportTicketApi.get(id);
      setTicket(res.ticket);
      setActionError(null);
    } catch (err) {
      setTicket(null);
      setActionError(err instanceof Error ? err.message : t('adminPages.supportTickets.errLoad'));
    }
  }, [t]);

  useEffect(() => {
    if (selectedId) void loadTicket(selectedId);
  }, [selectedId, loadTicket]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ block: 'end' });
  }, [ticket?.messages.length]);

  const select = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('ticket', id);
    setSearchParams(next);
    setReply('');
    setReplyStatus('IN_PROGRESS');
  };

  const sendReply = async () => {
    if (!ticket || reply.trim().length < 2) return;
    setBusy(true);
    setActionError(null);
    try {
      const res = await supportTicketApi.reply(ticket.id, reply.trim(), replyStatus);
      setTicket(res.ticket);
      setReply('');
      void loadList();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('adminPages.supportTickets.errAction'));
    } finally {
      setBusy(false);
    }
  };

  const change = async (changes: { status?: TicketStatus; priority?: TicketPriority }) => {
    if (!ticket) return;
    setBusy(true);
    setActionError(null);
    try {
      const res = await supportTicketApi.update(ticket.id, changes);
      setTicket(res.ticket);
      void loadList();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('adminPages.supportTickets.errAction'));
    } finally {
      setBusy(false);
    }
  };

  const statusTag = (s: TicketStatus) => (
    <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 800, background: STATUS_STYLE[s]?.bg, color: STATUS_STYLE[s]?.fg }}>
      {t(`adminPages.supportTickets.status.${s}`)}
    </span>
  );
  const when = (iso: string) => new Date(iso).toLocaleString();

  return (
    <PageContainer>
      <PageHeader
        title={t('adminPages.supportTickets.title')}
        subtitle={t('adminPages.supportTickets.subtitle', { count: counts?.OPEN ?? 0 })}
        breadcrumbs={[{ label: t('adminPages.promoCodes.admin'), to: '/admin/dashboard' }, { label: t('adminPages.supportTickets.title') }]}
        actions={
          <button
            type="button"
            onClick={() => {
              void loadList();
              if (selectedId) void loadTicket(selectedId);
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
          >
            <RefreshCw size={16} /> {t('adminPages.supportTickets.refresh')}
          </button>
        }
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
        {(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', ''] as const).map((s) => (
          <button
            key={s || 'ALL'}
            type="button"
            onClick={() => setStatus(s)}
            style={{
              padding: '8px 14px',
              borderRadius: '999px',
              border: '1px solid',
              borderColor: status === s ? '#1E0426' : '#E5E7EB',
              background: status === s ? '#1E0426' : '#FFFFFF',
              color: status === s ? '#FFFFFF' : '#374151',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            {s ? t(`adminPages.supportTickets.status.${s}`) : t('adminPages.supportTickets.all')}
            {s && counts ? ` (${counts[s] ?? 0})` : ''}
          </button>
        ))}
        <div style={{ position: 'relative', marginInlineStart: 'auto', minWidth: '240px', flex: '0 1 320px' }}>
          <Search size={15} style={{ position: 'absolute', insetInlineStart: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('adminPages.supportTickets.search')}
            style={{ width: '100%', padding: '9px 12px 9px 32px', borderRadius: '10px', border: '1px solid #E5E7EB', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 380px) minmax(0, 1fr)', gap: '16px', alignItems: 'start' }} className="support-inbox-grid">
        {/* Ticket list */}
        <div style={{ ...CARD, overflow: 'hidden' }}>
          {listError && <div role="alert" style={{ padding: '14px', color: '#B91C1C', fontWeight: 600 }}>{listError}</div>}
          {!tickets && !listError && <LoadingState message={t('adminPages.supportTickets.loading')} />}
          {tickets && tickets.length === 0 && (
            <EmptyState icon={LifeBuoy} title={t('adminPages.supportTickets.emptyTitle')} description={t('adminPages.supportTickets.emptyText')} />
          )}
          {tickets?.map((tk) => (
            <button
              key={tk.id}
              type="button"
              onClick={() => select(tk.id)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'start',
                padding: '14px 16px',
                border: 'none',
                borderBottom: '1px solid #F3F0F5',
                borderInlineStart: `4px solid ${tk.id === selectedId ? '#6C1E84' : 'transparent'}`,
                background: tk.id === selectedId ? 'rgba(108, 30, 132, 0.06)' : '#FFFFFF',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, color: '#1E0426', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tk.subject}</span>
                {statusTag(tk.status)}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '2px' }}>
                {tk.customer.fullName} · #{tk.ticketNumber}
              </div>
              {tk.lastMessage && (
                <div style={{ fontSize: '0.82rem', color: '#374151', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tk.lastMessage.senderType === 'CUSTOMER' ? '' : `${t('adminPages.supportTickets.you')}: `}
                  {tk.lastMessage.message}
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', fontSize: '0.75rem', color: '#9CA3AF', marginTop: '4px' }}>
                <span style={{ color: PRIORITY_COLOR[tk.priority], fontWeight: 700 }}>{t(`adminPages.supportTickets.priority.${tk.priority}`)}</span>
                <span>{when(tk.updatedAt)}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Conversation */}
        <div style={{ ...CARD, padding: '18px', minHeight: '420px' }}>
          {!selectedId && (
            <EmptyState icon={LifeBuoy} title={t('adminPages.supportTickets.pickTitle')} description={t('adminPages.supportTickets.pickText')} />
          )}
          {selectedId && !ticket && !actionError && <LoadingState message={t('adminPages.supportTickets.loading')} />}
          {ticket && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#1E0426' }}>{ticket.subject}</h2>
                  <div style={{ fontSize: '0.82rem', color: '#6B7280', marginTop: '4px' }}>
                    #{ticket.ticketNumber} · {t(`portalPages.support.categories.${ticket.category}`, { defaultValue: ticket.category })} · {when(ticket.createdAt)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', display: 'grid', gap: '2px' }}>
                    {t('adminPages.supportTickets.statusLabel')}
                    <select value={ticket.status} disabled={busy} onChange={(e) => void change({ status: e.target.value as TicketStatus })} style={SELECT}>
                      {TICKET_STATUSES.map((s) => (
                        <option key={s} value={s}>{t(`adminPages.supportTickets.status.${s}`)}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', display: 'grid', gap: '2px' }}>
                    {t('adminPages.supportTickets.priorityLabel')}
                    <select value={ticket.priority} disabled={busy} onChange={(e) => void change({ priority: e.target.value as TicketPriority })} style={SELECT}>
                      {TICKET_PRIORITIES.map((p) => (
                        <option key={p} value={p}>{t(`adminPages.supportTickets.priority.${p}`)}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              {/* Customer */}
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.85rem', color: '#374151', padding: '10px 12px', background: '#FAF7FB', borderRadius: '10px', margin: '14px 0' }}>
                <strong style={{ color: '#1E0426' }}>{ticket.customer.fullName}</strong>
                <a href={`mailto:${ticket.customer.email}`} style={{ color: '#6C1E84', display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                  <Mail size={14} /> {ticket.customer.email}
                </a>
                {ticket.customer.phone && (
                  <a href={`tel:${ticket.customer.phone}`} style={{ color: '#6C1E84', display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                    <Phone size={14} /> {ticket.customer.phone}
                  </a>
                )}
                {ticket.booking && (
                  <Link to={`/admin/bookings?search=${encodeURIComponent(ticket.booking.bookingNumber)}`} style={{ color: '#6C1E84', display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                    <CalendarCheck size={14} /> #{ticket.booking.bookingNumber}
                  </Link>
                )}
              </div>

              {/* Messages */}
              <div style={{ display: 'grid', gap: '10px', maxHeight: '420px', overflowY: 'auto', padding: '4px' }}>
                {ticket.messages.map((m) => {
                  const fromCustomer = m.senderType === 'CUSTOMER';
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: fromCustomer ? 'flex-start' : 'flex-end' }}>
                      <div
                        style={{
                          maxWidth: '78%',
                          padding: '10px 12px',
                          borderRadius: '12px',
                          background: fromCustomer ? '#F3F4F6' : '#1E0426',
                          color: fromCustomer ? '#111827' : '#FFFFFF',
                        }}
                      >
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, opacity: 0.75, marginBottom: '4px' }}>
                          {m.senderName} · {when(m.createdAt)}
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.9rem' }}>{m.message}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEnd} />
              </div>

              {/* Reply */}
              <div style={{ marginTop: '14px', borderTop: '1px solid #F3F0F5', paddingTop: '14px' }}>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={4}
                  maxLength={5000}
                  placeholder={t('adminPages.supportTickets.replyPlaceholder')}
                  style={{ width: '100%', borderRadius: '10px', border: '1px solid #E5E7EB', padding: '10px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
                {actionError && <div role="alert" style={{ color: '#B91C1C', fontWeight: 600, fontSize: '0.85rem', margin: '6px 0' }}>{actionError}</div>}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', marginTop: '8px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                    {t('adminPages.supportTickets.afterReply')}
                    <select value={replyStatus} onChange={(e) => setReplyStatus(e.target.value as Exclude<TicketStatus, 'OPEN'>)} style={SELECT}>
                      <option value="IN_PROGRESS">{t('adminPages.supportTickets.status.IN_PROGRESS')}</option>
                      <option value="RESOLVED">{t('adminPages.supportTickets.status.RESOLVED')}</option>
                      <option value="CLOSED">{t('adminPages.supportTickets.status.CLOSED')}</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={busy || reply.trim().length < 2}
                    onClick={() => void sendReply()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 18px',
                      background: '#1E0426',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      opacity: busy || reply.trim().length < 2 ? 0.5 : 1,
                    }}
                  >
                    <Send size={15} /> {busy ? t('adminPages.supportTickets.sending') : t('adminPages.supportTickets.send')}
                  </button>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: '6px', textAlign: 'end' }}>{t('adminPages.supportTickets.emailNote')}</div>
              </div>
            </>
          )}
          {selectedId && !ticket && actionError && <div role="alert" style={{ color: '#B91C1C', fontWeight: 600 }}>{actionError}</div>}
        </div>
      </div>
      <style>{`@media (max-width: 900px) { .support-inbox-grid { grid-template-columns: 1fr !important; } }`}</style>
    </PageContainer>
  );
}
