import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

export default function PerformanceDataPage() {
  redirect(ROUTES.dataWarehouse.performanceData);
}
