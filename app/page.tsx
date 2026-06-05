import { redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getInternalUser();
  redirect(user ? "/pipeline" : "/login");
}
