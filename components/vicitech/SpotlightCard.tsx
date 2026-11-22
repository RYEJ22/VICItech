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
      className={`rounded-xl border border-default bg-surface shadow-sm transition-[transform,border-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-accent-primary/40 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
