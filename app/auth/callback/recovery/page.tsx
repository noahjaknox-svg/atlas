"use client";

import { Suspense } from "react";
import { AuthCallbackContent, AuthCallbackFallback } from "@/components/auth-callback-content";

export default function AuthRecoveryCallbackPage() {
  return (
    <Suspense fallback={<AuthCallbackFallback />}>
      <AuthCallbackContent forcedFlow="recovery" />
    </Suspense>
  );
}
