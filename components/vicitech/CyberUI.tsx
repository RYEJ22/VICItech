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
    ? "bg-[#FF5500] text-white hover:bg-[#e04b00] shadow-[0_4px_16px_rgba(255,85,0,0.25)] border-none"
    : "bg-white/80 text-[#141518] hover:bg-white shadow-sm border-none";

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 420, damping: 24 }}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-45 ${styles} ${className}`}
      type={type}
      {...props}
    >
      {children}
    </motion.button>
  );
}

const BADGE_STYLES = {
  passed: {
    label: "Certified Pass",
    icon: CheckCircle2,
    style: "bg-[#FF5500]/10 text-[#FF5500] border border-[#FF5500]/20",
  },
  testing: {
    label: "Stress-Testing",
    icon: LoaderCircle,
    style: "bg-black/5 text-[#5A606A] border border-black/10",
  },
  failed: {
    label: "Inspection Alert",
    icon: AlertTriangle,
    style: "bg-red-500/10 text-red-600 border border-red-500/20",
  },
} satisfies Record<string, { label: string; icon: LucideIcon; style: string }>;

export function QCStatusBadge({
  status,
  className = "",
}: {
  status: "passed" | "testing" | "failed";
  className?: string;
}) {
  const config = BADGE_STYLES[status] || BADGE_STYLES.passed;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.style} ${className}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{config.label}</span>
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
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!toast) return;

    timerRef.current = setTimeout(() => {
      onDismiss();
    }, 4500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast, onDismiss]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 right-6 z-50 flex max-w-sm items-center gap-3 rounded-2xl glass-floating p-4 shadow-2xl text-[#141518]"
          role="status"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#FF5500]/10 text-[#FF5500]">
            <CheckCircle2 className="h-4 w-4" />
          </span>
          <p className="text-sm font-medium leading-snug">{toast.message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
