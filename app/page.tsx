import { redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { getDefaultHomeRoute } from "@/lib/departments";

export default async function HomePage() {
  const user = await getInternalUser();
  redirect(user ? getDefaultHomeRoute(user) : "/login");
}
