"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ThemeLogo } from "@/components/theme/theme-logo";
import { ROUTES } from "@/lib/routes";

const AUTH_CALLBACK_ERRORS: Record<string, string> = {
  auth_callback_failed:
    "That link expired or was already used. Request a new password reset or invite.",
  missing_auth_code: "Invalid sign-in link. Request a new invite from your admin.",
  auth_not_configured: "Authentication is not configured on the server.",
  not_provisioned:
    "Your account is not provisioned in Atlas yet. Ask an admin to send an invite.",
};

function callbackPathForType(type: string | null) {
  if (type === "invite") return "/auth/callback/invite";
  if (type === "recovery") return "/auth/callback/recovery";
  return "/auth/callback";
}

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  function openForgotPassword() {
    setError("");
    setInfo("");
    setForgotEmail(email);
    setMode("forgot");
  }

  function backToSignIn() {
    setError("");
    setInfo("");
    setMode("login");
  }

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);

    if (params.get("code")) {
      const callbackPath = callbackPathForType(params.get("type"));
      window.location.replace(`${callbackPath}${window.location.search}${hash}`);
      return;
    }

    if (hash.includes("access_token")) {
      const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
      const next = params.get("next") ?? ROUTES.home;
      const callbackPath = callbackPathForType(hashParams.get("type"));
      window.location.replace(
        `${callbackPath}?next=${encodeURIComponent(next)}${hash}`
      );
      return;
    }

    const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
    if (hashParams.get("error") || hashParams.get("error_code")) {
      const errorCode = hashParams.get("error_code");
      const loginError =
        errorCode === "otp_expired" ? "auth_callback_failed" : "missing_auth_code";
      window.location.replace(`/login?error=${loginError}`);
      return;
    }

    const authError = params.get("error");
    if (authError) {
      setError(
        AUTH_CALLBACK_ERRORS[authError] ??
          "Sign-in link failed. Try again or contact an admin."
      );
    }
  }, []);

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

      window.location.href = ROUTES.home;
    } catch {
      setError("Could not reach the server. Is npm run dev running?");
      setLoading(false);
    }
  }

  async function forgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setResetting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not send reset email.");
        return;
      }
      setInfo(
        data.message ??
          `Check ${forgotEmail.trim()} for a password reset link. It can take a minute to arrive — check spam too. The link expires after 1 hour.`
      );
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md border-atlas-border bg-atlas-surface">
        <CardHeader className="text-center">
          <ThemeLogo className="mx-auto h-16 w-auto" priority />
        </CardHeader>
        <CardContent>
          {mode === "login" ? (
            <>
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
                      onClick={openForgotPassword}
                    >
                      Forgot password?
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
            </>
          ) : (
            <form onSubmit={forgotPassword} className="space-y-4">
              <div>
                <p className="text-sm text-atlas-text">Reset your password</p>
                <p className="mt-1 text-xs text-atlas-muted">
                  Enter your email and we&apos;ll send you a reset link.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="forgot-email">
                  Email <span className="text-atlas-danger">*</span>
                </Label>
                <Input
                  id="forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@prismjet.com"
                  className="border-atlas-border focus-visible:ring-2 focus-visible:ring-atlas-accent/40"
                />
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
              <Button type="submit" className="w-full" disabled={resetting}>
                {resetting ? "Sending…" : "Send reset link"}
              </Button>
              <button
                type="button"
                className="w-full text-center text-xs text-atlas-accent hover:underline"
                onClick={backToSignIn}
              >
                Back to sign in
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
