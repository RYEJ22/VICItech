import type { ReactElement, ReactNode } from 'react';

export default function RootTemplate({
  children,
}: {
  readonly children: ReactNode;
}): ReactElement {
  return <div className="vt-page-in">{children}</div>;
}
