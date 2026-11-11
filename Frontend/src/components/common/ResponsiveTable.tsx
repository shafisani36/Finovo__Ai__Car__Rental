import type { ReactNode, CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface ResponsiveTableProps {
  children: ReactNode;
  pagination?: {
    page: number;
    totalPages: number;
    totalCount?: number;
    onPageChange: (newPage: number) => void;
    limit?: number;
    label?: string;
  };
  className?: string;
  style?: CSSProperties;
}

export function ResponsiveTable({
  children,
  pagination,
  className = '',
  style = {},
}: ResponsiveTableProps) {
  const { t } = useTranslation();

  return (
    <div className={`finovo-table-card ${className}`} style={style}>
      <div className="finovo-table-scroll custom-scrollbar">
        {children}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="finovo-pagination">
          <div>
            {t('common.pagination.showingPage')} <strong>{pagination.page}</strong> {t('common.pagination.of')}{' '}
            <strong>{pagination.totalPages}</strong>
            {pagination.totalCount !== undefined && (
              <span>
                {' '}
                ({pagination.totalCount} {t('common.pagination.totalRecords')} {pagination.label || t('common.pagination.records')})
              </span>
            )}
          </div>

          <div className="finovo-pagination-controls">
            <button
              type="button"
              onClick={() => pagination.onPageChange(Math.max(1, pagination.page - 1))}
              disabled={pagination.page <= 1}
              className="finovo-pagination-btn"
              aria-label={t('common.pagination.previous')}
            >
              <ChevronLeft size={16} className="rtl-mirror-arrow" />
              <span>{t('common.pagination.previous')}</span>
            </button>

            <button
              type="button"
              onClick={() => pagination.onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
              disabled={pagination.page >= pagination.totalPages}
              className="finovo-pagination-btn"
              aria-label={t('common.pagination.next')}
            >
              <span>{t('common.pagination.next')}</span>
              <ChevronRight size={16} className="rtl-mirror-arrow" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
