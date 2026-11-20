import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  BellOff,
  CalendarClock,
  ClipboardCheck,
  MessageSquare,
  MessageSquareWarning,
  RefreshCw,
  Undo2,
  TimerOff,
  LifeBuoy,
  type LucideIcon,
} from 'lucide-react';
import { apiClient } from '../../../api/client';
import { API_ENDPOINTS } from '../../../api/endpoints';
import { formatMoney } from '../../../utils/carImageHelper';
import { useDismissable } from './useDismissable';
import './header-panels.css';

type StaffNotificationType =
  | 'INQUIRY_NEW'
  | 'TICKET_OPEN'
  | 'DISPUTE_OPEN'
  | 'BOOKING_REVIEW'
  | 'PICKUP_DUE'
  | 'RETURN_OVERDUE'
  | 'REFUND_MANUAL';

interface StaffNotification {
  id: string;
  type: StaffNotificationType;
  priority: 'HIGH' | 'NORMAL';
  params: Record<string, string | number>;
  at: string;
  link: string;
}

interface StaffNotificationsResponse {
  success: boolean;
  items: StaffNotification[];
  counts: Record<StaffNotificationType, number>;
  total: number;
  generatedAt: string;
}

/** How often the list is refreshed while the admin area is open. */
const REFRESH_INTERVAL_MS = 60_000;

const TYPE_STYLE: Record<StaffNotificationType, { icon: LucideIcon; tone: string }> = {
  DISPUTE_OPEN: { icon: MessageSquareWarning, tone: 'red' },
  RETURN_OVERDUE: { icon: TimerOff, tone: 'red' },
  PICKUP_DUE: { icon: CalendarClock, tone: 'amber' },
  BOOKING_REVIEW: { icon: ClipboardCheck, tone: 'blue' },
  REFUND_MANUAL: { icon: Undo2, tone: 'green' },
  INQUIRY_NEW: { icon: MessageSquare, tone: 'purple' },
  TICKET_OPEN: { icon: LifeBuoy, tone: 'purple' },
};

const seenStorageKey = (userId: string) => `finovo_staff_seen_notifications:${userId}`;

function readSeen(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(seenStorageKey(userId));
    const list = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list.filter((v) => typeof v === 'string') : []);
  } catch {
    return new Set();
  }
}

function writeSeen(userId: string, ids: string[]) {
  try {
    localStorage.setItem(seenStorageKey(userId), JSON.stringify(ids));
  } catch {
    // Not saved: items simply show as new again next time
  }
}

/**
 * Bell in the admin header with the live list of work waiting for staff
 * (disputes, late returns, pickups, bookings to review, manual refunds, new inquiries).
 * The red number counts items this user has not looked at yet.
 */
