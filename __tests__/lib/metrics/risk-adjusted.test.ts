import { describe, it, expect } from "vitest";
import { sharpeRatio, romad } from "@/lib/metrics/risk-adjusted";

describe("sharpeRatio", () => {
  it("returns 0 when volatility is 0", () => {
    expect(sharpeRatio(0.5, 0)).toBe(0);
  });

  it("computes return / vol: 0.20 / 0.10 = 2.0", () => {
    expect(sharpeRatio(0.20, 0.10)).toBeCloseTo(2.0);
  });

  it("handles negative return", () => {
    expect(sharpeRatio(-0.10, 0.20)).toBeCloseTo(-0.5);
  });
});

describe("romad", () => {
  it("returns 0 when max drawdown is 0", () => {
    expect(romad(0.5, 0)).toBe(0);
  });

  it("computes return / abs(maxDD): 0.20 / 0.25 = 0.80", () => {
    expect(romad(0.20, -0.25)).toBeCloseTo(0.80);
  });

  it("handles negative return", () => {
    expect(romad(-0.10, -0.25)).toBeCloseTo(-0.40);
  });
});
