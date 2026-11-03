import type { ReactNode, CSSProperties } from 'react';

export interface PageContainerProps {
  children: ReactNode;
  maxWidth?: number | string;
  className?: string;
  style?: CSSProperties;
}

export function PageContainer({
  children,
  maxWidth,
  className = '',
  style = {},
}: PageContainerProps) {
  const customStyle: CSSProperties = {
    ...(maxWidth ? { maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth } : {}),
    ...style,
  };

  return (
    <div className={`finovo-page-container ${className}`} style={customStyle}>
      {children}
    </div>
  );
}
