import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  CANONICAL_AIRCRAFT,
  SCENARIO_TEMPLATES,
  getRowValue,
  parseAircraftCsv,
  parseMoney,
  parseNumber,
} from "@/lib/csv-aircraft-import";

describe("csv-aircraft-import", () => {
  const csvPath = path.join(process.cwd(), "data", "seeds", "aircraft-master-proforma.csv");
  const content = readFileSync(csvPath, "utf-8");
  const parsed = parseAircraftCsv(content);

  it("parses aircraft column headers", () => {
    expect(parsed.headers).toContain("Challenger 300");
    expect(parsed.headers).toContain("Lear 45XR");
    expect(parsed.headers.length).toBeGreaterThan(30);
  });

  it("parses cost rows and hangar section", () => {
    expect(getRowValue(parsed.rows, "PIC Salary")).toBeDefined();
    expect(getRowValue(parsed.rows, "Square footage")?.["Challenger 300"]).toBe("4550");
    expect(parsed.hangarRows.length).toBeGreaterThan(5);
  });

  it("parses money and numbers", () => {
    expect(parseMoney("$240,000")).toBe(240000);
    expect(parseMoney("TBD")).toBeNull();
    expect(parseNumber("300")).toBe(300);
  });

  it("defines canonical aircraft without scenario-only columns", () => {
    const canonicalNames = CANONICAL_AIRCRAFT.map((a) => a.csvColumn);
    expect(canonicalNames).toContain("Challenger 300");
    expect(canonicalNames).not.toContain("Floating Challenger 300");
    expect(canonicalNames).not.toContain("VNY Challenger 300");
  });

  it("maps scenario templates to master columns", () => {
    const floating = SCENARIO_TEMPLATES.find((t) => t.name === "Floating Challenger 300");
    expect(floating?.masterColumn).toBe("Challenger 300");
    expect(floating?.assumptions.crew_model).toBe("floating");
  });

  it("has Challenger 300 PIC salary in CSV", () => {
    const pic = getRowValue(parsed.rows, "PIC Salary");
    expect(parseMoney(pic?.["Challenger 300"])).toBe(240000);
  });
});
