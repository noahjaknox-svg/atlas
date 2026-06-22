import { RevealOnScroll } from "./reveal-on-scroll";

export function PullQuote({
  text,
  attribution,
  slide = false,
}: {
  text: string;
  attribution?: string;
  slide?: boolean;
}) {
  return (
    <RevealOnScroll delayMs={80}>
      <blockquote
        className={
          slide
            ? "relative shrink-0 border-l-4 border-atlas-accent bg-gradient-to-r from-atlas-accent/10 to-transparent px-4 py-3 sm:px-5"
            : "relative my-10 border-l-4 border-atlas-accent bg-gradient-to-r from-atlas-accent/10 to-transparent px-6 py-8 sm:px-10"
        }
      >
        <p
          className={
            slide
              ? "font-serif text-sm leading-relaxed text-white/90 sm:text-base"
              : "font-serif text-xl leading-relaxed text-white/90 sm:text-2xl"
          }
        >
          &ldquo;{text}&rdquo;
        </p>
        {attribution ? (
          <footer className={slide ? "mt-1 text-xs text-atlas-accent" : "mt-4 text-sm text-atlas-accent"}>
            {attribution}
          </footer>
        ) : null}
      </blockquote>
    </RevealOnScroll>
  );
}
