import type { ReactNode, CSSProperties } from 'react';
import { Search, X } from 'lucide-react';

export interface FilterToolbarProps {
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function FilterToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters,
  actions,
  className = '',
  style = {},
}: FilterToolbarProps) {
  const showSearch = onSearchChange !== undefined;

  return (
    <div className={`finovo-filter-toolbar ${className}`} style={style}>
      <div className="finovo-filter-left">
        {showSearch && (
          <div className="finovo-search-box">
            <Search size={16} className="finovo-search-icon" aria-hidden="true" />
            <input
              type="text"
              value={searchValue || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="finovo-search-input"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="finovo-search-clear"
                aria-label="Clear search input"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {filters}
      </div>

      {actions && (
        <div className="finovo-filter-right">
          {actions}
        </div>
      )}
    </div>
  );
}
