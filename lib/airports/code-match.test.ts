import { describe, expect, it } from "vitest";
import { airportCodeKey, airportCodesMatch } from "@/lib/airports/code-match";

describe("airportCodesMatch", () => {
  it("matches KSDL and SDL", () => {
    expect(airportCodesMatch("KSDL", "SDL")).toBe(true);
    expect(airportCodeKey("KSDL")).toBe("SDL");
  });

  it("matches KAPA and APA", () => {
    expect(airportCodesMatch("KAPA", "APA")).toBe(true);
  });

  it("does not match unrelated codes", () => {
    expect(airportCodesMatch("KSDL", "OCF")).toBe(false);
  });
});
