"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useChapterStaggerMode } from "./chapter-stagger-context";

export function ChapterStagger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();
  const mode = useChapterStaggerMode();
  const playEntrance = mode === "enter" && !reducedMotion;

  if (!playEntrance) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: 0.07, delayChildren: 0.04 },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function ChapterStaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();
  const mode = useChapterStaggerMode();
  const playEntrance = mode === "enter" && !reducedMotion;

  if (!playEntrance) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

// Re-export for v1 shell
export { ChapterTransition } from "./chapter-page-transition";
