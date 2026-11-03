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
import './CustomerPortal.css';

export function CustomerSupportPage() {
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
      alert(err.message || 'Failed to submit ticket');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;
    try {
      setIsReplying(true);
      await customerPortalApi.replySupportTicket(selectedTicket.id, replyMessage.trim());
      setReplyMessage('');
      await fetchTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to send reply');
    } finally {
      setIsReplying(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <span className="cp-badge cp-badge-warning">Open</span>;
      case 'IN_PROGRESS':
        return <span className="cp-badge cp-badge-info">In Progress</span>;
      case 'RESOLVED':
        return <span className="cp-badge cp-badge-success">Resolved</span>;
      default:
        return <span className="cp-badge cp-badge-primary">Closed</span>;
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
          <h1 className="cp-page-title">Customer Concierge & Support</h1>
          <p className="cp-page-subtitle">24/7 Priority support, roadside assistance dispatch, and ticket inquiry hub.</p>
        </div>
        <div className="cp-header-actions">
          <button className="cp-btn-primary" onClick={() => setIsNewTicketOpen(true)}>
            <Plus size={16} />
            Open New Ticket
          </button>
        </div>
      </div>

      {/* Emergency Hotline Contact Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        <div className="cp-card" style={{ background: '#FFFDF5', borderColor: '#FDE68A' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Phone size={20} color="#D97706" />
            <span style={{ fontWeight: 800, color: '#92400E', fontSize: '1rem' }}>24/7 Roadside Emergency</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--cp-primary)' }}>
            +966 11 400 9000
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--cp-text-muted)', margin: '6px 0 0 0' }}>
            Direct technician and emergency towing dispatch across all highways.
          </p>
        </div>

        <div className="cp-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Mail size={20} color="var(--cp-primary)" />
            <span style={{ fontWeight: 800, color: 'var(--cp-primary)', fontSize: '1rem' }}>Concierge Email Desk</span>
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--cp-primary)' }}>
            support@finovo.com
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--cp-text-muted)', margin: '6px 0 0 0' }}>
            Average response time: <strong>under 15 minutes</strong> for active reservations.
          </p>
        </div>
      </div>

      {/* Tickets List */}
      <div className="cp-card">
        <h2 className="cp-card-title" style={{ marginBottom: '16px' }}>My Support Tickets</h2>

        {tickets.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tickets.map((t) => (
              <div
                key={t.id}
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
                onClick={() => setSelectedTicket(t)}
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
                        {t.subject}
                      </span>
                      {getStatusBadge(t.status)}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--cp-text-muted)', marginTop: '2px' }}>
                      Ticket #{t.ticketNumber} • Category: {t.category} • Priority: {t.priority} • Last updated:{' '}
                      {new Date(t.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--cp-text-muted)' }}>
                    {t.messages?.length || 1} messages
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
            <h3 className="cp-empty-title">No Support Inquiries</h3>
            <p className="cp-empty-desc">
              Have a question regarding your booking, invoice, or vehicle return? Open a ticket anytime.
            </p>
            <button className="cp-btn-primary" onClick={() => setIsNewTicketOpen(true)}>
              Open First Ticket
            </button>
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      {isNewTicketOpen && (
        <div className="cp-modal-backdrop">
          <div className="cp-modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 className="cp-card-title">Open Support Ticket</h2>
              <button
                onClick={() => setIsNewTicketOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cp-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket}>
              <div className="cp-form-group">
                <label className="cp-label">Subject</label>
                <input
                  type="text"
                  className="cp-input"
                  placeholder="e.g. Question about deposit return"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="cp-form-group">
                  <label className="cp-label">Category</label>
                  <select className="cp-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="BOOKING">Booking & Scheduling</option>
                    <option value="PAYMENT">Billing & Security Deposit</option>
                    <option value="INSPECTION">Damage Inspection Dispute</option>
                    <option value="ROADSIDE">Roadside Assistance</option>
                    <option value="GENERAL">General Inquiries</option>
                  </select>
                </div>

                <div className="cp-form-group">
                  <label className="cp-label">Priority</label>
                  <select className="cp-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent (Immediate Callback)</option>
                  </select>
                </div>
              </div>

              <div className="cp-form-group">
                <label className="cp-label">Detailed Message</label>
                <textarea
                  className="cp-textarea"
                  rows={4}
                  placeholder="Please describe how we can assist you..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="cp-btn-outline" onClick={() => setIsNewTicketOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="cp-btn-primary" disabled={isCreating}>
                  {isCreating ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Conversation Modal / Drawer */}
      {selectedTicket && (
        <div className="cp-modal-backdrop">
          <div className="cp-modal-box" style={{ maxWidth: '680px', display: 'flex', flexDirection: 'column', height: '80vh' }}>
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
                      {msg.senderName} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{msg.message}</div>
                  </div>
                );
              })}
            </div>

            {/* Reply Input Bar */}
            <form onSubmit={handleSendReply} style={{ borderTop: '1px solid var(--cp-border)', paddingTop: '16px', display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Type your reply to the concierge team..."
                className="cp-input"
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                required
              />
              <button type="submit" className="cp-btn-primary" disabled={isReplying || !replyMessage.trim()}>
                <Send size={16} />
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
