"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ExperiencePageLink } from "@/lib/experience-content";

function resolveNavHref(url: string): { href: string; external: boolean } {
  if (url.startsWith("/") || url.startsWith("#")) return { href: url, external: false };
  if (/^https?:\/\//i.test(url)) return { href: url, external: true };
  if (/^mailto:|^tel:/i.test(url)) return { href: url, external: false };
  return { href: `https://${url}`, external: true };
}

export function PortalNavExtraLinks({
  links,
  className,
  buttonClassName,
}: {
  links: ExperiencePageLink[];
  className?: string;
  buttonClassName: string;
}) {
  if (links.length === 0) return null;

  return (
    <>
      {links.map((link, index) => {
        const { href, external } = resolveNavHref(link.url);
        const label = (
          <span className="max-w-[8rem] truncate sm:max-w-[11rem]">{link.label}</span>
        );

        if (external) {
          return (
            <a
              key={`${link.label}-${index}`}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonClassName, className)}
            >
              {label}
            </a>
          );
        }

        if (href.startsWith("/")) {
          return (
            <Link
              key={`${link.label}-${index}`}
              href={href}
              prefetch
              className={cn(buttonClassName, className)}
            >
              {label}
            </Link>
          );
        }

        return (
          <a key={`${link.label}-${index}`} href={href} className={cn(buttonClassName, className)}>
            {label}
          </a>
        );
      })}
    </>
  );
}
