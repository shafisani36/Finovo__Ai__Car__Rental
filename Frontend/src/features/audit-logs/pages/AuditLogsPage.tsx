import { useState, useEffect } from 'react';
import { auditLogApi } from '../api/auditLogApi';
import type { SecurityAuditLog } from '../api/auditLogApi';
import {
  ShieldCheck,
  Search,
  RotateCcw,
  FileCode,
} from 'lucide-react';
import {
  PageContainer,
  PageHeader,
  Modal,
} from '../../../components/common';

export function AuditLogsPage() {
  const [logs, setLogs] = useState<SecurityAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<SecurityAuditLog | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await auditLogApi.getAuditLogs();
      if (res.success) {
        setLogs(res.logs);
      }
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((l) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.event.toLowerCase().includes(q) ||
      (l.user?.email && l.user.email.toLowerCase().includes(q)) ||
      (l.user?.fullName && l.user.fullName.toLowerCase().includes(q)) ||
      (l.ipAddress && l.ipAddress.toLowerCase().includes(q))
    );
  });

  const getEventBadgeStyle = (event: string) => {
    if (event.includes('HANDOVER') || event.includes('RETURN')) {
      return { bg: 'rgba(16, 185, 129, 0.12)', color: '#059669' };
    }
    if (event.includes('INSPECTION') || event.includes('FINDING')) {
      return { bg: 'rgba(250, 184, 38, 0.2)', color: '#B45309' };
    }
    if (event.includes('LOGIN') || event.includes('AUTH')) {
      return { bg: 'rgba(99, 102, 241, 0.12)', color: '#4F46E5' };
    }
    return { bg: 'rgba(30, 4, 38, 0.08)', color: '#1E0426' };
  };

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title="Security & Operational Audit Trail"
        subtitle="Immutable system activity stream logging authentication sessions, vehicle dispatches, AI inspection reviews, and state mutations."
        breadcrumbs={[
          { label: 'Admin', to: '/admin/dashboard' },
          { label: 'Audit Trail' },
        ]}
      />

      {/* Filter / Search Bar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          padding: '16px 20px',
          border: '1px solid #ECEAEF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#F7F5F8',
            borderRadius: '10px',
            padding: '10px 14px',
            border: '1px solid #ECEAEF',
            flex: 1,
            maxWidth: '440px',
          }}
        >
          <Search size={18} color="#685D73" />
          <input
            type="text"
            placeholder="Search by event, actor email, or IP address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '0.875rem',
              width: '100%',
              color: '#1E0426',
            }}
          />
        </div>

        <button
          onClick={loadLogs}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 16px',
            backgroundColor: '#F7F5F8',
            border: '1px solid #ECEAEF',
            borderRadius: '10px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: '#1E0426',
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={14} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Logs Table */}
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
            <div style={{ marginTop: '12px', fontWeight: 600 }}>Loading security audit logs...</div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#685D73' }}>
            <ShieldCheck size={40} color="#D1D5DB" style={{ marginBottom: '12px' }} />
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1E0426' }}>No audit events found</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#FAF9FB', borderBottom: '1px solid #ECEAEF', color: '#685D73' }}>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Event Name</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Actor / Account</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Timestamp</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Network / IP</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, textAlign: 'right' }}>Metadata</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const style = getEventBadgeStyle(log.event);
                  return (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: '1px solid #ECEAEF',
                        transition: 'background-color 0.15s',
                      }}
                    >
                      {/* Event */}
                      <td style={{ padding: '16px 20px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            backgroundColor: style.bg,
                            color: style.color,
                          }}
                        >
                          {log.event}
                        </span>
                      </td>

                      {/* User */}
                      <td style={{ padding: '16px 20px' }}>
                        {log.user ? (
                          <div>
                            <div style={{ fontWeight: 700, color: '#1E0426' }}>{log.user.fullName}</div>
                            <div style={{ fontSize: '0.75rem', color: '#685D73' }}>{log.user.email}</div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8125rem', color: '#685D73', fontStyle: 'italic' }}>
                            System Daemon / Unauthenticated
                          </span>
                        )}
                      </td>

                      {/* Timestamp */}
                      <td style={{ padding: '16px 20px', color: '#1E0426' }}>
                        <div style={{ fontWeight: 600 }}>
                          {new Date(log.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#685D73' }}>
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </div>
                      </td>

                      {/* IP */}
                      <td style={{ padding: '16px 20px', color: '#685D73', fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                        {log.ipAddress || '127.0.0.1'}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        {log.metadata ? (
                          <button
                            onClick={() => setSelectedLog(log)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              backgroundColor: '#F7F5F8',
                              border: '1px solid #ECEAEF',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: '#1E0426',
                              cursor: 'pointer',
                            }}
                          >
                            <FileCode size={13} />
                            <span>Payload</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>None</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payload Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={`${selectedLog.event} Payload`}
          subtitle={`Logged at ${new Date(selectedLog.createdAt).toLocaleString()}`}
          maxWidth="560px"
        >
          <pre
            style={{
              backgroundColor: '#1E0426',
              color: '#FAB826',
              padding: '16px',
              borderRadius: '10px',
              fontSize: '0.8125rem',
              overflowX: 'auto',
              fontFamily: 'Consolas, Monaco, monospace',
              maxHeight: '360px',
            }}
          >
            {(() => {
              try {
                return JSON.stringify(JSON.parse(selectedLog.metadata || '{}'), null, 2);
              } catch {
                return selectedLog.metadata;
              }
            })()}
          </pre>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button
              type="button"
              onClick={() => setSelectedLog(null)}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                backgroundColor: '#1E0426',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: '0.875rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </PageContainer>
  );
}
