import { describe, expect, it } from "vitest";
import {
  airportCodeKey,
  airportCodesMatch,
  toIcaoDisplay,
  toIcaoRouteKey,
  toIcaoRouteLabel,
} from "@/lib/airports/code-match";

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

describe("toIcaoDisplay", () => {
  it("prefixes US FAA LIDs with K", () => {
    expect(toIcaoDisplay("SDL")).toBe("KSDL");
    expect(toIcaoDisplay("coe")).toBe("KCOE");
  });

  it("leaves ICAO codes unchanged", () => {
    expect(toIcaoDisplay("KSDL")).toBe("KSDL");
    expect(toIcaoDisplay("CYYZ")).toBe("CYYZ");
  });
});

describe("toIcaoRouteKey", () => {
  it("formats FAA routes as ICAO", () => {
    expect(toIcaoRouteKey("SDL", "COE")).toBe("KSDL-KCOE");
    expect(toIcaoRouteLabel("SDL", "COE")).toBe("KSDL → KCOE");
  });
});
