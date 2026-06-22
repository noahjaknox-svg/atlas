"use client";

import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const fn = () => setReduced(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}

type MotionProps = Omit<ComponentPropsWithoutRef<"div">, "onDragEnd"> & {
  initial?: Record<string, unknown> | string;
  animate?: Record<string, unknown> | string;
  exit?: Record<string, unknown>;
  transition?: Record<string, unknown>;
  variants?: Record<string, Record<string, unknown>>;
  drag?: false | "x" | "y";
  dragConstraints?: { left?: number; right?: number; top?: number; bottom?: number };
  dragElastic?: number;
  onDragEnd?: (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { x: number; y: number } }
  ) => void;
};

function makeMotion(tag: "div" | "main") {
  const Comp = tag;
  return forwardRef<HTMLElement, MotionProps>(function MotionEl(
    { className, children, onDragEnd, drag, variants, initial, animate, style, ...props },
    ref
  ) {
    const touchStart = useRef<{ x: number; y: number } | null>(null);
    const [staggerReady, setStaggerReady] = useState(false);

    useEffect(() => {
      if (!variants) return;
      const id = requestAnimationFrame(() => setStaggerReady(true));
      return () => cancelAnimationFrame(id);
    }, [variants]);

    function handleTouchStart(e: React.TouchEvent) {
      if (!drag || !onDragEnd) return;
      const t = e.touches[0];
      if (!t) return;
      touchStart.current = { x: t.clientX, y: t.clientY };
    }

    function handleTouchEnd(e: React.TouchEvent) {
      if (!drag || !onDragEnd || !touchStart.current) return;
      const t = e.changedTouches[0];
      if (!t) return;
      const offset = {
        x: t.clientX - touchStart.current.x,
        y: t.clientY - touchStart.current.y,
      };
      touchStart.current = null;
      onDragEnd(e.nativeEvent, { offset });
    }

    const staggerChildren =
      variants && staggerReady
        ? Children.map(children, (child, i) => {
            if (!isValidElement(child)) return child;
            const el = child as ReactElement<{ className?: string; style?: CSSProperties }>;
            return cloneElement(el, {
              className: cn(
                el.props.className,
                "motion-safe:animate-[fadeUp_0.4s_ease-out_both]"
              ),
              style: {
                ...el.props.style,
                animationDelay: `${0.05 + i * 0.08}s`,
              },
            });
          })
        : children;

    return (
      <Comp
        ref={ref as never}
        className={className}
        style={style}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        {...props}
      >
        {staggerChildren ?? children}
      </Comp>
    );
  });
}

export const motion = {
  div: makeMotion("div"),
  main: makeMotion("main"),
};

export function AnimatePresence({
  children,
}: {
  children: ReactNode;
  mode?: "wait" | "sync" | "popLayout";
}) {
  return <>{children}</>;
}
