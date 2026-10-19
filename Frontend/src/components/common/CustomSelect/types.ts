import React from 'react';

export interface SelectOption<T = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  sublabel?: string;
  disabled?: boolean;
}

export interface CustomSelectProps<T = string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  clearable?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark' | 'glass';
  label?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
  className?: string;
  style?: React.CSSProperties;
  triggerStyle?: React.CSSProperties;
  containerStyle?: React.CSSProperties;
  menuPlacement?: 'bottom' | 'top' | 'auto';
  id?: string;
}
