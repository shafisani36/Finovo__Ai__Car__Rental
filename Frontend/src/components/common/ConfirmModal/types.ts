import React from 'react';

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmOptions {
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  icon?: React.ReactNode;
  note?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  dangerConfirm?: boolean;
  /** Message only: show a single button and no cancel button */
  hideCancel?: boolean;
}

export interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}
