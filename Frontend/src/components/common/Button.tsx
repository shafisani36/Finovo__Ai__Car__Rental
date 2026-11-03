import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'dark' | 'glass' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  icon,
  iconPosition = 'right',
  fullWidth = false,
  className = '',
  style = {},
  disabled,
  ...props
}: ButtonProps) {
  const sizeStyles = {
    sm: {
      padding: '8px 18px',
      fontSize: '0.875rem',
      borderRadius: 'var(--radius-pill)',
      fontWeight: 600,
    },
    md: {
      padding: '12px 26px',
      fontSize: '0.975rem',
      borderRadius: 'var(--radius-pill)',
      fontWeight: 700,
    },
    lg: {
      padding: '16px 36px',
      fontSize: '1.05rem',
      borderRadius: 'var(--radius-pill)',
      fontWeight: 700,
    },
  };

  const variantStyles = {
    primary: {
      backgroundColor: 'var(--color-accent-500)',
      color: 'var(--color-primary-950)',
      boxShadow: 'var(--shadow-accent)',
    },
    secondary: {
      backgroundColor: 'transparent',
      color: 'var(--text-white)',
      border: '1.5px solid rgba(255, 255, 255, 0.25)',
      backdropFilter: 'blur(8px)',
    },
    dark: {
      backgroundColor: 'var(--color-primary-900)',
      color: 'var(--text-white)',
      boxShadow: 'var(--shadow-md)',
    },
    glass: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      color: 'var(--text-white)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      backdropFilter: 'blur(12px)',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'inherit',
    },
  };

  const combinedStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: 'all var(--transition-normal)',
    whiteSpace: 'nowrap' as const,
    width: fullWidth ? '100%' : 'auto',
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...style,
  };

  return (
    <button
      className={`btn-base btn-${variant} ${className}`}
      style={combinedStyles}
      disabled={disabled}
      {...props}
    >
      {icon && iconPosition === 'left' && <span style={{ display: 'inline-flex' }}>{icon}</span>}
      <span>{children}</span>
      {icon && iconPosition === 'right' && <span style={{ display: 'inline-flex' }}>{icon}</span>}
    </button>
  );
}
