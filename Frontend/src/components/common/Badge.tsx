import type { ReactNode } from 'react';

export type BadgeVariant = 'gold' | 'glass' | 'sand' | 'purple' | 'success';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  icon?: ReactNode;
  size?: 'sm' | 'md';
}

export function Badge({ children, variant = 'glass', icon, size = 'md' }: BadgeProps) {
  const variantStyles = {
    gold: {
      backgroundColor: 'rgba(245, 183, 22, 0.15)',
      color: 'var(--color-accent-500)',
      border: '1px solid rgba(245, 183, 22, 0.35)',
    },
    glass: {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      color: 'var(--text-white)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      backdropFilter: 'blur(8px)',
    },
    sand: {
      backgroundColor: 'var(--color-sand-200)',
      color: 'var(--color-sand-900)',
      border: '1px solid var(--color-sand-300)',
    },
    purple: {
      backgroundColor: 'rgba(85, 22, 133, 0.25)',
      color: '#D1C4E9',
      border: '1px solid rgba(113, 36, 172, 0.4)',
    },
    success: {
      backgroundColor: 'rgba(34, 197, 94, 0.15)',
      color: '#4ADE80',
      border: '1px solid rgba(34, 197, 94, 0.3)',
    },
  };

  const isSmall = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: isSmall ? '3px 10px' : '5px 14px',
        fontSize: isSmall ? '0.75rem' : '0.825rem',
        fontWeight: 600,
        borderRadius: 'var(--radius-pill)',
        letterSpacing: '0.01em',
        width: 'fit-content',
        ...variantStyles[variant],
      }}
    >
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
