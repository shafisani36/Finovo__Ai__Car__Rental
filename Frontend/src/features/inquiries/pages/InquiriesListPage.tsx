import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Search,
  CheckCircle2,
  Clock,
  Send,
  Trash2,
  RotateCcw,
  Eye,
  Mail,
  User,
  Phone,
  Calendar,
} from 'lucide-react';
import {
  PageContainer,
  PageHeader,
  StatCard,
  StatGrid,
  Modal,
} from '../../../components/common';
import { inquiryApi, type Inquiry } from '../../../api/services/inquiry.api';

export function InquiriesListPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);

  // Reply Composer State
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Deletion Modal
  const [inquiryToDelete, setInquiryToDelete] = useState<Inquiry | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadInquiries();
  }, [statusFilter]);

  const loadInquiries = async (search?: string) => {
    try {
      setLoading(true);
      const res = await inquiryApi.listInquiries({
        search: search !== undefined ? search : searchQuery,
        status: statusFilter,
      });
      if (res.success) {
        setInquiries(res.inquiries);
      }
    } catch (err: any) {
      console.error('Failed to load inquiries:', err);
      setActionError('Failed to fetch inquiries.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadInquiries(searchQuery);
  };

  const handleStatusChange = async (inquiryId: string, newStatus: Inquiry['status']) => {
    try {
      setActionSuccess(null);
      setActionError(null);
      const res = await inquiryApi.updateStatus(inquiryId, newStatus);
      if (res.success) {
        setInquiries((prev) =>
          prev.map((item) => (item.id === inquiryId ? { ...item, status: newStatus } : item))
        );
        if (selectedInquiry?.id === inquiryId) {
          setSelectedInquiry((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
        setActionSuccess(`Inquiry marked as ${newStatus}`);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to update status.');
    }
  };

  const handleSendReply = async () => {
    if (!selectedInquiry) return;
    if (!replyText.trim()) {
      setActionError('Reply message cannot be empty.');
      return;
    }

    try {
      setSendingReply(true);
      setActionError(null);
      setActionSuccess(null);
      const res = await inquiryApi.replyToInquiry(selectedInquiry.id, replyText);
      if (res.success) {
        setInquiries((prev) =>
          prev.map((item) => (item.id === selectedInquiry.id ? res.inquiry : item))
        );
        setSelectedInquiry(res.inquiry);
        setReplyText('');
        setActionSuccess('Reply sent successfully and recorded in inquiry history.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to send reply.');
    } finally {
      setSendingReply(false);
    }
  };

  const handleDelete = async () => {
    if (!inquiryToDelete) return;
    try {
      setDeleting(true);
      const res = await inquiryApi.deleteInquiry(inquiryToDelete.id);
      if (res.success) {
        setInquiries((prev) => prev.filter((item) => item.id !== inquiryToDelete.id));
        if (selectedInquiry?.id === inquiryToDelete.id) {
          setSelectedInquiry(null);
        }
        setInquiryToDelete(null);
        setActionSuccess('Inquiry deleted successfully.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete inquiry.');
    } finally {
      setDeleting(false);
    }
  };

  const totalCount = inquiries.length;
  const newCount = inquiries.filter((i) => i.status === 'NEW').length;
  const inProgressCount = inquiries.filter((i) => i.status === 'IN_PROGRESS').length;
  const repliedCount = inquiries.filter((i) => i.status === 'REPLIED').length;

  const getStatusBadge = (status: Inquiry['status']) => {
    switch (status) {
      case 'NEW':
        return {
          bg: 'rgba(239, 68, 68, 0.12)',
          color: '#DC2626',
          label: 'NEW',
        };
      case 'IN_PROGRESS':
        return {
          bg: 'rgba(245, 183, 22, 0.18)',
          color: '#B45309',
          label: 'IN PROGRESS',
        };
      case 'REPLIED':
        return {
          bg: 'rgba(16, 185, 129, 0.14)',
          color: '#059669',
          label: 'REPLIED',
        };
      case 'CLOSED':
        return {
          bg: 'rgba(107, 114, 128, 0.14)',
          color: '#4B5563',
          label: 'CLOSED',
        };
      default:
        return { bg: '#ECEAEF', color: '#1E0426', label: status };
    }
  };

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title="Customer Inquiries & Messages"
        subtitle="Review, manage, and respond to incoming inquiries submitted via the Contact Us portal."
        breadcrumbs={[
          { label: 'Admin', to: '/admin/dashboard' },
          { label: 'Inquiries' },
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
          icon={MessageSquare}
          label="Total Inquiries"
          value={totalCount}
          variant="purple"
        />
        <StatCard
          icon={Clock}
          label="Pending / New"
          value={newCount}
          variant="gold"
        />
        <StatCard
          icon={RotateCcw}
          label="In Progress"
          value={inProgressCount}
          variant="purple"
        />
        <StatCard
          icon={CheckCircle2}
          label="Replied"
          value={repliedCount}
          variant="green"
        />
      </StatGrid>

      {/* Filter and Search Bar */}
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
        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['ALL', 'NEW', 'IN_PROGRESS', 'REPLIED', 'CLOSED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: statusFilter === st ? '1.5px solid #1E0426' : '1px solid #ECEAEF',
                backgroundColor: statusFilter === st ? '#1E0426' : '#FFFFFF',
                color: statusFilter === st ? '#FFFFFF' : '#4A315A',
                transition: 'all 0.15s ease',
              }}
            >
              {st === 'ALL' ? 'All Inquiries' : st.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search form */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: '1 1 280px', maxWidth: '400px' }}>
          <div
            style={{
              position: 'relative',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search
              size={16}
              style={{ position: 'absolute', left: '12px', color: '#8A7090' }}
            />
            <input
              type="text"
              placeholder="Search sender, email, subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '8px',
                border: '1px solid #ECEAEF',
                backgroundColor: '#FAF9FB',
                fontSize: '0.875rem',
                color: '#1E0426',
                outline: 'none',
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '9px 18px',
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
      </div>

      {/* Inquiries Table */}
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
            <div style={{ marginTop: '12px', fontWeight: 600 }}>Loading customer inquiries...</div>
          </div>
        ) : inquiries.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#685D73' }}>
            <MessageSquare size={40} color="#D1D5DB" style={{ marginBottom: '12px' }} />
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1E0426' }}>No inquiries found</div>
            <div style={{ fontSize: '0.875rem', marginTop: '4px' }}>
              Inquiries submitted through the Contact Us page will appear here.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#FAF9FB', borderBottom: '1px solid #ECEAEF', color: '#685D73' }}>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Sender</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Subject & Message</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Submitted</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.map((inq) => {
                  const badge = getStatusBadge(inq.status);
                  return (
                    <tr
                      key={inq.id}
                      style={{
                        borderBottom: '1px solid #ECEAEF',
                        transition: 'background-color 0.15s',
                      }}
                    >
                      {/* Sender */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 700, color: '#1E0426' }}>{inq.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#685D73' }}>{inq.email}</div>
                        {inq.phone && <div style={{ fontSize: '0.75rem', color: '#8A7090' }}>{inq.phone}</div>}
                      </td>

                      {/* Subject & Preview */}
                      <td style={{ padding: '16px 20px', maxWidth: '350px' }}>
                        <div style={{ fontWeight: 700, color: '#1E0426' }}>{inq.subject}</div>
                        <div
                          style={{
                            fontSize: '0.8125rem',
                            color: '#685D73',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            marginTop: '2px',
                          }}
                        >
                          {inq.message}
                        </div>
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
                            backgroundColor: badge.bg,
                            color: badge.color,
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>

                      {/* Date */}
                      <td style={{ padding: '16px 20px', fontSize: '0.8125rem', color: '#685D73' }}>
                        {new Date(inq.createdAt).toLocaleDateString()} {new Date(inq.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInquiry(inq);
                              setReplyText('');
                              setActionSuccess(null);
                              setActionError(null);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
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
                            <Eye size={13} />
                            View & Reply
                          </button>
                          <button
                            type="button"
                            onClick={() => setInquiryToDelete(inq)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '28px',
                              height: '28px',
                              backgroundColor: '#FEF2F2',
                              border: '1px solid #FECACA',
                              borderRadius: '8px',
                              color: '#DC2626',
                              cursor: 'pointer',
                            }}
                            title="Delete Inquiry"
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

      {/* Inquiry Detail & Reply Modal */}
      {selectedInquiry && (
        <Modal
          isOpen={!!selectedInquiry}
          onClose={() => setSelectedInquiry(null)}
          title={`Inquiry from ${selectedInquiry.name}`}
          subtitle={`Submitted on ${new Date(selectedInquiry.createdAt).toLocaleString()}`}
          maxWidth="700px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Sender Metadata Box */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                backgroundColor: '#FAF9FB',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid #ECEAEF',
                fontSize: '0.875rem',
              }}
            >
              <div>
                <div style={{ color: '#8A7090', fontSize: '0.75rem', fontWeight: 600 }}>Sender</div>
                <div style={{ fontWeight: 700, color: '#1E0426' }}>{selectedInquiry.name}</div>
              </div>
              <div>
                <div style={{ color: '#8A7090', fontSize: '0.75rem', fontWeight: 600 }}>Email</div>
                <div style={{ fontWeight: 700, color: '#1E0426' }}>{selectedInquiry.email}</div>
              </div>
              <div>
                <div style={{ color: '#8A7090', fontSize: '0.75rem', fontWeight: 600 }}>Phone</div>
                <div style={{ fontWeight: 700, color: '#1E0426' }}>{selectedInquiry.phone || 'Not provided'}</div>
              </div>
              <div>
                <div style={{ color: '#8A7090', fontSize: '0.75rem', fontWeight: 600 }}>Status Control</div>
                <select
                  value={selectedInquiry.status}
                  onChange={(e) => handleStatusChange(selectedInquiry.id, e.target.value as Inquiry['status'])}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid #ECEAEF',
                    backgroundColor: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    color: '#1E0426',
                    cursor: 'pointer',
                    marginTop: '2px',
                  }}
                >
                  <option value="NEW">NEW</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="REPLIED">REPLIED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>
            </div>

            {/* Inquiry Content */}
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#8A7090', marginBottom: '6px' }}>
                Subject
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E0426' }}>
                {selectedInquiry.subject}
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#8A7090', marginTop: '16px', marginBottom: '6px' }}>
                Message
              </div>
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: '16px',
                  borderRadius: '10px',
                  border: '1px solid #ECEAEF',
                  color: '#1E0426',
                  fontSize: '0.925rem',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {selectedInquiry.message}
              </div>
            </div>

            {/* Previous Reply Section if exists */}
            {selectedInquiry.replyMessage && (
              <div
                style={{
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: '12px',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 800, color: '#166534', fontSize: '0.875rem' }}>
                    ✓ Reply Sent ({selectedInquiry.repliedBy || 'Admin'})
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#15803D' }}>
                    {selectedInquiry.repliedAt ? new Date(selectedInquiry.repliedAt).toLocaleString() : ''}
                  </div>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#14532D', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                  {selectedInquiry.replyMessage}
                </div>
              </div>
            )}

            {/* Reply Composer */}
            <div style={{ borderTop: '1px solid #ECEAEF', paddingTop: '16px' }}>
              <div style={{ fontWeight: 800, fontSize: '0.925rem', color: '#1E0426', marginBottom: '8px' }}>
                {selectedInquiry.replyMessage ? 'Send Another Reply' : 'Compose Email Reply'}
              </div>
              <textarea
                rows={4}
                placeholder={`Type your reply to ${selectedInquiry.name}...`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #ECEAEF',
                  backgroundColor: '#FAF9FB',
                  fontSize: '0.875rem',
                  color: '#1E0426',
                  outline: 'none',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedInquiry(null)}
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
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSendReply}
                  disabled={sendingReply || !replyText.trim()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 20px',
                    borderRadius: '8px',
                    backgroundColor: '#1E0426',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    color: '#FFFFFF',
                    cursor: sendingReply || !replyText.trim() ? 'not-allowed' : 'pointer',
                    opacity: sendingReply || !replyText.trim() ? 0.6 : 1,
                  }}
                >
                  <Send size={14} />
                  {sendingReply ? 'Sending Email...' : 'Send Reply'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {inquiryToDelete && (
        <Modal
          isOpen={!!inquiryToDelete}
          onClose={() => setInquiryToDelete(null)}
          title="Confirm Deletion"
          maxWidth="440px"
        >
          <div style={{ color: '#4A315A', fontSize: '0.925rem', lineHeight: '1.5' }}>
            Are you sure you want to delete the inquiry from <strong>{inquiryToDelete.name}</strong> regarding <em>"{inquiryToDelete.subject}"</em>? This action cannot be undone.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={() => setInquiryToDelete(null)}
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
              onClick={handleDelete}
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
              {deleting ? 'Deleting...' : 'Delete Inquiry'}
            </button>
          </div>
        </Modal>
      )}
    </PageContainer>
  );
}
