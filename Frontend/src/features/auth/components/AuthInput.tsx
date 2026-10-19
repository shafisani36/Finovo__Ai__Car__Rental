import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
  error?: string;
  isPassword?: boolean;
}

export function AuthInput({
  label,
  icon,
  error,
  isPassword = false,
  id,
  type = 'text',
  ...rest
}: AuthInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div style={{ marginBottom: '18px', width: '100%', textAlign: 'left' }}>
      <label
        htmlFor={inputId}
        style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: '#2E0738',
          marginBottom: '7px',
          fontFamily: 'var(--font-family-sans, "Manrope", sans-serif)',
        }}
      >
        {label}
      </label>

      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
        }}
      >
        {icon && (
          <div
            style={{
              position: 'absolute',
              left: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#8A7090',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          >
            {icon}
          </div>
        )}

        <input
          id={inputId}
          type={inputType}
          style={{
            width: '100%',
            height: '48px',
            paddingLeft: icon ? '44px' : '16px',
            paddingRight: isPassword ? '44px' : '16px',
            fontSize: '0.95rem',
            fontFamily: 'var(--font-family-sans, "Manrope", sans-serif)',
            color: '#1C0324',
            backgroundColor: '#FAFAFB',
            border: error ? '1.5px solid #E53935' : '1.5px solid #E5DFE7',
            borderRadius: '12px',
            outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s, background-color 0.2s',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#6C1E84';
            e.currentTarget.style.backgroundColor = '#FFFFFF';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(108, 30, 132, 0.12)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? '#E53935' : '#E5DFE7';
            e.currentTarget.style.backgroundColor = '#FAFAFB';
            e.currentTarget.style.boxShadow = 'none';
          }}
          {...rest}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            style={{
              position: 'absolute',
              right: '12px',
              background: 'none',
              border: 'none',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#8A7090',
              cursor: 'pointer',
              borderRadius: '6px',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#380B44')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#8A7090')}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>

      {error && (
        <p
          style={{
            fontSize: '0.8rem',
            color: '#E53935',
            marginTop: '5px',
            marginBottom: '0',
            fontWeight: 500,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
