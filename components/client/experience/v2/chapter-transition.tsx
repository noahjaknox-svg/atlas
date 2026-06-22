"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

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
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        className="h-full min-h-0"
        initial={
          reducedMotion
            ? { opacity: 0 }
            : { opacity: 0, x: enterX, y: 14, filter: "blur(4px)" }
        }
        animate={
          reducedMotion
            ? { opacity: 1 }
            : { opacity: 1, x: 0, y: 0, filter: "blur(0px)" }
        }
        exit={
          reducedMotion
            ? { opacity: 0 }
            : { opacity: 0, x: exitX, y: -10, filter: "blur(4px)" }
        }
        transition={{
          duration: reducedMotion ? 0.12 : 0.38,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function ChapterStagger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
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

  if (reducedMotion) {
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
