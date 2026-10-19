import { isValidElement, type ReactNode, type CSSProperties, type ComponentType } from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Layers } from 'lucide-react';

export interface EmptyStateProps {
  icon?: LucideIcon | ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    to?: string;
    icon?: ReactNode;
  };
  className?: string;
  style?: CSSProperties;
}

export function EmptyState({
  icon: Icon = Layers,
  title,
  description,
  action,
  className = '',
  style = {},
}: EmptyStateProps) {
  const renderIcon = () => {
    if (!Icon) return null;
    if (isValidElement(Icon)) {
      return Icon;
    }
    const Component = Icon as ComponentType<LucideProps>;
    return <Component size={36} />;
  };

  return (
    <div
      className={`finovo-empty-state ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '56px 24px',
        textAlign: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #EFEAEF',
        boxShadow: '0 2px 8px rgba(30, 4, 50, 0.03)',
        boxSizing: 'border-box',
        width: '100%',
        ...style,
      }}
    >
      <div
        style={{
          width: '68px',
          height: '68px',
          borderRadius: '50%',
          backgroundColor: '#F5EEF8',
          color: '#6C1E84',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '18px',
          border: '1px solid rgba(108, 30, 132, 0.15)',
        }}
      >
        {renderIcon()}
      </div>

      <h3
        style={{
          margin: '0 0 6px 0',
          fontSize: '1.2rem',
          fontWeight: 800,
          color: '#1E0426',
          fontFamily: 'var(--font-family-display, "Archivo", sans-serif)',
        }}
      >
        {title}
      </h3>

      {description && (
        <p
          style={{
            margin: '0 0 20px 0',
            fontSize: '0.9rem',
            color: '#8A7090',
            maxWidth: '460px',
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      )}

      {action && action.to && (
        <Link
          to={action.to}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#FAB826',
            color: '#1C0324',
            fontWeight: 700,
            fontSize: '0.875rem',
            padding: '10px 20px',
            borderRadius: '10px',
            textDecoration: 'none',
            boxShadow: '0 4px 12px rgba(250, 184, 38, 0.35)',
            transition: 'transform 0.15s ease',
          }}
        >
          {action.icon}
          <span>{action.label}</span>
        </Link>
      )}

      {action && !action.to && action.onClick && (
        <button
          type="button"
          onClick={action.onClick}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#FAB826',
            color: '#1C0324',
            fontWeight: 700,
            fontSize: '0.875rem',
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(250, 184, 38, 0.35)',
            transition: 'transform 0.15s ease',
          }}
        >
          {action.icon}
          <span>{action.label}</span>
        </button>
      )}
    </div>
  );
}
