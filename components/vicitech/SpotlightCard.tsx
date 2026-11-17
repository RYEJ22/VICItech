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
  const spotlight = useMotionTemplate`radial-gradient(380px circle at ${pointerX}px ${pointerY}px, rgba(255,255,255,0.6), transparent 80%)`;

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
      className={`relative isolate overflow-hidden rounded-2xl bg-gradient-to-b from-[#FFFFFF] via-[#F5F6F8] to-[#EAECEF] shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.95),0_12px_32px_-8px_rgba(20,21,24,0.08)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.95),0_20px_40px_-12px_rgba(20,21,24,0.12)] border-none ${className}`}
      {...props}
    >
      <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={{ background: spotlight }} />
      {children}
    </motion.div>
  );
}
