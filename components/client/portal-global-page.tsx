import { ClientShell } from "@/components/client/client-shell";
import { CloudBackground } from "@/components/client/cloud-background";
import type { PortalContentData, FleetShowcaseItem } from "@/lib/portal-content";

export function PortalGlobalPage({
  slug,
  clientDisplayName,
  contactName,
  branding,
  title,
  children,
}: {
  slug: string;
  clientDisplayName?: string;
  /** @deprecated Use clientDisplayName */
  contactName?: string;
  branding: {
    heroCloudImageUrl: string;
    heroCloudVideoUrl: string | null;
    logoUrl: string;
  };
  title: string;
  children: React.ReactNode;
}) {
  return (
    <ClientShell
      slug={slug}
      clientDisplayName={clientDisplayName ?? contactName}
      logoUrl={branding.logoUrl}
      variant="immersive"
    >
      <CloudBackground
        imageUrl={branding.heroCloudImageUrl}
        videoUrl={branding.heroCloudVideoUrl}
        overlay="dark"
        className="min-h-[calc(100vh-var(--portal-nav-height))]"
      >
        <div className="flex min-h-[calc(100vh-var(--portal-nav-height))] flex-col justify-center px-6 py-16 sm:px-12 lg:px-20">
          <h1 className="max-w-4xl font-serif text-4xl leading-tight sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <div className="mt-8 max-w-2xl text-lg leading-relaxed text-white/85">{children}</div>
        </div>
      </CloudBackground>
    </ClientShell>
  );
}

export function FleetShowcaseGrid({ items }: { items: FleetShowcaseItem[] }) {
  const hero = items[0];
  const rest = items.slice(1);

  if (!hero) return null;

  return (
    <div className="mt-12 space-y-10">
      <article className="relative overflow-hidden rounded-lg">
        {hero.videoUrl ? (
          <video
            className="aspect-[21/9] w-full max-h-[28rem] object-cover"
            autoPlay
            muted
            loop
            playsInline
            poster={hero.posterUrl ?? hero.imageUrl ?? undefined}
          >
            <source src={hero.videoUrl} type="video/mp4" />
          </video>
        ) : hero.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hero.imageUrl}
            alt=""
            className="aspect-[21/9] w-full max-h-[28rem] object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0d14]/90 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
          <h2 className="font-serif text-2xl sm:text-3xl">{hero.title}</h2>
          {hero.subtitle ? (
            <p className="mt-2 text-white/70">{hero.subtitle}</p>
          ) : null}
          {hero.specs.length > 0 ? (
            <dl className="mt-6 flex flex-wrap gap-8">
              {hero.specs.map((s) => (
                <div key={s.label}>
                  <dt className="text-xs uppercase tracking-wider text-white/50">{s.label}</dt>
                  <dd className="mt-1 font-mono text-xl text-atlas-accent">{s.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </article>

      {rest.length > 0 ? (
        <ul className="flex flex-col gap-6 border-t border-white/10 pt-8">
          {rest.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-4 border-b border-white/10 pb-6 last:border-b-0 sm:flex-row sm:items-center"
            >
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt=""
                  className="h-24 w-40 shrink-0 rounded object-cover"
                />
              ) : null}
              <div>
                <h3 className="font-serif text-lg">{item.title}</h3>
                {item.subtitle ? (
                  <p className="mt-1 text-sm text-white/60">{item.subtitle}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function ServicesPillars({
  pillars,
}: {
  pillars: PortalContentData["servicesPillars"];
}) {
  return (
    <ul className="mt-12 space-y-0 divide-y divide-white/15 border-t border-white/15">
      {pillars.map((p) => (
        <li
          key={p.title}
          className="py-8 motion-safe:animate-[fadeUp_0.5s_ease-out] first:pt-10"
        >
          <h3 className="font-serif text-xl text-atlas-accent">{p.title}</h3>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-white/75">{p.description}</p>
        </li>
      ))}
    </ul>
  );
}
