import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: number | string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = '580px',
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="finovo-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="finovo-modal-panel custom-scrollbar"
        style={{
          maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="finovo-modal-header">
          <div>
            <h3 className="finovo-modal-title">{title}</h3>
            {subtitle && (
              <p style={{ margin: '4px 0 0', fontSize: '0.825rem', color: '#66566A' }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            className="finovo-modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        <div className="finovo-modal-body custom-scrollbar">
          {children}
        </div>

        {footer && (
          <div className="finovo-modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
