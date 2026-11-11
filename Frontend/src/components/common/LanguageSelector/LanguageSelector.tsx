import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown, Check } from 'lucide-react';
import {
  SUPPORTED_LANGUAGES,
  STORAGE_KEY_LANGUAGE,
  applyDocumentLanguage,
  normalizeLanguageCode,
  type LanguageCode,
} from '../../../i18n/config';
import { useAuth } from '../../../features/auth/context';
import { apiClient } from '../../../api/client';
import { API_ENDPOINTS } from '../../../api/endpoints';

export interface LanguageSelectorProps {
  variant?: 'customer' | 'admin';
  className?: string;
}

export function LanguageSelector({ variant = 'customer', className = '' }: LanguageSelectorProps) {
  const { i18n } = useTranslation();
  const { isAuthenticated, updatePreferredLanguage } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLang: LanguageCode = normalizeLanguageCode(i18n.language) || 'en';
  const currentConfig = SUPPORTED_LANGUAGES[currentLang] || SUPPORTED_LANGUAGES.en;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectLanguage = async (code: LanguageCode) => {
    setIsOpen(false);
    if (code === currentLang) {
      return;
    }

    // Update local persistence, DOM direction/attributes, and in-memory AuthContext immediately
    // so the UI switches live without reverting or requiring a manual browser refresh.
    try {
      localStorage.setItem(STORAGE_KEY_LANGUAGE, code);
    } catch {
      // Ignore storage access restrictions
    }
    applyDocumentLanguage(code);
    await i18n.changeLanguage(code);

    if (isAuthenticated) {
      updatePreferredLanguage(code);
    }

    // Recalculate layout measurements (responsive headers, scroll triggers, RTL shifts)
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
      });
    }

    // Persist preference to MySQL backend when authenticated
    if (isAuthenticated) {
      try {
        const res = await apiClient.put<{ success?: boolean; user?: { preferredLanguage?: string | null } }>(
          API_ENDPOINTS.TRANSLATIONS.PREFERENCE,
          { preferredLanguage: code }
        );
        if (res?.user?.preferredLanguage && normalizeLanguageCode(i18n.language) === code) {
          updatePreferredLanguage(res.user.preferredLanguage);
        }
      } catch {
        // Silently preserve selected client language if network fails
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown' && !isOpen) {
      setIsOpen(true);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`finovo-language-selector ${className}`}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        className={`finovo-language-trigger ${variant === 'admin' ? 'admin-variant' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select display language"
      >
        <Globe size={14} style={{ flexShrink: 0 }} />
        <span className="finovo-lang-native">{currentConfig.nativeName}</span>
        <span className="finovo-lang-short">{currentConfig.shortCode}</span>
        <ChevronDown
          size={13}
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s ease',
            flexShrink: 0,
          }}
        />
      </button>

      {isOpen && (
        <div
          className={`finovo-language-dropdown ${variant === 'admin' ? 'admin-variant' : ''}`}
          role="listbox"
          aria-label="Available languages"
        >
          {(Object.keys(SUPPORTED_LANGUAGES) as LanguageCode[]).map((code) => {
            const config = SUPPORTED_LANGUAGES[code];
            const isSelected = code === currentLang;

            return (
              <button
                key={code}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`finovo-language-option ${isSelected ? 'active' : ''}`}
                onClick={() => handleSelectLanguage(code)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: isSelected ? 700 : 500 }}>{config.nativeName}</span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      opacity: 0.65,
                      fontWeight: 400,
                    }}
                  >
                    ({config.name})
                  </span>
                </div>
                {isSelected && <Check size={14} style={{ color: '#FAB826', flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

