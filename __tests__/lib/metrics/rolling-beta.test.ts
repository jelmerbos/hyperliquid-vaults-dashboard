import { describe, it, expect } from "vitest";
import { rollingBeta } from "@/lib/metrics/benchmark";

describe("rollingBeta", () => {
  /** @req PC-16 */
  it("returns correct length for valid inputs", () => {
    const vault = [0.01, 0.02, -0.01, 0.03, 0.01, -0.02, 0.01, 0.02, -0.01, 0.01];
    const bench = [0.005, 0.01, -0.005, 0.015, 0.005, -0.01, 0.005, 0.01, -0.005, 0.005];
    const result = rollingBeta(vault, bench, 5);
    expect(result).toHaveLength(6); // 10 - 5 + 1
  });

  /** @req PC-16 */
  it("returns 2.0 beta for 2x leveraged returns", () => {
    const bench = [0.01, -0.02, 0.015, -0.005, 0.01];
    const vault = bench.map((r) => r * 2);
    const result = rollingBeta(vault, bench, 5);
    expect(result).toHaveLength(1);
    expect(result[0]).toBeCloseTo(2.0, 4);
  });

  /** @req PC-16 */
  it("returns empty for insufficient data", () => {
    expect(rollingBeta([0.01], [0.01], 5)).toEqual([]);
    expect(rollingBeta([], [], 5)).toEqual([]);
  });

  /** @req PC-16 */
  it("returns empty for window < 2", () => {
    expect(rollingBeta([0.01, 0.02], [0.01, 0.02], 1)).toEqual([]);
  });

  /** @req PC-16 */
  it("beta ~1 for identical series", () => {
    const series = [0.01, -0.02, 0.015, -0.005, 0.01, 0.008, -0.012];
    const result = rollingBeta(series, series, 5);
    for (const b of result) {
      expect(b).toBeCloseTo(1.0, 4);
    }
  });
});
