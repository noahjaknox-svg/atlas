import { RevealOnScroll } from "./reveal-on-scroll";

export function PullQuote({
  text,
  attribution,
}: {
  text: string;
  attribution?: string;
}) {
  return (
    <RevealOnScroll delayMs={80}>
      <blockquote className="relative my-10 border-l-4 border-atlas-accent bg-gradient-to-r from-atlas-accent/10 to-transparent px-6 py-8 sm:px-10">
        <p className="font-serif text-xl leading-relaxed text-white/90 sm:text-2xl">
          &ldquo;{text}&rdquo;
        </p>
        {attribution ? (
          <footer className="mt-4 text-sm text-atlas-accent">{attribution}</footer>
        ) : null}
      </blockquote>
    </RevealOnScroll>
  );
}
