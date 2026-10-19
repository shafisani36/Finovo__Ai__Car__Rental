import type { ReactNode, CSSProperties } from 'react';
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
  return (
    <div className={`finovo-table-card ${className}`} style={style}>
      <div className="finovo-table-scroll custom-scrollbar">
        {children}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="finovo-pagination">
          <div>
            Showing Page <strong>{pagination.page}</strong> of{' '}
            <strong>{pagination.totalPages}</strong>
            {pagination.totalCount !== undefined && (
              <span> ({pagination.totalCount} total {pagination.label || 'records'})</span>
            )}
          </div>

          <div className="finovo-pagination-controls">
            <button
              type="button"
              onClick={() => pagination.onPageChange(Math.max(1, pagination.page - 1))}
              disabled={pagination.page <= 1}
              className="finovo-pagination-btn"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>

            <button
              type="button"
              onClick={() => pagination.onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
              disabled={pagination.page >= pagination.totalPages}
              className="finovo-pagination-btn"
              aria-label="Next page"
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
