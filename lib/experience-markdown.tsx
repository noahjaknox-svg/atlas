"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { cn } from "@/lib/utils";

const TEXT_ALIGN_STYLE = /^text-align\s*:\s*(left|center|right)\s*;?\s*$/i;

/** Allow only text-align on block tags for portal markdown HTML snippets. */
const portalMarkdownSanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    p: [...(defaultSchema.attributes?.p ?? []), ["style", TEXT_ALIGN_STYLE]],
    div: [...(defaultSchema.attributes?.div ?? []), ["style", TEXT_ALIGN_STYLE]],
    h1: [...(defaultSchema.attributes?.h1 ?? []), ["style", TEXT_ALIGN_STYLE]],
    h2: [...(defaultSchema.attributes?.h2 ?? []), ["style", TEXT_ALIGN_STYLE]],
    h3: [...(defaultSchema.attributes?.h3 ?? []), ["style", TEXT_ALIGN_STYLE]],
  },
};

export function ExperienceMarkdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div
      suppressHydrationWarning
      className={cn(
        "portal-markdown text-base leading-relaxed text-white/85 [&_a]:text-atlas-accent [&_a]:underline [&_h1]:mb-3 [&_h1]:font-serif [&_h1]:text-2xl [&_h1]:text-atlas-text sm:[&_h1]:text-3xl [&_h2]:mb-2 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:text-atlas-text sm:[&_h2]:text-2xl [&_h3]:mb-2 [&_h3]:font-serif [&_h3]:text-lg [&_h3]:text-atlas-text sm:[&_h3]:text-xl [&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p+p]:mt-3 [&_strong]:font-semibold [&_strong]:text-white [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, portalMarkdownSanitizeSchema]]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
