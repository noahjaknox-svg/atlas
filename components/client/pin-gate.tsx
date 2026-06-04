"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PinGate({ slug, title }: { slug: string; title: string }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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

    router.push(data.redirect ?? `/${slug}/home`);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md border-atlas-border/60 bg-atlas-surface/90">
        <CardHeader className="text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-atlas-accent">Atlas by PrismJet</p>
          <CardTitle className="font-serif text-2xl">{title}</CardTitle>
          <CardDescription>
            Enter your proposal PIN to view your personalized aircraft management outlook.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              inputMode="numeric"
              placeholder="PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="text-center text-lg tracking-widest"
              maxLength={8}
              required
            />
            {error && <p className="text-center text-sm text-atlas-danger">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Verifying…" : "View Your Atlas Proposal"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
