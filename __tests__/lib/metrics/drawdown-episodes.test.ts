import { describe, it, expect } from "vitest";
import { drawdownEpisodes } from "@/lib/metrics/risk";
import type { TimeSeries } from "@/lib/metrics/returns";

const MS_PER_DAY = 86_400_000;

function ts(day: number): number {
  return day * MS_PER_DAY;
}

describe("drawdownEpisodes", () => {
  /** @req PC-15 */
  it("returns empty for insufficient data", () => {
    expect(drawdownEpisodes([])).toEqual([]);
    expect(drawdownEpisodes([[ts(0), 100]])).toEqual([]);
  });

  /** @req PC-15 */
  it("identifies a single recovered drawdown episode", () => {
    const history: TimeSeries = [
      [ts(0), 100],
      [ts(1), 95],
      [ts(2), 90], // trough: -10%
      [ts(3), 95],
      [ts(4), 100], // recovered
    ];

    const episodes = drawdownEpisodes(history);
    expect(episodes).toHaveLength(1);
    expect(episodes[0].depth).toBeCloseTo(-0.10, 2);
    expect(episodes[0].startTs).toBe(ts(0));
    expect(episodes[0].troughTs).toBe(ts(2));
    expect(episodes[0].recoveryTs).toBe(ts(4));
    expect(episodes[0].durationDays).toBeCloseTo(4, 1);
    expect(episodes[0].recoveryDays).toBeCloseTo(2, 1);
  });

  /** @req PC-15 */
  it("identifies an ongoing (unrecovered) drawdown", () => {
    const history: TimeSeries = [
      [ts(0), 100],
      [ts(1), 95],
      [ts(2), 85], // trough: -15%
      [ts(3), 88],
    ];

    const episodes = drawdownEpisodes(history);
    expect(episodes).toHaveLength(1);
    expect(episodes[0].depth).toBeCloseTo(-0.15, 2);
    expect(episodes[0].recoveryTs).toBeNull();
    expect(episodes[0].recoveryDays).toBeNull();
  });

  /** @req PC-15 */
  it("identifies multiple episodes", () => {
    const history: TimeSeries = [
      [ts(0), 100],
      [ts(1), 90],   // -10%
      [ts(2), 100],  // recovered
      [ts(3), 110],  // new peak
      [ts(4), 95],   // -13.6%
      [ts(5), 110],  // recovered
    ];

    const episodes = drawdownEpisodes(history);
    expect(episodes).toHaveLength(2);
    expect(episodes[0].depth).toBeCloseTo(-0.10, 2);
    expect(episodes[1].depth).toBeCloseTo(-0.1364, 2);
  });

  /** @req PC-15 */
  it("filters out noise (drawdowns < 1%)", () => {
    const history: TimeSeries = [
      [ts(0), 100],
      [ts(1), 99.5], // -0.5%, too small
      [ts(2), 100],
    ];

    const episodes = drawdownEpisodes(history);
    expect(episodes).toHaveLength(0);
  });

  /** @req PC-15 */
  it("returns empty for monotonically increasing series", () => {
    const history: TimeSeries = [
      [ts(0), 100],
      [ts(1), 110],
      [ts(2), 120],
    ];
    expect(drawdownEpisodes(history)).toHaveLength(0);
  });
});
