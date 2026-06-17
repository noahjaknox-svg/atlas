import { redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { ROUTES } from "@/lib/routes";

export default async function HomePage() {
  const user = await getInternalUser();
  redirect(user ? ROUTES.home : "/login");
}
