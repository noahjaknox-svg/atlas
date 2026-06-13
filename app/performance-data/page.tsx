import { redirect } from "next/navigation";

export default function PerformanceDataPage() {
  redirect("/data?tab=performance-data");
}
