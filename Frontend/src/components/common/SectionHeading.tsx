import type { ReactNode } from 'react';

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  align?: 'left' | 'center' | 'split';
  theme?: 'dark' | 'light' | 'sand';
  action?: ReactNode;
}

export function SectionHeading({
  title,
  subtitle,
  eyebrow,
  align = 'left',
  theme = 'light',
  action,
}: SectionHeadingProps) {
  const isDarkTheme = theme === 'dark';
  const isSandTheme = theme === 'sand';

  const titleColor = isDarkTheme
    ? 'var(--text-white)'
    : isSandTheme
    ? 'var(--color-sand-900)'
    : 'var(--text-dark-primary)';

  const subtitleColor = isDarkTheme
    ? 'var(--text-white-secondary)'
    : isSandTheme
    ? 'var(--color-sand-800)'
    : 'var(--text-dark-secondary)';

  if (align === 'split') {
    return (
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '24px',
          marginBottom: '40px',
        }}
      >
        <div style={{ maxWidth: '640px' }}>
          {eyebrow && (
            <div
              style={{
                fontFamily: 'var(--font-family-sans)',
                fontSize: '0.875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--color-accent-500)',
                marginBottom: '8px',
              }}
            >
              {eyebrow}
            </div>
          )}
          <h2
            style={{
              fontFamily: 'var(--font-family-display)',
              fontSize: 'clamp(1.85rem, 3.2vw, 2.5rem)',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: titleColor,
              lineHeight: 1.15,
            }}
          >
            {title}
          </h2>
        </div>
        {subtitle && (
          <p
            style={{
              fontSize: '1rem',
              color: subtitleColor,
              maxWidth: '460px',
              lineHeight: 1.6,
            }}
          >
            {subtitle}
          </p>
        )}
        {action && <div>{action}</div>}
      </div>
    );
  }

  return (
    <div
      style={{
        textAlign: align,
        maxWidth: align === 'center' ? '720px' : '640px',
        margin: align === 'center' ? '0 auto 48px auto' : '0 0 40px 0',
      }}
    >
      {eyebrow && (
        <div
          style={{
            fontFamily: 'var(--font-family-sans)',
            fontSize: '0.875rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--color-accent-500)',
            marginBottom: '8px',
          }}
        >
          {eyebrow}
        </div>
      )}
      <h2
        style={{
          fontFamily: 'var(--font-family-display)',
          fontSize: 'clamp(1.85rem, 3.2vw, 2.5rem)',
          fontWeight: 800,
          letterSpacing: '-0.025em',
          color: titleColor,
          lineHeight: 1.15,
          marginBottom: subtitle ? '12px' : '0',
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          style={{
            fontSize: '1.05rem',
            color: subtitleColor,
            lineHeight: 1.6,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
