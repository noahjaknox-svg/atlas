import { requireAdmin } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { execSync } from "child_process";
import path from "path";

export async function POST() {
  try {
    await requireAdmin();
    const script = path.join(process.cwd(), "scripts", "import-aircraft-csv.ts");
    const output = execSync(`npx tsx "${script}"`, {
      encoding: "utf-8",
      cwd: process.cwd(),
      env: process.env,
    });
    return jsonOk({ message: "Import complete", output: output.trim() });
  } catch (e) {
    return handleApiError(e);
  }
}
