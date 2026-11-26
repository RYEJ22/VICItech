'use client';

import type { ReactNode } from 'react';

export interface ThemeProviderProps {
  readonly children: ReactNode;
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
  return <>{children}</>;
}
