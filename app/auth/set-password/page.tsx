"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";

function safeNextPath(next: string | null) {
  const path = next ?? ROUTES.home;
  return path.startsWith("/") && !path.startsWith("//") ? path : ROUTES.home;
}

function SetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const isRecovery = searchParams.get("flow") === "recovery";

  useEffect(() => {
    async function checkSession() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        router.replace("/login?error=missing_auth_code");
        return;
      }

      setEmail(user.email);
      setCheckingSession(false);
    }

    void checkSession();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      window.location.href = safeNextPath(searchParams.get("next"));
    } catch {
      setError("Could not save your password. Try again.");
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-atlas-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md border-atlas-border bg-atlas-surface">
        <CardHeader className="text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-atlas-accent">PrismJet</p>
          <CardTitle className="text-3xl">
            {isRecovery ? "Reset password" : "Create your password"}
          </CardTitle>
          <CardDescription>
            {isRecovery
              ? "Choose a new password for your Atlas account."
              : "Finish setting up your Atlas account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                readOnly
                className="border-atlas-border bg-atlas-bg/60 text-atlas-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                {isRecovery ? "New password" : "Password"}{" "}
                <span className="text-atlas-danger">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
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
            <div className="space-y-2">
              <Label htmlFor="confirm-password">
                Confirm password <span className="text-atlas-danger">*</span>
              </Label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                className="border-atlas-border focus-visible:ring-2 focus-visible:ring-atlas-accent/40"
              />
            </div>
            {error ? (
              <p className="rounded-md border border-atlas-danger/30 bg-atlas-danger/10 px-3 py-2 text-sm text-atlas-danger">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving…" : isRecovery ? "Update password" : "Create password & continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center px-4">
          <p className="text-sm text-atlas-muted">Loading…</p>
        </div>
      }
    >
      <SetPasswordContent />
    </Suspense>
  );
}
