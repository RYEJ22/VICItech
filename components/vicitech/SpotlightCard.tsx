"use client";

import { useMotionTemplate, useMotionValue, motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

export default function SpotlightCard({
  children,
  className = "",
  ...props
}: { children: ReactNode; className?: string } & Omit<HTMLMotionProps<"div">, "ref">) {
  const pointerX = useMotionValue(-500);
  const pointerY = useMotionValue(-500);
  const spotlight = useMotionTemplate`radial-gradient(420px circle at ${pointerX}px ${pointerY}px, rgba(16,185,129,0.10), transparent 76%)`;

  return (
    <motion.div
      onPointerMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        pointerX.set(event.clientX - bounds.left);
        pointerY.set(event.clientY - bounds.top);
      }}
      onPointerLeave={() => {
        pointerX.set(-500);
        pointerY.set(-500);
      }}
      className={`relative isolate overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl shadow-zinc-200/50 transition-colors duration-200 dark:border-zinc-800 dark:bg-zinc-900/75 dark:shadow-black/10 ${className}`}
      {...props}
    >
      <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={{ background: spotlight }} />
      {children}
    </motion.div>
  );
}
