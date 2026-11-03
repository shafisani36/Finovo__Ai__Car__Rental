import { useState, useRef, useEffect, useId, useMemo } from 'react';
import type { KeyboardEvent } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import type { CustomSelectProps, SelectOption } from './types';
import './CustomSelect.css';

export function CustomSelect<T extends string | number = string>({
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  disabled = false,
  searchable,
  searchPlaceholder = 'Type to filter options...',
  clearable = false,
  size = 'md',
  variant = 'light',
  label,
  error,
  hint,
  fullWidth = true,
  className = '',
  style,
  triggerStyle,
  containerStyle,
  menuPlacement = 'auto',
  id,
}: CustomSelectProps<T>) {
  const generatedId = useId();
  const selectId = id || generatedId;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [actualPlacement, setActualPlacement] = useState<'bottom' | 'top'>('bottom');
  const [horizontalPlacement, setHorizontalPlacement] = useState<'left' | 'right'>('left');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  // Dynamic viewport placement detection (ensures dropdown never gets cut off vertically or horizontally)
  useEffect(() => {
    if (!isOpen) return;

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      
      // Vertical placement
      if (menuPlacement === 'auto' || !menuPlacement) {
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        if (spaceBelow < 260 && spaceAbove > spaceBelow) {
          setActualPlacement('top');
        } else {
          setActualPlacement('bottom');
        }
      } else {
        setActualPlacement(menuPlacement);
      }

      // Horizontal placement (prevents right-edge overflow on narrow screens / grid columns)
      const spaceRight = window.innerWidth - rect.right;
      if (spaceRight < 140 || rect.left > window.innerWidth * 0.55) {
        setHorizontalPlacement('right');
      } else {
        setHorizontalPlacement('left');
      }
    }
  }, [isOpen, menuPlacement]);

  // Auto enable search if > 8 options unless explicitly turned off
  const isSearchActive = searchable !== undefined ? searchable : options.length > 8;

  // Selected Option
  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value) || null;
  }, [options, value]);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(q)) ||
        (opt.badge && opt.badge.toLowerCase().includes(q))
    );
  }, [options, searchQuery]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: Event) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when menu opens
  useEffect(() => {
    if (isOpen && isSearchActive) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, isSearchActive]);

  // Handle Trigger Click
  const handleToggle = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
    setSearchQuery('');
    setFocusedIndex(-1);
  };

  // Select Option
  const handleSelectOption = (opt: SelectOption<T>) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setIsOpen(false);
    setSearchQuery('');
    setFocusedIndex(-1);
  };

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement | HTMLInputElement | HTMLDivElement>) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
        setFocusedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery('');
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
          handleSelectOption(filteredOptions[focusedIndex]);
        }
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`custom-select-container variant-${variant} ${fullWidth ? 'w-full' : ''} ${className}`}
      style={{ width: fullWidth ? '100%' : 'auto', ...style, ...containerStyle }}
      onKeyDown={handleKeyDown}
    >
      {/* Label */}
      {label && (
        <label htmlFor={selectId} className="custom-select-label">
          {label}
        </label>
      )}

      {/* Main Trigger Button */}
      <button
        id={selectId}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`custom-select-trigger size-${size} ${isOpen ? 'is-open' : ''} ${error ? 'has-error' : ''}`}
        style={triggerStyle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="custom-select-trigger-content">
          {selectedOption ? (
            <>
              {selectedOption.icon && (
                <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                  {selectedOption.icon}
                </span>
              )}
              <span>{selectedOption.label}</span>
              {selectedOption.badge && (
                <span
                  className="custom-select-badge"
                  style={{ backgroundColor: selectedOption.badgeColor || undefined }}
                >
                  {selectedOption.badge}
                </span>
              )}
            </>
          ) : (
            <span className="custom-select-placeholder">{placeholder}</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {clearable && selectedOption && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange('' as T);
              }}
              style={{ color: '#8A7090', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown size={17} className={`custom-select-chevron ${isOpen ? 'is-open' : ''}`} />
        </div>
      </button>

      {/* Floating Menu */}
      {isOpen && (
        <div
          className={`custom-select-menu placement-${actualPlacement} align-${horizontalPlacement}`}
          role="listbox"
          aria-labelledby={selectId}
        >
          {/* Search Box Inside Menu */}
          {isSearchActive && (
            <div className="custom-select-search-wrap" onClick={(e) => e.stopPropagation()}>
              <div className="custom-select-search-box">
                <Search size={15} className="custom-select-search-icon" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="custom-select-search-input"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setFocusedIndex(0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === ' ') {
                      e.stopPropagation();
                    }
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className="custom-select-search-clear"
                    aria-label="Clear search"
                  >
                    <X size={12} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List (Clean, frictionless native touch scrolling without scrollbars) */}
          <ul ref={listRef} className="custom-select-options-list">
            {filteredOptions.length === 0 ? (
              <li className="custom-select-empty">No options found</li>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = selectedOption?.value === opt.value;
                const isFocused = idx === focusedIndex;

                return (
                  <li
                    key={String(opt.value)}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectOption(opt)}
                    className={`custom-select-option ${isSelected ? 'is-selected' : ''} ${
                      opt.disabled ? 'is-disabled' : ''
                    }`}
                    style={{
                      backgroundColor: isFocused && !isSelected ? '#FAF4FB' : undefined,
                    }}
                  >
                    <div className="custom-select-option-main">
                      {opt.icon && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                          {opt.icon}
                        </span>
                      )}
                      <div>
                        <div>{opt.label}</div>
                        {opt.sublabel && (
                          <span className="custom-select-option-sublabel">{opt.sublabel}</span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {opt.badge && (
                        <span
                          className="custom-select-badge"
                          style={{ backgroundColor: opt.badgeColor || undefined }}
                        >
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && <Check size={16} className="custom-select-check" />}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      {/* Error or Hint message */}
      {error && <div className="custom-select-error-msg">{error}</div>}
      {!error && hint && <div className="custom-select-hint">{hint}</div>}
    </div>
  );
}
