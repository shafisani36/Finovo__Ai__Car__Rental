import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, HelpCircle, CheckCircle2, X } from 'lucide-react';
import type { ConfirmOptions } from './types';
import './ConfirmModal.css';

interface ConfirmModalProps {
  options: ConfirmOptions;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  options,
  onConfirm,
  onCancel,
}) => {
  const {
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    icon,
    note,
    closeOnBackdrop = true,
    closeOnEscape = true,
  } = options;

  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);

  // Lock body scroll and set initial focus
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Auto-focus confirm button on non-danger, or cancel button on danger for safety
    const timer = setTimeout(() => {
      confirmBtnRef.current?.focus();
    }, 50);

    return () => {
      document.body.style.overflow = originalOverflow;
      clearTimeout(timer);
    };
  }, [variant]);

  // Handle ESC / Enter keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeOnEscape, onCancel]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && closeOnBackdrop) {
      onCancel();
    }
  };

  // Default Icon by variant
  const renderIcon = () => {
    if (icon) return icon;
    switch (variant) {
      case 'danger':
        return <Trash2 size={24} strokeWidth={2.2} />;
      case 'warning':
        return <AlertTriangle size={24} strokeWidth={2.2} />;
      case 'success':
        return <CheckCircle2 size={24} strokeWidth={2.2} />;
      case 'info':
      default:
        return <HelpCircle size={24} strokeWidth={2.2} />;
    }
  };

  return (
    <div
      className="confirm-modal-overlay"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        className="confirm-modal-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-desc"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Accent Band at top */}
        <div className={`confirm-accent-band variant-${variant}`} />

        {/* Close Button */}
        <button
          type="button"
          className="confirm-modal-close"
          onClick={onCancel}
          aria-label="Close dialog"
        >
          <X size={17} />
        </button>

        <div className="confirm-modal-inner">
          {/* Header Row */}
          <div className="confirm-header-row">
            <div className={`confirm-icon-badge variant-${variant}`}>
              {renderIcon()}
            </div>
            <div className="confirm-title-area">
              <h3 id="confirm-modal-title" className="confirm-title">
                {title}
              </h3>
              <span className={`confirm-badge-tag variant-${variant}`}>
                {variant} action
              </span>
            </div>
          </div>

          {/* Body Content */}
          <div className="confirm-body">
            <div id="confirm-modal-desc" className="confirm-message">
              {message}
            </div>

            {note && (
              <div className={`confirm-note-callout variant-${variant}`}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{note}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="confirm-actions">
            <button
              type="button"
              className="confirm-btn confirm-btn-cancel"
              onClick={onCancel}
            >
              {cancelText}
            </button>
            <button
              ref={confirmBtnRef}
              type="button"
              className={`confirm-btn confirm-btn-action variant-${variant}`}
              onClick={onConfirm}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
