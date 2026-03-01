import { describe, it, expect } from "vitest";
import {
  positionConcentration,
  totalLeverage,
  perpVsSpotSplit,
} from "@/lib/metrics/positions";
import type {
  ClearinghouseState,
  PortfolioSnapshot,
} from "@/lib/api/types";

function makeClearinghouseState(
  positions: { positionValue: string; coin: string }[],
  accountValue: string,
  totalNtlPos: string,
): ClearinghouseState {
  return {
    assetPositions: positions.map((p) => ({
      position: {
        coin: p.coin,
        szi: "1.0",
        entryPx: "100.0",
        leverage: { type: "cross", value: 1, rawUsd: "0" },
        liquidationPx: "0",
        marginUsed: "0",
        positionValue: p.positionValue,
        unrealizedPnl: "0",
        returnOnEquity: "0",
        maxLeverage: 50,
        cumFunding: { allTime: "0", sinceChange: "0", sinceOpen: "0" },
      },
      type: "oneWay",
    })),
    marginSummary: {
      accountValue,
      totalMarginUsed: "0",
      totalNtlPos,
      totalRawUsd: "0",
    },
    withdrawable: "0",
    time: 1700000000000,
  };
}

function makeSnapshot(pnlValues: [number, string][]): PortfolioSnapshot {
  return {
    accountValueHistory: [],
    pnlHistory: pnlValues,
    vlm: "0",
  };
}

describe("positionConcentration", () => {
  /** @req INST-12 */
  it("returns 0 for no positions", () => {
    const state = makeClearinghouseState([], "10000", "0");
    expect(positionConcentration(state)).toBe(0);
  });

  /** @req INST-12 */
  it("returns 1 when single position equals total notional", () => {
    const state = makeClearinghouseState(
      [{ positionValue: "5000", coin: "ETH" }],
      "10000",
      "5000",
    );
    expect(positionConcentration(state, 1)).toBeCloseTo(1.0);
  });

  /** @req INST-12 */
  it("computes top 3 concentration correctly", () => {
    // Positions: 4000, 3000, 2000, 1000 = total 10000
    // Top 3: 4000 + 3000 + 2000 = 9000 / 10000 = 0.9
    const state = makeClearinghouseState(
      [
        { positionValue: "2000", coin: "BTC" },
        { positionValue: "4000", coin: "ETH" },
        { positionValue: "1000", coin: "SOL" },
        { positionValue: "3000", coin: "DOGE" },
      ],
      "20000",
      "10000",
    );
    expect(positionConcentration(state, 3)).toBeCloseTo(0.9);
  });

  /** @req INST-12 */
  it("handles topN greater than position count", () => {
    const state = makeClearinghouseState(
      [
        { positionValue: "5000", coin: "ETH" },
        { positionValue: "5000", coin: "BTC" },
      ],
      "20000",
      "10000",
    );
    // top 3, but only 2 positions -> all positions = 100%
    expect(positionConcentration(state, 3)).toBeCloseTo(1.0);
  });
});

describe("totalLeverage", () => {
  /** @req INST-13 */
  it("returns 0 when account value is 0", () => {
    const state = makeClearinghouseState([], "0", "0");
    expect(totalLeverage(state)).toBe(0);
  });

  /** @req INST-13 */
  it("computes notional / accountValue", () => {
    // 10000 notional / 5000 account value = 2x leverage
    const state = makeClearinghouseState(
      [{ positionValue: "10000", coin: "ETH" }],
      "5000",
      "10000",
    );
    expect(totalLeverage(state)).toBeCloseTo(2.0);
  });

  /** @req INST-13 */
  it("handles negative notional (short positions)", () => {
    const state = makeClearinghouseState(
      [{ positionValue: "-8000", coin: "ETH" }],
      "10000",
      "-8000",
    );
    expect(totalLeverage(state)).toBeCloseTo(0.8);
  });
});

describe("perpVsSpotSplit", () => {
  /** @req INST-15 */
  it("returns all-perp when no perpAllTime snapshot", () => {
    const allTime = makeSnapshot([
      [1000, "0"],
      [2000, "500"],
    ]);
    const result = perpVsSpotSplit(allTime, undefined);
    expect(result.perpPnl).toBeCloseTo(500);
    expect(result.spotPnl).toBeCloseTo(0);
    expect(result.perpFraction).toBeCloseTo(1.0);
  });

  /** @req INST-15 */
  it("splits PnL correctly between perp and spot", () => {
    // Total PnL: 1000, Perp PnL: 700, Spot PnL: 300
    const allTime = makeSnapshot([
      [1000, "0"],
      [2000, "1000"],
    ]);
    const perpAllTime = makeSnapshot([
      [1000, "0"],
      [2000, "700"],
    ]);
    const result = perpVsSpotSplit(allTime, perpAllTime);
    expect(result.perpPnl).toBeCloseTo(700);
    expect(result.spotPnl).toBeCloseTo(300);
    expect(result.perpFraction).toBeCloseTo(0.7);
  });

  /** @req INST-15 */
  it("handles zero total PnL", () => {
    const allTime = makeSnapshot([
      [1000, "100"],
      [2000, "100"],
    ]);
    const perpAllTime = makeSnapshot([
      [1000, "50"],
      [2000, "50"],
    ]);
    const result = perpVsSpotSplit(allTime, perpAllTime);
    expect(result.perpPnl).toBe(0);
    expect(result.spotPnl).toBe(0);
    expect(result.perpFraction).toBe(0);
  });

  /** @req INST-15 */
  it("handles negative PnL", () => {
    // Total loss: -500, Perp loss: -300, Spot loss: -200
    const allTime = makeSnapshot([
      [1000, "0"],
      [2000, "-500"],
    ]);
    const perpAllTime = makeSnapshot([
      [1000, "0"],
      [2000, "-300"],
    ]);
    const result = perpVsSpotSplit(allTime, perpAllTime);
    expect(result.perpPnl).toBeCloseTo(-300);
    expect(result.spotPnl).toBeCloseTo(-200);
    // perpFraction uses absolute values: 300 / (300 + 200) = 0.6
    expect(result.perpFraction).toBeCloseTo(0.6);
  });
});
