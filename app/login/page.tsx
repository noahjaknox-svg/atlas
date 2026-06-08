"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Email or password is incorrect.");
        setLoading(false);
        return;
      }

      window.location.href = "/pipeline";
    } catch {
      setError("Could not reach the server. Is npm run dev running?");
      setLoading(false);
    }
  }

  async function forgotPassword() {
    setError("");
    setInfo("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter your email above, then click Forgot password.");
      return;
    }
    setResetting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not send reset email.");
        return;
      }
      setInfo(data.message ?? "If an account exists, a reset link has been sent.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md border-atlas-border bg-atlas-surface">
        <CardHeader className="text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-atlas-accent">PrismJet</p>
          <CardTitle className="text-3xl">Atlas</CardTitle>
          <CardDescription>Internal proposal builder</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-atlas-danger">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@prismjet.com"
                className="border-atlas-border focus-visible:ring-2 focus-visible:ring-atlas-accent/40"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">
                  Password <span className="text-atlas-danger">*</span>
                </Label>
                <button
                  type="button"
                  className="text-xs text-atlas-accent hover:underline"
                  onClick={() => void forgotPassword()}
                  disabled={resetting}
                >
                  {resetting ? "Sending…" : "Forgot password?"}
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="border-atlas-border pr-16 focus-visible:ring-2 focus-visible:ring-atlas-accent/40"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-atlas-muted hover:text-atlas-text"
                  onClick={() => setShowPassword((s) => !s)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            {error ? (
              <p className="rounded-md border border-atlas-danger/30 bg-atlas-danger/10 px-3 py-2 text-sm text-atlas-danger">
                {error}
              </p>
            ) : null}
            {info ? (
              <p className="rounded-md border border-atlas-accent/30 bg-atlas-accent/10 px-3 py-2 text-sm text-atlas-text">
                {info}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-atlas-muted">
            Need access?{" "}
            <Link href="/settings/users" className="text-atlas-accent hover:underline">
              Ask an admin for an invite
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
