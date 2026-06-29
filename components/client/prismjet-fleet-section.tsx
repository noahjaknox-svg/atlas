import { FleetShowcaseGrid } from "@/components/client/fleet-showcase-grid";
import type { FleetShowcaseItem } from "@/lib/portal-content";

export function PrismJetFleetSection({
  title,
  body,
  items,
}: {
  title: string;
  body: string | null;
  items: FleetShowcaseItem[];
}) {
  if (items.length === 0) return null;

  return (
    <section
      id="prismjet-fleet"
      className="scroll-mt-[calc(var(--portal-nav-height)+1rem)] border-t border-white/10 pt-16"
    >
      <p className="text-xs uppercase tracking-[0.3em] text-white/45">PrismJet managed fleet</p>
      <h2 className="mt-3 font-serif text-3xl sm:text-4xl">{title}</h2>
      {body ? (
        <p className="mt-4 max-w-2xl whitespace-pre-wrap text-base text-white/70">{body}</p>
      ) : null}
      <FleetShowcaseGrid items={items} />
    </section>
  );
}
