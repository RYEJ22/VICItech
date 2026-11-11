"use client";

import { AnimatePresence, motion, type HTMLMotionProps } from "framer-motion";
import { AlertTriangle, CheckCircle2, LoaderCircle, type LucideIcon } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

export interface CyberToastMessage {
  message: string;
  tone: "success" | "error" | "info";
}

interface CyberButtonProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: "primary" | "secondary";
  children: ReactNode;
}

export function CyberButton({
  variant = "primary",
  className = "",
  type = "button",
  children,
  ...props
}: CyberButtonProps) {
  const styles = variant === "primary"
    ? "border border-emerald-500/50 bg-emerald-500 text-emerald-950 shadow-[0_0_24px_-10px_rgba(16,185,129,0.75)] hover:border-emerald-400 hover:bg-emerald-400"
    : "border border-zinc-300 bg-white text-zinc-700 shadow-sm hover:border-emerald-500/60 hover:text-emerald-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:text-emerald-300";

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 420, damping: 24 }}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${styles} ${className}`}
      type={type}
      {...props}
    >
      {children}
    </motion.button>
  );
}

const BADGE_STYLES = {
  passed: {
    label: "Passed",
    icon: CheckCircle2,
    style: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  testing: {
    label: "Testing",
    icon: LoaderCircle,
    style: "border-amber-500/30 bg-amber-400/10 text-amber-700 dark:text-amber-300",
  },
  failed: {
    label: "Failed",
    icon: AlertTriangle,
    style: "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300",
  },
} satisfies Record<string, { label: string; icon: LucideIcon; style: string }>;

export function QCStatusBadge({
  status,
  className = "",
}: {
  status: keyof typeof BADGE_STYLES;
  className?: string;
}) {
  const badge = BADGE_STYLES[status];
  const Icon = badge.icon;

  return (
    <span className={`relative inline-flex items-center gap-1.5 overflow-hidden rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${badge.style} ${className}`}>
      {status === "testing" && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-amber-300/35 to-transparent"
          animate={{ x: ["-200%", "500%"] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
      )}
      <Icon className={`relative h-3.5 w-3.5 ${status === "testing" ? "animate-spin" : ""}`} />
      <span className="relative">{badge.label}</span>
      {status === "testing" && <span className="relative h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500 dark:bg-amber-300" />}
    </span>
  );
}

export function CyberToast({
  toast,
  onDismiss,
}: {
  toast: CyberToastMessage | null;
  onDismiss: () => void;
}) {
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => dismissRef.current(), 4200);
    return () => window.clearTimeout(timer);
  }, [toast?.message, toast?.tone]);

  const toneStyles = toast?.tone === "success"
    ? "border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
    : toast?.tone === "error"
      ? "border-amber-500/30 text-amber-800 dark:text-amber-200"
      : "border-zinc-300 text-zinc-800 dark:border-zinc-700 dark:text-zinc-200";

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] w-[min(22rem,calc(100vw-2rem))]">
      <AnimatePresence>
        {toast && (
          <motion.div
            role={toast.tone === "error" ? "alert" : "status"}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-white/80 p-4 shadow-xl shadow-zinc-300/50 backdrop-blur-md dark:bg-zinc-900/80 dark:shadow-black/30 ${toneStyles}`}
          >
            {toast.tone === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
            <p className="flex-1 text-sm leading-5">{toast.message}</p>
            <button type="button" onClick={onDismiss} className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200" aria-label="Dismiss notification">×</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
