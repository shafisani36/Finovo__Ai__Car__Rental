import type { ReactNode, CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ArrowLeft } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  to?: string;
  href?: string;
}

export interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  badge?: ReactNode;
  actions?: ReactNode;
  backTo?: string;
  backLabel?: string;
  className?: string;
  style?: CSSProperties;
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  badge,
  actions,
  backTo,
  backLabel = 'Back',
  className = '',
  style = {},
}: PageHeaderProps) {
  return (
    <div className={`finovo-page-header ${className}`} style={style}>
      <div className="finovo-page-header-left">
        {/* Optional Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="finovo-breadcrumb">
            {backTo && (
              <Link to={backTo} className="finovo-breadcrumb-item" style={{ fontWeight: 700, color: 'var(--finovo-purple-600, #6C1E84)' }}>
                <ArrowLeft size={14} />
                <span>{backLabel}</span>
              </Link>
            )}

            {backTo && <span className="finovo-breadcrumb-sep" aria-hidden="true">•</span>}

            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              const linkTarget = crumb.to || crumb.href;
              return (
                <span key={`${crumb.label}-${idx}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  {idx > 0 && <ChevronRight size={13} className="finovo-breadcrumb-sep" aria-hidden="true" />}
                  {linkTarget && !isLast ? (
                    <Link to={linkTarget} className="finovo-breadcrumb-item">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="finovo-breadcrumb-current" aria-current={isLast ? 'page' : undefined}>
                      {crumb.label}
                    </span>
                  )}
                </span>
              );
            })}
          </nav>
        )}

        {/* Title & Badge Row */}
        <div className="finovo-page-title-row">
          {typeof title === 'string' ? (
            <h1 className="finovo-page-title">{title}</h1>
          ) : (
            title
          )}
          {badge}
        </div>

        {/* Subtitle */}
        {subtitle && (
          typeof subtitle === 'string' ? (
            <p className="finovo-page-subtitle">{subtitle}</p>
          ) : (
            subtitle
          )
        )}
      </div>

      {/* Action Controls */}
      {actions && (
        <div className="finovo-page-header-actions">
          {actions}
        </div>
      )}
    </div>
  );
}
