import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { SUPPORTED_LANGUAGES, type LanguageCode } from '../../../i18n/config';
import { useAuth } from '../../../features/auth/context';
import { apiClient } from '../../../api/client';

export interface LanguageSelectorProps {
  variant?: 'customer' | 'admin';
  className?: string;
}

export function LanguageSelector({ variant = 'customer', className = '' }: LanguageSelectorProps) {
  const { i18n } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLang = (i18n.language?.slice(0, 2) as LanguageCode) || 'en';
  const currentConfig = SUPPORTED_LANGUAGES[currentLang] || SUPPORTED_LANGUAGES.en;

  // Sync authenticated user preference on initial load or user change
  useEffect(() => {
    const userPref = (user as unknown as { preferredLanguage?: string })?.preferredLanguage;
    if (userPref && (userPref === 'en' || userPref === 'ur' || userPref === 'ar')) {
      if (userPref !== currentLang) {
        i18n.changeLanguage(userPref);
      }
    }
  }, [user, currentLang, i18n]);

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
    if (code === currentLang) {
      setIsOpen(false);
      return;
    }

    await i18n.changeLanguage(code);
    setIsOpen(false);

    // If authenticated, persist preference to MySQL backend
    if (isAuthenticated) {
      try {
        await apiClient.put('/auth/profile/language', { preferredLanguage: code });
      } catch {
        // Silently preserve client state if network fails
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
        <span>{currentConfig.nativeName}</span>
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

