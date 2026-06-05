import { CloudBackground } from "@/components/client/cloud-background";
import { cn } from "@/lib/utils";

export function SectionNumber({ n }: { n: string }) {
  return (
    <span className="font-mono text-xs uppercase tracking-[0.35em] text-atlas-accent">{n}</span>
  );
}

export function ExperienceHero({
  imageUrl,
  videoUrl,
  posterUrl,
  children,
  className,
  kenBurns,
}: {
  imageUrl: string;
  videoUrl?: string | null;
  posterUrl?: string | null;
  children: React.ReactNode;
  className?: string;
  kenBurns?: boolean;
}) {
  return (
    <div className={cn("relative min-h-[42vh] lg:min-h-[52vh]", className)}>
      <CloudBackground
        imageUrl={imageUrl}
        videoUrl={videoUrl}
        posterUrl={posterUrl ?? imageUrl}
        overlay="dark"
        className={cn("absolute inset-0 h-full", kenBurns && "experience-hero-kenburns")}
      />
      <div className="relative z-10 flex min-h-[inherit] flex-col justify-end px-6 pb-10 pt-24 sm:px-12 lg:px-20">
        {children}
      </div>
    </div>
  );
}

export function ExperienceBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-[#0a0d14] px-6 py-12 sm:px-12 lg:px-20", className)}>{children}</div>
  );
}

export function ExperienceDisclaimer({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <footer className="border-t border-white/10 bg-[#07090f] px-6 py-6 text-center text-xs leading-relaxed text-white/40 sm:px-12">
      {text}
    </footer>
  );
}
