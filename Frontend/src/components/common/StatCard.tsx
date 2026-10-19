import type { ReactNode, CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';

export type StatVariant = 'purple' | 'gold' | 'green' | 'blue' | 'amber' | 'red' | 'gray';

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon | ReactNode;
  variant?: StatVariant;
  subtext?: ReactNode;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}

const VARIANT_CONFIG: Record<StatVariant, { bg: string; color: string; border?: string }> = {
  purple: {
    bg: '#F5EEF8',
    color: '#6C1E84',
    border: 'rgba(108, 30, 132, 0.2)',
  },
  gold: {
    bg: 'rgba(250, 184, 38, 0.16)',
    color: '#B45309',
    border: 'rgba(250, 184, 38, 0.35)',
  },
  green: {
    bg: '#ECFDF5',
    color: '#059669',
    border: '#A7F3D0',
  },
  blue: {
    bg: '#EFF6FF',
    color: '#2563EB',
    border: '#BFDBFE',
  },
  amber: {
    bg: '#FFFBEB',
    color: '#D97706',
    border: '#FDE68A',
  },
  red: {
    bg: '#FEF2F2',
    color: '#DC2626',
    border: '#FECACA',
  },
  gray: {
    bg: '#F3F4F6',
    color: '#4B5563',
    border: '#E5E7EB',
  },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  variant = 'purple',
  subtext,
  onClick,
  className = '',
  style = {},
}: StatCardProps) {
  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.purple;

  const renderIcon = () => {
    if (!Icon) return null;
    if (typeof Icon === 'function') {
      const LucideComp = Icon as LucideIcon;
      return <LucideComp size={22} />;
    }
    return Icon;
  };

  return (
    <div
      className={`finovo-stat-card ${className}`}
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      <div className="finovo-stat-info">
        <span className="finovo-stat-label">{label}</span>
        <span className="finovo-stat-value">{value}</span>
        {subtext && <div className="finovo-stat-subtext">{subtext}</div>}
      </div>

      {Icon && (
        <div
          className="finovo-stat-icon-wrap"
          style={{
            backgroundColor: config.bg,
            color: config.color,
            border: config.border ? `1px solid ${config.border}` : undefined,
          }}
        >
          {renderIcon()}
        </div>
      )}
    </div>
  );
}

export function StatGrid({
  children,
  columns,
  className = '',
  style = {},
}: {
  children: ReactNode;
  columns?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const gridStyle: CSSProperties = {
    ...(columns ? { gridTemplateColumns: `repeat(${columns}, 1fr)` } : {}),
    ...style,
  };

  return (
    <div className={`finovo-stat-grid ${className}`} style={gridStyle}>
      {children}
    </div>
  );
}