export function StaffNotificationBell({ userId }: { userId: string }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<StaffNotificationsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(() => readSeen(userId));
  const requestIdRef = useRef(0);

  const load = useCallback(async (manual = false) => {
    const requestId = ++requestIdRef.current;
    if (manual) setIsRefreshing(true);
    try {
      const res = await apiClient.get<StaffNotificationsResponse>(API_ENDPOINTS.DASHBOARD.NOTIFICATIONS);
      // Ignore an older answer that arrives after a newer one
      if (requestId !== requestIdRef.current) return;
      setData(res);
      setHasError(false);
    } catch {
      if (requestId === requestIdRef.current) setHasError(true);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  // First load, then every minute, and whenever the tab becomes visible again
  useEffect(() => {
    // Fetching on mount is the purpose of this effect
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, REFRESH_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  const items = useMemo(() => data?.items ?? [], [data]);
  const unseenCount = items.filter((item) => !seen.has(item.id)).length;

  const close = useCallback(() => setIsOpen(false), []);
  useDismissable(anchorRef, isOpen, close);

  // Opening the panel marks everything in it as seen (kept only for items that still exist)
  useEffect(() => {
    if (!isOpen || items.length === 0) return;
    const ids = items.map((item) => item.id);
    writeSeen(userId, ids);
    const timer = window.setTimeout(() => setSeen(new Set(ids)), 1500);
    return () => window.clearTimeout(timer);
  }, [isOpen, items, userId]);

  const toggle = () => {
    setIsOpen((open) => !open);
    if (!isOpen) void load();
  };

  const openItem = (item: StaffNotification) => {
    setIsOpen(false);
    navigate(item.link);
  };

  // Times are measured from when the server built the list, so a wrong computer clock does not matter
  const referenceTime = data ? new Date(data.generatedAt).getTime() : 0;

  const relativeTime = (iso: string) => {
    const diffMinutes = Math.round((new Date(iso).getTime() - referenceTime) / 60_000);
    const formatter = new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' });
    const abs = Math.abs(diffMinutes);
    if (abs < 60) return formatter.format(diffMinutes, 'minute');
    if (abs < 60 * 24) return formatter.format(Math.round(diffMinutes / 60), 'hour');
    return formatter.format(Math.round(diffMinutes / (60 * 24)), 'day');
  };

  const textFor = (item: StaffNotification) => {
    const p = item.params;
    switch (item.type) {
      case 'DISPUTE_OPEN':
        return { title: t('adminPages.staffNotifications.disputeTitle'), desc: t('adminPages.staffNotifications.disputeDesc', { booking: p.booking }) };
      case 'RETURN_OVERDUE':
        return {
          title: t('adminPages.staffNotifications.overdueTitle', { vehicle: p.vehicle }),
          desc: t('adminPages.staffNotifications.overdueDesc', { booking: p.booking, customer: p.customer }),
        };
      case 'PICKUP_DUE':
        return {
          title: t('adminPages.staffNotifications.pickupTitle', { vehicle: p.vehicle }),
          desc: t('adminPages.staffNotifications.pickupDesc', { booking: p.booking, customer: p.customer }),
        };
      case 'BOOKING_REVIEW':
        return {
          title: t('adminPages.staffNotifications.reviewTitle'),
          desc: t('adminPages.staffNotifications.reviewDesc', { booking: p.booking, customer: p.customer }),
        };
      case 'REFUND_MANUAL':
        return {
          title: t('adminPages.staffNotifications.refundTitle', { amount: formatMoney(Number(p.amount), String(p.currency || ''), 2) }),
          desc: t('adminPages.staffNotifications.refundDesc', { booking: p.booking }),
        };
      case 'TICKET_OPEN':
        return {
          title: t('adminPages.staffNotifications.ticketTitle', { name: p.name }),
          desc: t('adminPages.staffNotifications.ticketDesc', { ticket: p.ticket, subject: p.subject }),
        };
      case 'INQUIRY_NEW':
      default:
        return {
          title: t('adminPages.staffNotifications.inquiryTitle', { name: p.name }),
          desc: String(p.subject || ''),
        };
    }
  };

  const timeLabel = (item: StaffNotification) => {
    if (item.type === 'PICKUP_DUE') {
      return new Date(item.at).getTime() > referenceTime
        ? t('adminPages.staffNotifications.pickupAt', { time: relativeTime(item.at) })
        : t('adminPages.staffNotifications.pickupLate', { time: relativeTime(item.at) });
    }
    if (item.type === 'RETURN_OVERDUE') return t('adminPages.staffNotifications.dueWas', { time: relativeTime(item.at) });
    return relativeTime(item.at);
  };

  const total = data?.total ?? 0;
  const badgeLabel = unseenCount > 9 ? '9+' : String(unseenCount);

  return (
    <div className="admin-header-panel-anchor" ref={anchorRef}>
      <button
        type="button"
        className="admin-header-icon-btn"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={
          unseenCount > 0
            ? t('adminPages.staffNotifications.bellLabelNew', { count: unseenCount })
            : t('adminPages.layout.notifications')
        }
        title={t('adminPages.layout.notifications')}
      >
        <Bell size={19} />
        {unseenCount > 0 && <span className="admin-header-count-badge">{badgeLabel}</span>}
      </button>

      {isOpen && (
        <div className="admin-header-panel" role="dialog" aria-label={t('adminPages.layout.notifications')}>
          <div className="admin-header-panel-head">
            <div>
              <h2 className="admin-header-panel-title">{t('adminPages.layout.notifications')}</h2>
              <p className="admin-header-panel-subtitle">
                {total > 0
                  ? t('adminPages.staffNotifications.openCount', { count: total })
                  : t('adminPages.staffNotifications.subtitleEmpty')}
              </p>
            </div>
            <button
              type="button"
              className={`admin-header-panel-icon-btn ${isRefreshing ? 'is-spinning' : ''}`}
              onClick={() => void load(true)}
              disabled={isRefreshing}
              aria-label={t('adminPages.staffNotifications.refresh')}
              title={t('adminPages.staffNotifications.refresh')}
            >
              <RefreshCw size={15} />
            </button>
          </div>

          <div className="admin-header-panel-body" aria-live="polite">
            {isLoading && !data ? (
              <>
                <div className="admin-header-panel-skeleton" />
                <div className="admin-header-panel-skeleton" />
                <div className="admin-header-panel-skeleton" />
              </>
            ) : hasError && !data ? (
              <div className="admin-header-panel-empty">
                <span className="admin-header-panel-empty-icon" style={{ backgroundColor: 'var(--adm-tint-red, #FEF2F2)', color: 'var(--adm-text-red, #DC2626)' }}>
                  <BellOff size={24} />
                </span>
                <p className="admin-header-panel-empty-title">{t('adminPages.staffNotifications.errorTitle')}</p>
                <p className="admin-header-panel-empty-text">{t('adminPages.staffNotifications.errorText')}</p>
                <button type="button" className="admin-header-panel-retry" onClick={() => void load(true)}>
                  {t('adminPages.staffNotifications.retry')}
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="admin-header-panel-empty">
                <span className="admin-header-panel-empty-icon">
                  <Bell size={24} />
                </span>
                <p className="admin-header-panel-empty-title">{t('adminPages.staffNotifications.emptyTitle')}</p>
                <p className="admin-header-panel-empty-text">{t('adminPages.staffNotifications.emptyText')}</p>
              </div>
            ) : (
              items.map((item) => {
                const style = TYPE_STYLE[item.type];
                const Icon = style.icon;
                const text = textFor(item);
                const isUnseen = !seen.has(item.id);
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`admin-header-panel-item ${isUnseen ? 'is-unseen' : ''}`}
                    onClick={() => openItem(item)}
                  >
                    <span className={`admin-header-panel-item-icon tone-${style.tone}`}>
                      <Icon size={17} />
                    </span>
                    <span className="admin-header-panel-item-text">
                      <span className="admin-header-panel-item-title">{text.title}</span>
                      {text.desc && <span className="admin-header-panel-item-desc">{text.desc}</span>}
                      <span className="admin-header-panel-item-time">{timeLabel(item)}</span>
                    </span>
                    {isUnseen && <span className="admin-header-panel-unseen-dot" aria-label={t('adminPages.staffNotifications.new')} />}
                  </button>
                );
              })
            )}
          </div>

          <div className="admin-header-panel-foot">
            <span>
              {data
                ? t('adminPages.staffNotifications.updated', {
                    time: new Intl.DateTimeFormat(i18n.language, { timeStyle: 'short' }).format(new Date(data.generatedAt)),
                  })
                : ''}
            </span>
            {total > items.length && <span>{t('adminPages.staffNotifications.showingLatest', { count: items.length })}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
