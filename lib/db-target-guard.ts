/**
 * Refuse to run bulk-write/reset scripts against the production database by accident.
 *
 * Local scripts load `.env.local` (which usually points at production) and then prefer
 * DIRECT_URL over DATABASE_URL (see lib/load-env.ts). So overriding only one of the two
 * on the command line can silently leave the other one aimed at production.
 */

export const PRODUCTION_SUPABASE_REF = "hfasfrtyigtvvmwqaihb";
export const STAGING_SUPABASE_REF = "wkkgtnaokqhbikblapbp";

export type DatabaseTarget = {
  env: "production" | "staging" | "local" | "unknown";
  host: string;
  /** Supabase project ref when recognizable from the URL. */
  ref: string | null;
};

/** Classify a Postgres URL without ever returning its password. */
export function classifyDatabaseUrl(raw: string | undefined): DatabaseTarget | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") return null;

  const host = url.hostname;
  // Pooler URLs carry the ref in the username (postgres.<ref>); direct URLs in the host (db.<ref>.supabase.co).
  const haystack = `${decodeURIComponent(url.username)} ${host}`;
  const ref = haystack.match(/\b([a-z]{20})\b/)?.[1] ?? null;

  let env: DatabaseTarget["env"] = "unknown";
  if (haystack.includes(PRODUCTION_SUPABASE_REF)) env = "production";
  else if (haystack.includes(STAGING_SUPABASE_REF)) env = "staging";
  else if (/^(localhost|127\.0\.0\.1|::1)$/.test(host)) env = "local";

  return { env, host, ref };
}

/**
 * Call at the start of any script that bulk-writes, resets or deletes data.
 * Throws (so the script exits before touching the DB) when the effective target is
 * production, unless ALLOW_PRODUCTION_DB=yes is set for that run.
 */
export function guardAgainstProductionDb(scriptName: string): DatabaseTarget {
  const databaseUrl = process.env.DATABASE_URL;
  const directUrl = process.env.DIRECT_URL;
  const target = classifyDatabaseUrl(databaseUrl);

  if (!target) {
    throw new Error(
      `[${scriptName}] DATABASE_URL is missing or not a postgresql:// URL — refusing to run. ` +
        `(Did you paste a placeholder instead of the real connection string?)`
    );
  }

  const direct = classifyDatabaseUrl(directUrl);
  const hitsProduction = target.env === "production" || direct?.env === "production";

  console.log(
    `[${scriptName}] Target database: ${target.env}${target.ref ? ` (${target.ref})` : ""} @ ${target.host}`
  );

  if (hitsProduction && process.env.ALLOW_PRODUCTION_DB !== "yes") {
    throw new Error(
      `[${scriptName}] This would write to the PRODUCTION database (${PRODUCTION_SUPABASE_REF}). ` +
        `Refusing. Pass both DATABASE_URL and DIRECT_URL for the database you mean. ` +
        `If production really is intended, re-run with ALLOW_PRODUCTION_DB=yes.`
    );
  }

  return target;
}
