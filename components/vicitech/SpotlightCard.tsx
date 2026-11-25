import type { ComponentPropsWithoutRef, ReactElement, ReactNode } from 'react';

interface SpotlightCardProps extends ComponentPropsWithoutRef<'div'> {
  readonly children: ReactNode;
  readonly className?: string;
}

export default function SpotlightCard({
  children,
  className = '',
  ...props
}: SpotlightCardProps): ReactElement {
  return (
    <div
      className={`vt-card-lift rounded-xl border border-default bg-surface shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
