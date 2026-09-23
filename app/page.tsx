import { redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { getDefaultHomeRoute } from "@/lib/departments";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; token_hash?: string; type?: string }>;
}) {
  const params = await searchParams;

  if (params.code || params.token_hash) {
    const isInvite = params.type === "invite" || params.type === "signup";
    const callbackPath = isInvite ? "/auth/callback/invite" : "/auth/callback/recovery";
    const query = new URLSearchParams();
    if (params.token_hash) query.set("token_hash", params.token_hash);
    if (params.code) query.set("code", params.code);
    if (params.type) query.set("type", params.type);
    redirect(`${callbackPath}?${query.toString()}`);
  }

  const user = await getInternalUser();
  redirect(user ? getDefaultHomeRoute(user) : "/login");
}
