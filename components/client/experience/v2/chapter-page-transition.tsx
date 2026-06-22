"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/** v1 shell page transition — kept separate from chapter stagger helpers. */
export function ChapterTransition({
  children,
  direction = 0,
}: {
  children: React.ReactNode;
  direction?: number;
}) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();
  const enterX = direction >= 0 ? 28 : -28;
  const exitX = direction >= 0 ? -20 : 20;

  return (
    <AnimatePresence mode="sync" initial={false}>
      <motion.div
        key={pathname}
        className="min-h-0"
        initial={
          reducedMotion
            ? { opacity: 0 }
            : { opacity: 0, x: enterX, y: 8, scale: 0.98 }
        }
        animate={
          reducedMotion
            ? { opacity: 1 }
            : { opacity: 1, x: 0, y: 0, scale: 1 }
        }
        exit={
          reducedMotion
            ? { opacity: 0 }
            : { opacity: 0, x: exitX, y: -6, scale: 0.98 }
        }
        transition={{
          duration: reducedMotion ? 0.12 : 0.48,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
