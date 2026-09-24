import { chromium, type FullConfig } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync } from "node:fs";

const PRODUCTION_REF = "hfasfrtyigtvvmwqaihb";

/**
 * Signs the E2E user in through the app's real magic-link callback (the same
 * token_hash + verifyOtp path reset/invite emails use) and saves the session.
 * No email is sent and no password is stored.
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]!.use.baseURL!;
  const supabaseUrl = process.env.E2E_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.E2E_USER_EMAIL;
  if (!supabaseUrl || !serviceKey || !email) {
    throw new Error("Missing E2E_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / E2E_USER_EMAIL in .env.e2e.local (see e2e/README.md)");
  }
  if (supabaseUrl.includes(PRODUCTION_REF) || /www\.prismjet\.space/.test(baseURL)) {
    throw new Error("E2E tests must never run against production.");
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.hashed_token) throw new Error(`Could not create E2E sign-in link: ${error?.message}`);

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const qs = new URLSearchParams({
    token_hash: data.properties.hashed_token,
    type: "magiclink",
    next: "/data-warehouse/data",
  });
  await page.goto(`${baseURL}/auth/callback?${qs}`);
  await page.getByRole("button", { name: /continue/i }).click();
  await page.waitForURL(/\/data-warehouse\/data/, { timeout: 30_000 });
  mkdirSync("e2e/.auth", { recursive: true });
  await page.context().storageState({ path: "e2e/.auth/user.json" });
  await browser.close();
}
