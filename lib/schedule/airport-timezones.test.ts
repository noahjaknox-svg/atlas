import { describe, expect, it } from "vitest";
import { lookupFallbackTimezone } from "@/lib/schedule/airport-timezone-format";

describe("airport timezone fallbacks", () => {
  it("maps TWF to America/Boise in the fallback table", () => {
    expect(lookupFallbackTimezone("TWF")).toBe("America/Boise");
    expect(lookupFallbackTimezone("KTWF")).toBe("America/Boise");
  });
});
