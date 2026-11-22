import type { ReactElement, ReactNode } from "react";

export interface AuthPageShellProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
}

export function AuthPageShell({ eyebrow, title, description, children }: AuthPageShellProps): ReactElement {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md items-start px-4 pb-16 pt-2 sm:pt-8">
      <section className="w-full rounded-xl border border-default bg-surface p-6 shadow-sm sm:p-8">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-primary">{eyebrow}</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-primary [text-wrap:balance]">{title}</h1>
        <p className="mt-2 mb-6 text-sm leading-relaxed text-secondary">{description}</p>
        {children}
      </section>
    </main>
  );
}
