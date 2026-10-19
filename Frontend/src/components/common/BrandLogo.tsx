interface BrandLogoProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function BrandLogo({
  variant = 'light',
  size = 'md',
  showText = true,
  className = '',
}: BrandLogoProps) {
  const iconSizes = {
    sm: 28,
    md: 36,
    lg: 46,
  };

  const textSizes = {
    sm: '1.15rem',
    md: '1.4rem',
    lg: '1.75rem',
  };

  const isLight = variant === 'light';
  const textColor = isLight ? '#FFFFFF' : '#1A032A';

  return (
    <div
      className={`brand-logo ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        textDecoration: 'none',
        userSelect: 'none',
      }}
    >
      {/* Official Finovo Emblem SVG - Vector representation of the uploaded logo */}
      <svg
        width={iconSizes[size]}
        height={iconSizes[size]}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ flexShrink: 0, display: 'block' }}
      >
        {/* Rounded square container */}
        <rect width="100" height="100" rx="26" fill={isLight ? '#FFFFFF' : '#1A032A'} />
        
        {/* Outer angled chevron bracket */}
        <path
          d="M26 62V38C26 31.3726 31.3726 26 38 26H52L36 42V62H26Z"
          fill={isLight ? '#1A032A' : '#FFFFFF'}
        />
        
        {/* Inner parallel angled stripe */}
        <path
          d="M44 26H60L36 50V74H46V56L68 34H56L44 26Z"
          fill={isLight ? '#1A032A' : '#FFFFFF'}
        />

        {/* Lower interlocking hook */}
        <path
          d="M74 38L52 60V74C52 74 68 74 74 68V38Z"
          fill={isLight ? '#1A032A' : '#FFFFFF'}
        />
      </svg>

      {showText && (
        <span
          style={{
            fontFamily: 'var(--font-family-display)',
            fontSize: textSizes[size],
            fontWeight: 800,
            letterSpacing: '-0.025em',
            color: textColor,
            lineHeight: 1,
            display: 'inline-flex',
            alignItems: 'baseline',
          }}
        >
          Finovo
        </span>
      )}
    </div>
  );
}
