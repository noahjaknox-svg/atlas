import { redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { getDefaultHomeRoute } from "@/lib/departments";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; type?: string }>;
}) {
  const params = await searchParams;

  if (params.code) {
    const callbackPath =
      params.type === "invite" ? "/auth/callback/invite" : "/auth/callback/recovery";
    const query = new URLSearchParams({ code: params.code });
    if (params.type) query.set("type", params.type);
    redirect(`${callbackPath}?${query.toString()}`);
  }

  const user = await getInternalUser();
  redirect(user ? getDefaultHomeRoute(user) : "/login");
}
