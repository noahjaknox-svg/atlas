"use client";

import { Suspense } from "react";
import { AuthCallbackContent, AuthCallbackFallback } from "@/components/auth-callback-content";

export default function AuthInviteCallbackPage() {
  return (
    <Suspense fallback={<AuthCallbackFallback />}>
      <AuthCallbackContent forcedFlow="invite" />
    </Suspense>
  );
}
