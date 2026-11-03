import finovoLogo from '../../assets/finovo-logo.png';

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
    sm: 30,
    md: 40,
    lg: 52,
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
      <img
        src={finovoLogo}
        alt="Finovo Logo"
        width={iconSizes[size]}
        height={iconSizes[size]}
        style={{
          width: `${iconSizes[size]}px`,
          height: `${iconSizes[size]}px`,
          borderRadius: size === 'sm' ? '8px' : size === 'md' ? '10px' : '14px',
          objectFit: 'contain',
          display: 'block',
          flexShrink: 0,
        }}
      />

      {showText && (
        <span
          style={{
            fontFamily: 'var(--font-family-display, "Archivo", sans-serif)',
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
