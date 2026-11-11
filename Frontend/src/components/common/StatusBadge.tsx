import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export type StatusCategory =
  | 'AVAILABLE'
  | 'RENTED'
  | 'MAINTENANCE'
  | 'ARCHIVED'
  | 'CONFIRMED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'PENDING'
  | 'PRISTINE'
  | 'DAMAGE_DETECTED'
  | 'VERIFIED'
  | 'PENDING_REVIEW'
  | 'APPROVED_CLAIM'
  | 'RETURNED'
  | 'INACTIVE'
  | string;

export interface StatusBadgeProps {
  status: StatusCategory;
  label?: ReactNode;
  dot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  style?: CSSProperties;
}

interface StatusVisualConfig {
  bg: string;
  color: string;
  dotColor: string;
  label: string;
}

const STATUS_DICTIONARY: Record<string, StatusVisualConfig> = {
  // Vehicle / Fleet
  AVAILABLE: {
    bg: '#ECFDF5',
    color: '#065F46',
    dotColor: '#10B981',
    label: 'Available',
  },
  RENTED: {
    bg: '#EFF6FF',
    color: '#1E429F',
    dotColor: '#3B82F6',
    label: 'Rented',
  },
  MAINTENANCE: {
    bg: '#FEF3C7',
    color: '#92400E',
    dotColor: '#F59E0B',
    label: 'Maintenance',
  },
  ARCHIVED: {
    bg: '#F3F4F6',
    color: '#4B5563',
    dotColor: '#9CA3AF',
    label: 'Archived',
  },

  // Bookings & Rentals
  CONFIRMED: {
    bg: '#ECFDF5',
    color: '#047857',
    dotColor: '#059669',
    label: 'Confirmed',
  },
  ACTIVE: {
    bg: '#EFF6FF',
    color: '#1D4ED8',
    dotColor: '#2563EB',
    label: 'Active',
  },
  COMPLETED: {
    bg: '#F3F4F6',
    color: '#4B5563',
    dotColor: '#6B7280',
    label: 'Completed',
  },
  RETURNED: {
    bg: '#F3F4F6',
    color: '#374151',
    dotColor: '#6B7280',
    label: 'Returned',
  },
  CANCELLED: {
    bg: '#FEF2F2',
    color: '#991B1B',
    dotColor: '#EF4444',
    label: 'Cancelled',
  },
  PENDING: {
    bg: '#FFFBEB',
    color: '#B45309',
    dotColor: '#F59E0B',
    label: 'Pending',
  },

  // Inspections
  PRISTINE: {
    bg: '#ECFDF5',
    color: '#065F46',
    dotColor: '#10B981',
    label: 'Pristine Clean',
  },
  DAMAGE_DETECTED: {
    bg: '#FEF2F2',
    color: '#991B1B',
    dotColor: '#EF4444',
    label: 'Damage Flagged',
  },
  PENDING_REVIEW: {
    bg: '#FFFBEB',
    color: '#B45309',
    dotColor: '#F59E0B',
    label: 'Pending Review',
  },
  APPROVED_CLAIM: {
    bg: '#FEE2E2',
    color: '#B91C1C',
    dotColor: '#DC2626',
    label: 'Claim Approved',
  },

  // Customers & Users
  VERIFIED: {
    bg: '#ECFDF5',
    color: '#047857',
    dotColor: '#059669',
    label: 'Verified',
  },
  INACTIVE: {
    bg: '#F3F4F6',
    color: '#6B7280',
    dotColor: '#9CA3AF',
    label: 'Inactive',
  },
};

const STATUS_KEY_MAP: Record<string, string> = {
  AVAILABLE: 'common.status.available',
  RENTED: 'common.status.rented',
  MAINTENANCE: 'common.status.maintenance',
  RESERVED: 'common.status.reserved',
  ARCHIVED: 'common.status.archived',
  CONFIRMED: 'common.status.confirmed',
  ACTIVE: 'common.status.active',
  COMPLETED: 'common.status.completed',
  RETURNED: 'common.status.returned',
  CANCELLED: 'common.status.cancelled',
  REJECTED: 'common.status.rejected',
  PENDING: 'common.status.pending',
  PAID: 'common.status.paid',
  OVERDUE: 'common.status.overdue',
  PRISTINE: 'common.status.pristine',
  DAMAGE_DETECTED: 'common.status.damageDetected',
  PENDING_REVIEW: 'common.status.pendingReview',
  APPROVED_CLAIM: 'common.status.approvedClaim',
  VERIFIED: 'common.status.verified',
  SUSPENDED: 'common.status.suspended',
  INACTIVE: 'common.status.inactive',
};

export function StatusBadge({
  status,
  label,
  dot = true,
  size = 'md',
  className = '',
  style = {},
}: StatusBadgeProps) {
  const { t } = useTranslation();
  const normalizedKey = (status || '').toUpperCase().trim();
  const config: StatusVisualConfig = STATUS_DICTIONARY[normalizedKey] || {
    bg: '#F3F4F6',
    color: '#374151',
    dotColor: '#9CA3AF',
    label: status || 'Unknown',
  };

  const i18nKey = STATUS_KEY_MAP[normalizedKey];
  const translatedStatus = i18nKey ? t(i18nKey, { defaultValue: config.label }) : config.label;
  const displayText = label ?? translatedStatus;
  const isSmall = size === 'sm';

  return (
    <span
      className={`finovo-status-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: config.bg,
        color: config.color,
        fontSize: isSmall ? '0.725rem' : '0.8rem',
        fontWeight: 700,
        padding: isSmall ? '2px 8px' : '4px 10px',
        borderRadius: '20px',
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
        lineHeight: 1.2,
        ...style,
      }}
    >
      {dot && (
        <span
          style={{
            width: isSmall ? '5px' : '6px',
            height: isSmall ? '5px' : '6px',
            borderRadius: '50%',
            backgroundColor: config.dotColor,
            flexShrink: 0,
          }}
          aria-hidden="true"
        />
      )}
      <span>{displayText}</span>
    </span>
  );
}
