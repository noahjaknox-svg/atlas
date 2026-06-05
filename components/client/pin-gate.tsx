"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CloudBackground } from "@/components/client/cloud-background";
import { cn } from "@/lib/utils";

export function PinGate({
  slug,
  title,
  heroCloudImageUrl,
  heroCloudVideoUrl,
  logoUrl,
}: {
  slug: string;
  title: string;
  heroCloudImageUrl?: string;
  heroCloudVideoUrl?: string | null;
  logoUrl?: string;
}) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [entered, setEntered] = useState(false);

  async function verifyAndEnter() {
    if (pin.length < 4) {
      setError("Enter your 4-digit PIN");
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch(`/api/portal/${slug}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Invalid PIN");
      setLoading(false);
      return;
    }

    setEntered(true);
    setTimeout(() => {
      router.push(data.redirect ?? `/${slug}/experience/welcome`);
      router.refresh();
    }, 700);
  }

  return (
    <CloudBackground
      imageUrl={heroCloudImageUrl}
      videoUrl={heroCloudVideoUrl}
      className={cn(
        "flex min-h-screen flex-col items-center justify-center transition-opacity duration-700",
        entered && "opacity-0"
      )}
    >
      <div className="flex w-full max-w-lg flex-col items-center px-6 text-center text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl ?? "/images/prismjet-logo.svg"}
          alt="PrismJet"
          className="mb-10 h-12 w-auto motion-safe:animate-[fadeUp_0.8s_ease-out]"
        />

        <p className="text-xs uppercase tracking-[0.35em] text-atlas-accent motion-safe:animate-[fadeUp_0.9s_ease-out]">
          Private access
        </p>
        <h1 className="mt-4 font-serif text-3xl leading-tight motion-safe:animate-[fadeUp_1s_ease-out] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-md text-sm text-white/70 motion-safe:animate-[fadeUp_1.1s_ease-out]">
          Enter your proposal PIN to view your personalized aircraft management outlook.
        </p>

        <div className="mt-10 w-full max-w-xs space-y-4 motion-safe:animate-[fadeUp_1.2s_ease-out]">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="• • • •"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            onKeyDown={(e) => e.key === "Enter" && void verifyAndEnter()}
            className="w-full rounded-lg border border-white/25 bg-white/10 px-4 py-4 text-center font-mono text-2xl tracking-[0.4em] text-white backdrop-blur placeholder:text-white/30 focus:border-atlas-accent focus:outline-none focus:ring-1 focus:ring-atlas-accent/40"
            maxLength={4}
            aria-label="4-digit PIN"
          />
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <button
            type="button"
            disabled={loading || entered}
            onClick={() => void verifyAndEnter()}
            className="w-full rounded-lg bg-atlas-accent px-6 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-[#0a0d14] transition hover:bg-atlas-accent-hover disabled:opacity-60"
          >
            {loading ? "Verifying…" : entered ? "Entering…" : "Enter"}
          </button>
        </div>
      </div>
    </CloudBackground>
  );
}
