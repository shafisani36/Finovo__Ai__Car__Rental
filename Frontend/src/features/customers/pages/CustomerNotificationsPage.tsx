import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Calendar,
  CreditCard,
  Camera,
  FileText,
  ChevronRight,
} from 'lucide-react';
import { customerPortalApi, type CustomerNotificationItem } from '../api/customerPortalApi';
import './CustomerPortal.css';

export function CustomerNotificationsPage() {
  const [notifications, setNotifications] = useState<CustomerNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const res = await customerPortalApi.listNotifications();
      if (res.success) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await customerPortalApi.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await customerPortalApi.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'BOOKING':
        return <Calendar size={18} color="#FAB826" />;
      case 'PAYMENT':
        return <CreditCard size={18} color="#10B981" />;
      case 'INSPECTION':
        return <Camera size={18} color="#3B82F6" />;
      case 'DOCUMENT':
        return <FileText size={18} color="#8B5CF6" />;
      default:
        return <Bell size={18} color="var(--cp-primary)" />;
    }
  };

  const filtered = notifications.filter(
    (n) => activeCategory === 'ALL' || n.category === activeCategory
  );

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 className="cp-page-title" style={{ margin: 0 }}>Notification Center</h1>
            {unreadCount > 0 && (
              <span className="cp-badge cp-badge-warning">{unreadCount} New</span>
            )}
          </div>
          <p className="cp-page-subtitle">Real-time alerts, rental updates, and trip confirmations.</p>
        </div>

        {unreadCount > 0 && (
          <div className="cp-header-actions">
            <button className="cp-btn-outline" onClick={handleMarkAllRead}>
              <CheckCheck size={16} />
              Mark All as Read
            </button>
          </div>
        )}
      </div>

      {/* Categories Bar */}
      <div className="cp-card" style={{ padding: '16px 20px' }}>
        <div className="cp-tabs-bar" style={{ border: 'none', padding: 0 }}>
          {['ALL', 'BOOKING', 'PAYMENT', 'INSPECTION', 'DOCUMENT'].map((cat) => (
            <button
              key={cat}
              className={`cp-tab-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat === 'ALL' ? 'All Alerts' : cat.charAt(0) + cat.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Notification List */}
      <div className="cp-card">
        {filtered.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.map((n) => (
              <div
                key={n.id}
                style={{
                  border: '1px solid var(--cp-border)',
                  borderRadius: '12px',
                  padding: '16px',
                  background: n.isRead ? '#FFFFFF' : 'rgba(250, 184, 38, 0.05)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: '#F8F6F9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {getCategoryIcon(n.category)}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: n.isRead ? 600 : 800, color: 'var(--cp-primary)', fontSize: '0.95rem' }}>
                        {n.title}
                      </span>
                      {!n.isRead && (
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FAB826' }} />
                      )}
                    </div>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--cp-text-muted)', fontSize: '0.85rem', lineHeight: '1.4' }}>
                      {n.message}
                    </p>
                    <div style={{ fontSize: '0.78rem', color: 'var(--cp-text-subtle)', marginTop: '4px' }}>
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  {n.actionUrl && (
                    <Link to={n.actionUrl} className="cp-btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                      View
                      <ChevronRight size={14} />
                    </Link>
                  )}
                  {!n.isRead && (
                    <button
                      onClick={() => handleMarkAsRead(n.id)}
                      className="cp-btn-outline"
                      style={{ padding: '6px 12px', fontSize: '0.8rem', borderColor: 'transparent' }}
                      title="Mark as Read"
                    >
                      <CheckCheck size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="cp-empty-state">
            <div className="cp-empty-icon">
              <Bell size={28} />
            </div>
            <h3 className="cp-empty-title">All Caught Up!</h3>
            <p className="cp-empty-desc">You don't have any unread notifications in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
