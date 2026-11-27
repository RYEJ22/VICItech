'use client';

import { Cpu, HardDrive, ShieldCheck, Wallet } from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { openAiConsultation } from '@/lib/ai/open-ai-consultation';
import styles from './vici-chat.module.css';

const PRESET_ICONS = {
  build: Cpu,
  upgrade: HardDrive,
  qc: ShieldCheck,
  parts: Wallet,
} as const;

export function ConsultationPresets() {
  const { t } = useLanguage();
  const ai = t.routes.aiConsultant;

  return (
    <aside className="w-full max-w-full min-w-0 shrink-0" aria-label={ai.presetsAria}>
      {/* Compact single-row horizontal strip on mobile & tablet (< lg) so the chat thread stays above the fold */}
      <div className="w-full max-w-full min-w-0 overflow-hidden lg:hidden">
        <div className="no-scrollbar flex w-full flex-nowrap gap-2 overflow-x-auto pb-1">
          {ai.presets.map(({ id, shortTitle, prompt }) => {
            const Icon = PRESET_ICONS[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => openAiConsultation(prompt)}
                className={`${styles.starterChip} vt-motion-press inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50`}
              >
                <Icon size={15} className="shrink-0 text-accent-primary" aria-hidden="true" />
                <span>{shortTitle}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Full vertical preset cards on desktop (>= lg) */}
      <div className="hidden gap-3 lg:grid lg:grid-cols-1">
        {ai.presets.map(({ id, title, description, prompt }) => {
          const Icon = PRESET_ICONS[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => openAiConsultation(prompt)}
              className="vt-card-lift vt-motion-press flex min-h-[86px] w-full items-start gap-3 rounded-xl border border-default bg-surface p-4 text-left shadow-card transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:border-strong hover:shadow-card-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent-subtle text-accent-primary">
                <Icon size={19} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-primary">{title}</span>
                <span className="mt-1 block text-xs leading-5 text-secondary">{description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
