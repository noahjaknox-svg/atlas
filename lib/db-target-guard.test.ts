import { afterEach, describe, expect, it, vi } from "vitest";
import {
  classifyDatabaseUrl,
  guardAgainstProductionDb,
  PRODUCTION_SUPABASE_REF,
  STAGING_SUPABASE_REF,
} from "@/lib/db-target-guard";

const prodPooler = `postgresql://postgres.${PRODUCTION_SUPABASE_REF}:pw@aws-1-us-east-2.pooler.supabase.com:6543/postgres`;
const prodDirect = `postgresql://postgres:pw@db.${PRODUCTION_SUPABASE_REF}.supabase.co:5432/postgres`;
const stagingPooler = `postgresql://postgres.${STAGING_SUPABASE_REF}:pw@aws-1-us-east-2.pooler.supabase.com:5432/postgres`;

describe("classifyDatabaseUrl", () => {
  it("recognizes production and staging from pooler usernames and direct hosts", () => {
    expect(classifyDatabaseUrl(prodPooler)).toMatchObject({ env: "production", ref: PRODUCTION_SUPABASE_REF });
    expect(classifyDatabaseUrl(prodDirect)).toMatchObject({ env: "production", ref: PRODUCTION_SUPABASE_REF });
    expect(classifyDatabaseUrl(stagingPooler)).toMatchObject({ env: "staging", ref: STAGING_SUPABASE_REF });
    expect(classifyDatabaseUrl("postgresql://u:p@localhost:5432/atlas")).toMatchObject({ env: "local" });
  });

  it("rejects placeholders and non-postgres URLs", () => {
    expect(classifyDatabaseUrl("<staging direct url>")).toBeNull();
    expect(classifyDatabaseUrl("https://example.com")).toBeNull();
    expect(classifyDatabaseUrl(undefined)).toBeNull();
  });

  it("never exposes the password", () => {
    expect(JSON.stringify(classifyDatabaseUrl(prodPooler))).not.toContain("pw");
  });
});

describe("guardAgainstProductionDb", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("allows staging", () => {
    vi.stubEnv("DATABASE_URL", stagingPooler);
    vi.stubEnv("DIRECT_URL", stagingPooler);
    vi.spyOn(console, "log").mockImplementation(() => {});
    expect(guardAgainstProductionDb("test").env).toBe("staging");
  });

  it("refuses production, including when only DIRECT_URL points there", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.stubEnv("DATABASE_URL", prodPooler);
    vi.stubEnv("DIRECT_URL", prodDirect);
    expect(() => guardAgainstProductionDb("test")).toThrow(/PRODUCTION/);

    vi.stubEnv("DATABASE_URL", stagingPooler);
    vi.stubEnv("DIRECT_URL", prodDirect);
    expect(() => guardAgainstProductionDb("test")).toThrow(/PRODUCTION/);
  });

  it("allows production only with the explicit override", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.stubEnv("DATABASE_URL", prodPooler);
    vi.stubEnv("ALLOW_PRODUCTION_DB", "yes");
    expect(guardAgainstProductionDb("test").env).toBe("production");
  });

  it("refuses a placeholder or missing URL", () => {
    vi.stubEnv("DATABASE_URL", "<staging direct url>");
    expect(() => guardAgainstProductionDb("test")).toThrow(/placeholder/);
  });
});
