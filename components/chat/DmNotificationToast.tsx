"use client";

import type { ReactElement } from "react";
import { MessageSquare, X } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import type { IncomingDmToast } from "@/lib/chat/dm-notifications";

export interface DmNotificationToastProps {
  readonly toasts: readonly IncomingDmToast[];
  readonly onOpen: (toast: IncomingDmToast) => void;
  readonly onDismiss: (id: string) => void;
}

function senderInitial(name: string): string {
  const first = name.trim().charAt(0).toUpperCase();
  return first || "V";
}

export function DmNotificationToast({
  toasts,
  onOpen,
  onDismiss,
}: DmNotificationToastProps): ReactElement | null {
  const { isEnglish } = useLanguage();
  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label={isEnglish ? "New direct message notifications" : "Notifikasi pesan langsung baru"}
      aria-live="polite"
      className="pointer-events-none fixed right-3 top-20 z-[70] flex w-[min(22rem,calc(100vw-1.5rem))] flex-col gap-2.5 md:right-4 md:top-20"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="vt-toast-enter pointer-events-auto flex items-start gap-3 rounded-xl border border-default bg-surface p-3 shadow-lg"
        >
          <button
            type="button"
            onClick={() => onOpen(toast)}
            className="flex min-h-11 min-w-0 flex-1 items-start gap-3 rounded-lg text-left transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
          >
            <span className="relative mt-0.5 grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-accent-subtle text-sm font-semibold text-accent-hover ring-1 ring-black/[0.06]">
              {toast.senderAvatarUrl ? (
                <img
                  src={toast.senderAvatarUrl}
                  alt=""
                  width={40}
                  height={40}
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              ) : (
                senderInitial(toast.senderName)
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-accent-hover">
                <MessageSquare className="h-3 w-3 shrink-0 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                <span>{isEnglish ? "New Message" : "Pesan Baru"}</span>
              </span>
              <span className="mt-0.5 block truncate text-sm font-semibold text-primary">
                {toast.senderName}
              </span>
              <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-secondary">
                {toast.preview}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label={isEnglish ? `Dismiss notification from ${toast.senderName}` : `Tutup notifikasi dari ${toast.senderName}`}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-secondary transition-colors hover:bg-subtle hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
          >
            <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
