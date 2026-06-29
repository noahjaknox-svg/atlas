import type { FleetShowcaseItem } from "@/lib/portal-content";

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
            <p className="mt-2 text-sm text-white/70 sm:text-base">{hero.subtitle}</p>
          ) : null}
        </div>
      </article>

      {rest.length > 0 ? (
        <ul className="space-y-6">
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
