import type { CSSProperties } from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  message?: string;
  minHeight?: number | string;
  className?: string;
  style?: CSSProperties;
}

export function LoadingState({
  message = 'Loading...',
  minHeight = '320px',
  className = '',
  style = {},
}: LoadingStateProps) {
  return (
    <div
      className={`finovo-loading-state ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight,
        width: '100%',
        color: '#6C1E84',
        ...style,
      }}
    >
      <Loader2
        size={32}
        style={{
          animation: 'finovoSpin 0.9s linear infinite',
        }}
      />
      <span
        style={{
          fontSize: '0.9rem',
          fontWeight: 600,
          color: '#8A7090',
        }}
      >
        {message}
      </span>

      <style>{`
        @keyframes finovoSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export function SkeletonRow({ count = 5 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            height: '42px',
            backgroundColor: '#F3EEF4',
            borderRadius: '8px',
            animation: 'finovoPulse 1.5s ease-in-out infinite',
          }}
        />
      ))}
      <style>{`
        @keyframes finovoPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
