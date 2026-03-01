import type {
  ClearinghouseState,
  PortfolioSnapshot,
} from "@/lib/api/types";

/**
 * Position concentration: fraction of total notional held by the top N positions.
 * Returns a value between 0 and 1.
 */
export function positionConcentration(
  state: ClearinghouseState,
  topN: number = 3,
): number {
  const positions = state.assetPositions;
  if (positions.length === 0) return 0;

  const totalNtl = Math.abs(parseFloat(state.marginSummary.totalNtlPos));
  if (totalNtl === 0) return 0;

  const positionValues = positions
    .map((p) => Math.abs(parseFloat(p.position.positionValue)))
    .sort((a, b) => b - a);

  const topSum = positionValues.slice(0, topN).reduce((a, b) => a + b, 0);
  return topSum / totalNtl;
}

/**
 * Total leverage: total notional position value / account value.
 * A leverage of 2.0 means the vault controls 2x its equity in positions.
 */
export function totalLeverage(state: ClearinghouseState): number {
  const accountValue = parseFloat(state.marginSummary.accountValue);
  if (accountValue === 0) return 0;

  const totalNtl = Math.abs(parseFloat(state.marginSummary.totalNtlPos));
  return totalNtl / accountValue;
}

/**
 * Perp vs spot PnL split.
 * Compares allTime PnL with perpAllTime PnL to determine how much
 * of total PnL comes from perpetual positions.
 * Returns { perpPnl, spotPnl, perpFraction }.
 */
export interface PnlSplit {
  perpPnl: number;
  spotPnl: number;
  perpFraction: number;
}

export function perpVsSpotSplit(
  allTimeSnapshot: PortfolioSnapshot,
  perpAllTimeSnapshot: PortfolioSnapshot | undefined,
): PnlSplit {
  const allTimePnl = snapshotCumulativePnl(allTimeSnapshot);
  const perpPnl = perpAllTimeSnapshot
    ? snapshotCumulativePnl(perpAllTimeSnapshot)
    : allTimePnl;
  const spotPnl = allTimePnl - perpPnl;

  const totalAbsPnl = Math.abs(perpPnl) + Math.abs(spotPnl);
  const perpFraction = totalAbsPnl === 0 ? 0 : Math.abs(perpPnl) / totalAbsPnl;

  return { perpPnl, spotPnl, perpFraction };
}

function snapshotCumulativePnl(snapshot: PortfolioSnapshot): number {
  const history = snapshot.pnlHistory;
  if (history.length < 2) return 0;
  return parseFloat(history[history.length - 1][1]) - parseFloat(history[0][1]);
}
