import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, CarFront, CalendarCheck, User, Loader2, type LucideIcon } from 'lucide-react';
import { fleetApi } from '../../../features/fleet/api/fleetApi';
import { bookingApi } from '../../../features/bookings/api/bookingApi';
import { customerApi } from '../../../features/customers/api/customerApi';
import { useDismissable } from './useDismissable';
import './header-panels.css';

interface SearchResult {
  key: string;
  group: 'cars' | 'bookings' | 'customers';
  title: string;
  detail: string;
  link: string;
}

const MIN_QUERY_LENGTH = 2;
const PER_GROUP = 5;
const DEBOUNCE_MS = 300;

const GROUP_ICON: Record<SearchResult['group'], { icon: LucideIcon; tone: string }> = {
  cars: { icon: CarFront, tone: 'purple' },
  bookings: { icon: CalendarCheck, tone: 'amber' },
  customers: { icon: User, tone: 'blue' },
};

/**
 * Search box of the admin header: finds cars (brand, model, plate), bookings (number, customer)
 * and customers (name, email, phone) at once. Press "/" anywhere to jump into it.
 */
export function AdminGlobalSearch({ placeholder }: { placeholder: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const requestIdRef = useRef(0);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchedFor, setSearchedFor] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const close = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
  }, []);
  useDismissable(wrapRef, isOpen, close);

  // "/" focuses the search from anywhere, unless the user is already typing in a field
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const typing = target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      if (typing) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const trimmed = query.trim();

  // Searches all three lists in parallel, a moment after the user stops typing
  useEffect(() => {
    if (trimmed.length < MIN_QUERY_LENGTH) return;
    const requestId = ++requestIdRef.current;
    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      const [cars, bookings, customers] = await Promise.allSettled([
        fleetApi.getVehicles({ search: trimmed, limit: PER_GROUP }),
        bookingApi.list({ search: trimmed, limit: PER_GROUP }),
        customerApi.getCustomers(trimmed),
      ]);
      if (requestId !== requestIdRef.current) return;
      const found: SearchResult[] = [];
      if (cars.status === 'fulfilled') {
        for (const v of (cars.value.vehicles || []).slice(0, PER_GROUP)) {
          found.push({
            key: `car:${v.id}`,
            group: 'cars',
            title: `${v.brand} ${v.model} (${v.year})`,
            detail: v.registrationNumber,
            link: `/admin/cars/${v.id}`,
          });
        }
      }
      if (bookings.status === 'fulfilled') {
        for (const b of (bookings.value.bookings || []).slice(0, PER_GROUP)) {
          found.push({
            key: `booking:${b.id}`,
            group: 'bookings',
            title: b.bookingNumber,
            detail: [b.customer?.fullName, b.vehicle ? `${b.vehicle.brand} ${b.vehicle.model}` : ''].filter(Boolean).join(' · '),
            link: `/admin/bookings?search=${encodeURIComponent(b.bookingNumber)}`,
          });
        }
      }
      if (customers.status === 'fulfilled') {
        for (const c of (customers.value.customers || []).slice(0, PER_GROUP)) {
          found.push({
            key: `customer:${c.id}`,
            group: 'customers',
            title: c.fullName,
            detail: [c.email, c.phone].filter(Boolean).join(' · '),
            link: `/admin/customers?search=${encodeURIComponent(c.email)}`,
          });
        }
      }
      setResults(found);
      setSearchedFor(trimmed);
      setHasError(cars.status === 'rejected' && bookings.status === 'rejected' && customers.status === 'rejected');
      setActiveIndex(found.length ? 0 : -1);
      setIsSearching(false);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [trimmed]);

  const visibleResults = useMemo(() => (trimmed.length >= MIN_QUERY_LENGTH ? results : []), [trimmed, results]);
  const grouped = useMemo(() => {
    const order: SearchResult['group'][] = ['cars', 'bookings', 'customers'];
    return order
      .map((group) => ({ group, items: visibleResults.filter((r) => r.group === group) }))
      .filter((g) => g.items.length > 0);
  }, [visibleResults]);

  const openResult = (result: SearchResult) => {
    close();
    setQuery('');
    inputRef.current?.blur();
    navigate(result.link);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      close();
      inputRef.current?.blur();
      return;
    }
    if (!visibleResults.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((i) => (i + 1) % visibleResults.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + visibleResults.length) % visibleResults.length);
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      openResult(visibleResults[activeIndex]);
    }
  };

  const showPanel = isOpen && trimmed.length >= MIN_QUERY_LENGTH;
  const isWaiting = isSearching || searchedFor !== trimmed;
  const groupLabel = (group: SearchResult['group']) => t(`adminPages.globalSearch.group_${group}`);

  return (
    <div className="admin-header-search-wrap" ref={wrapRef} style={{ position: 'relative' }}>
      {isWaiting && showPanel ? (
        <Loader2
          size={16}
          className="finovo-admin-search-icon admin-search-spin"
          style={{ position: 'absolute', insetInlineStart: '14px', pointerEvents: 'none', color: '#8A7090' }}
        />
      ) : (
        <Search
          size={16}
          color="#8A7090"
          className="finovo-admin-search-icon"
          style={{ position: 'absolute', insetInlineStart: '14px', pointerEvents: 'none' }}
        />
      )}
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="admin-global-search-results"
        aria-autocomplete="list"
        aria-label={t('adminPages.globalSearch.label')}
        autoComplete="off"
        maxLength={100}
        placeholder={placeholder}
        className="admin-header-search-input finovo-admin-search-input"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={onKeyDown}
      />
      <span className="admin-header-shortcut-badge" aria-hidden="true">
        /
      </span>

      {showPanel && (
        <div
          id="admin-global-search-results"
          className="admin-header-panel admin-search-panel"
          role="listbox"
          aria-label={t('adminPages.globalSearch.label')}
        >
          <div className="admin-header-panel-body">
            {isWaiting && visibleResults.length === 0 ? (
              <>
                <div className="admin-header-panel-skeleton" />
                <div className="admin-header-panel-skeleton" />
              </>
            ) : hasError ? (
              <div className="admin-header-panel-empty">
                <p className="admin-header-panel-empty-title">{t('adminPages.globalSearch.errorTitle')}</p>
                <p className="admin-header-panel-empty-text">{t('adminPages.staffNotifications.errorText')}</p>
              </div>
            ) : visibleResults.length === 0 ? (
              <div className="admin-header-panel-empty">
                <span className="admin-header-panel-empty-icon" style={{ backgroundColor: 'var(--adm-surface-2, #F5F1F7)', color: 'var(--adm-text-muted, #8A7090)' }}>
                  <Search size={22} />
                </span>
                <p className="admin-header-panel-empty-title">{t('adminPages.globalSearch.emptyTitle', { query: trimmed })}</p>
                <p className="admin-header-panel-empty-text">{t('adminPages.globalSearch.emptyText')}</p>
              </div>
            ) : (
              grouped.map(({ group, items }) => (
                <div key={group} role="group" aria-label={groupLabel(group)}>
                  <p className="admin-header-panel-section-label">{groupLabel(group)}</p>
                  {items.map((result) => {
                    const index = visibleResults.indexOf(result);
                    const style = GROUP_ICON[result.group];
                    const Icon = style.icon;
                    return (
                      <button
                        type="button"
                        key={result.key}
                        role="option"
                        aria-selected={index === activeIndex}
                        className={`admin-header-panel-item ${index === activeIndex ? 'is-unseen' : ''}`}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => openResult(result)}
                      >
                        <span className={`admin-header-panel-item-icon tone-${style.tone}`}>
                          <Icon size={16} />
                        </span>
                        <span className="admin-header-panel-item-text">
                          <span className="admin-header-panel-item-title">{result.title}</span>
                          {result.detail && <span className="admin-header-panel-item-desc">{result.detail}</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
          <div className="admin-header-panel-foot">
            <span>{t('adminPages.globalSearch.hint')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
