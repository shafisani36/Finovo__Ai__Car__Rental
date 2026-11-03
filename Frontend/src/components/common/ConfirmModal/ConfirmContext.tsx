import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { ConfirmModal } from './ConfirmModal';
import type { ConfirmOptions, ConfirmContextValue } from './types';

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

let globalConfirmBridge: ((options: ConfirmOptions) => Promise<boolean>) | null = null;

/**
 * Imperative global confirmation helper that works anywhere in the application.
 * Calls into the active ConfirmProvider dialog.
 */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  if (globalConfirmBridge) {
    return globalConfirmBridge(options);
  }
  console.warn('[ConfirmDialog] ConfirmProvider not mounted yet. Falling back to native confirm.');
  const text = typeof options.message === 'string' ? options.message : options.title;
  return Promise.resolve(window.confirm(text));
}

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modalOptions, setModalOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      // If a dialog was already pending, cancel previous one
      if (resolverRef.current) {
        resolverRef.current(false);
      }
      resolverRef.current = resolve;
      setModalOptions(options);
    });
  }, []);

  // Connect global imperative bridge
  useEffect(() => {
    globalConfirmBridge = confirm;
    return () => {
      if (globalConfirmBridge === confirm) {
        globalConfirmBridge = null;
      }
    };
  }, [confirm]);

  const handleConfirm = useCallback(() => {
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
    setModalOptions(null);
  }, []);

  const handleCancel = useCallback(() => {
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
    setModalOptions(null);
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {modalOptions && (
        <ConfirmModal
          options={modalOptions}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmContext.Provider>
  );
};

export function useConfirm(): ConfirmContextValue {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a <ConfirmProvider>');
  }
  return context;
}
