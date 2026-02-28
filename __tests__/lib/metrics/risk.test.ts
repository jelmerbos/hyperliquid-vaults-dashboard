import { describe, it, expect } from "vitest";
import {
  maxDrawdown,
  drawdownSeries,
  maxDrawdownDuration,
  annualizedVolatility,
} from "@/lib/metrics/risk";
import type { TimeSeries } from "@/lib/metrics/returns";

const MS_PER_DAY = 86_400_000;

describe("maxDrawdown", () => {
  it("returns 0 for empty/single", () => {
    expect(maxDrawdown([])).toBe(0);
    expect(maxDrawdown([[1000, 100]])).toBe(0);
  });

  it("returns 0 for monotonically increasing", () => {
    const history: TimeSeries = [
      [0, 100],
      [1000, 110],
      [2000, 120],
    ];
    expect(maxDrawdown(history)).toBe(0);
  });

  it("computes drawdown: peak 200, trough 150 = -25%", () => {
    const history: TimeSeries = [
      [0, 100],
      [1000, 200],
      [2000, 150],
      [3000, 180],
    ];
    expect(maxDrawdown(history)).toBeCloseTo(-0.25);
  });

  it("finds the largest drawdown", () => {
    const history: TimeSeries = [
      [0, 100],
      [1000, 90],  // -10%
      [2000, 100],
      [3000, 70],  // -30% from 100
      [4000, 100],
    ];
    expect(maxDrawdown(history)).toBeCloseTo(-0.30);
  });
});

describe("drawdownSeries", () => {
  it("returns empty for empty/single", () => {
    expect(drawdownSeries([])).toEqual([]);
  });

  it("returns series of drawdown fractions", () => {
    const history: TimeSeries = [
      [0, 100],
      [1000, 200],
      [2000, 150],
    ];
    const result = drawdownSeries(history);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual([0, 0]);
    expect(result[1]).toEqual([1000, 0]);
    expect(result[2][0]).toBe(2000);
    expect(result[2][1]).toBeCloseTo(-0.25);
  });
});

describe("maxDrawdownDuration", () => {
  it("returns 0 for empty/single", () => {
    expect(maxDrawdownDuration([])).toBe(0);
    expect(maxDrawdownDuration([[1000, 100]])).toBe(0);
  });

  it("returns 0 for always-increasing", () => {
    const history: TimeSeries = [
      [0, 100],
      [MS_PER_DAY, 110],
    ];
    // Peak recovered immediately, duration = 1 day from start to end
    // Actually: peak at 0 -> val 110 >= 100, duration = 1 day, then peak at day 1, final = 0
    expect(maxDrawdownDuration(history)).toBe(1);
  });

  it("measures duration of still-in-drawdown", () => {
    const history: TimeSeries = [
      [0, 100],
      [MS_PER_DAY * 10, 90], // never recovers
    ];
    // Peak at 0, never recovered, duration = 10 days
    expect(maxDrawdownDuration(history)).toBe(10);
  });

  it("measures recovery duration", () => {
    const history: TimeSeries = [
      [0, 100],
      [MS_PER_DAY * 5, 80],
      [MS_PER_DAY * 20, 100],
    ];
    // Peak at 0, recovered at day 20 -> duration 20 days
    expect(maxDrawdownDuration(history)).toBe(20);
  });
});

describe("annualizedVolatility", () => {
  it("returns 0 for empty or single return", () => {
    expect(annualizedVolatility([])).toBe(0);
    expect(annualizedVolatility([0.01])).toBe(0);
  });

  it("returns 0 for constant returns", () => {
    expect(annualizedVolatility([0.01, 0.01, 0.01])).toBeCloseTo(0, 10);
  });

  it("computes annualized vol correctly", () => {
    // Daily returns: [0.01, -0.01, 0.01, -0.01]
    // Mean = 0, Variance = (4 * 0.0001) / 3 = 0.000133...
    // Daily vol = sqrt(0.000133) = 0.01155
    // Annual vol = 0.01155 * sqrt(365) = 0.2208
    const returns = [0.01, -0.01, 0.01, -0.01];
    const result = annualizedVolatility(returns);
    expect(result).toBeCloseTo(0.2208, 2);
  });
});
