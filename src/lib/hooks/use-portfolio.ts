"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useBenchmark } from "./use-benchmark";
import type { VaultDetails, VaultPositions } from "@/lib/api/types";
import type { DeepDiveMetrics, DeepDivePeriod } from "@/lib/metrics/deep-dive";
import type { TimeSeries } from "@/lib/metrics/returns";
import { pnlBasedDailyReturns } from "@/lib/metrics";
import { annualizedVolatility } from "@/lib/metrics/risk";
import { correlationMatrix } from "@/lib/metrics/benchmark";
import {
  computeDeepDiveMetrics,
  stripLeadingZeros,
  sliceToPeriod,
} from "@/lib/metrics/deep-dive";
import { computePortfolioMetrics, computePortfolioPerformanceSeries } from "@/lib/portfolio/metrics";
import { efficientFrontier, covarianceMatrix } from "@/lib/portfolio/optimizer";
import type { PortfolioMetrics, EfficientFrontierPoint, PortfolioConstraints } from "@/lib/portfolio/types";
import { DEFAULT_CONSTRAINTS } from "@/lib/portfolio/types";

function parseTimeSeries(raw: [number, string][]): TimeSeries {
  return raw.map(([ts, val]) => [ts, parseFloat(val)]);
}

async function getVaultDetails(address: string): Promise<VaultDetails> {
  const res = await fetch(`/api/vaults/${address}`);
  if (!res.ok) throw new Error("Failed to fetch vault details");
  return res.json();
}

async function getVaultPositions(address: string): Promise<VaultPositions> {
  const res = await fetch(`/api/vaults/${address}/positions`);
  if (!res.ok) throw new Error("Failed to fetch vault positions");
  return res.json();
}

export interface PortfolioData {
  vaults: VaultDetails[];
  positions: VaultPositions[];
  perVaultMetrics: (DeepDiveMetrics | null)[];
  portfolioMetrics: PortfolioMetrics | null;
  frontierPoints: EfficientFrontierPoint[];
  correlationData: {
    names: string[];
    matrix: number[][];
    dailyReturns: number[][];
  };
  performanceSeries: TimeSeries;
  btcReturns: number[] | null;
  isLoading: boolean;
}

export function usePortfolio(
  selectedAddresses: string[],
  weights: number[],
  period: DeepDivePeriod = "ITD",
  constraints: PortfolioConstraints = DEFAULT_CONSTRAINTS,
): PortfolioData {
  // Fetch vault details for all selected
  const detailQueries = useQueries({
    queries: selectedAddresses.map((addr) => ({
      queryKey: ["vault", addr],
      queryFn: () => getVaultDetails(addr),
      enabled: !!addr,
      staleTime: 5 * 60 * 1000,
    })),
  });

  // Fetch positions for each vault
  const positionQueries = useQueries({
    queries: selectedAddresses.map((addr) => ({
      queryKey: ["vault-positions", addr],
      queryFn: () => getVaultPositions(addr),
      enabled: !!addr,
      staleTime: 60 * 1000,
    })),
  });

  const isLoading = detailQueries.some((q) => q.isLoading) ||
    positionQueries.some((q) => q.isLoading);

  // Time range for benchmarks
  const timeRange = useMemo(() => {
    let minTs = Infinity;
    let maxTs = -Infinity;
    for (const q of detailQueries) {
      if (!q.data) continue;
      const allTime = q.data.portfolio.find(([p]) => p === "allTime");
      if (!allTime) continue;
      const avh = allTime[1].accountValueHistory;
      if (avh.length > 0) {
        if (avh[0][0] < minTs) minTs = avh[0][0];
        if (avh[avh.length - 1][0] > maxTs) maxTs = avh[avh.length - 1][0];
      }
    }
    return minTs < Infinity ? { start: minTs, end: maxTs } : undefined;
  }, [detailQueries]);

  const { data: btcBenchmark } = useBenchmark("BTC", timeRange?.start, timeRange?.end);
  const { data: hypeBenchmark } = useBenchmark("HYPE", timeRange?.start, timeRange?.end);

  // Extract vaults, metrics, and daily returns
  const computed = useMemo(() => {
    const vaults: VaultDetails[] = [];
    const positions: VaultPositions[] = [];
    const perVaultMetrics: (DeepDiveMetrics | null)[] = [];
    const allDailyReturns: number[][] = [];
    const allAvHistories: TimeSeries[] = [];
    const individualVols: number[] = [];
    const vaultNames: string[] = [];
    const meanReturns: number[] = [];

    for (let i = 0; i < detailQueries.length; i++) {
      const vaultData = detailQueries[i].data;
      if (!vaultData) continue;

      const allTime = vaultData.portfolio.find(([p]) => p === "allTime");
      if (!allTime) continue;

      const avHistory = parseTimeSeries(allTime[1].accountValueHistory);
      const pnlHistory = parseTimeSeries(allTime[1].pnlHistory);
      const cleaned = sliceToPeriod(stripLeadingZeros(avHistory), period);
      const cleanedPnl = sliceToPeriod(pnlHistory, period);

      const metrics = computeDeepDiveMetrics(avHistory, pnlHistory, period);
      const dailyRets = pnlBasedDailyReturns(cleaned, cleanedPnl);

      vaults.push(vaultData);
      positions.push(positionQueries[i]?.data ?? { perp: { assetPositions: [], marginSummary: { accountValue: "0", totalMarginUsed: "0", totalNtlPos: "0", totalRawUsd: "0" }, withdrawable: "0", time: 0 }, spot: { balances: [] } });
      perVaultMetrics.push(metrics);
      allDailyReturns.push(dailyRets);
      allAvHistories.push(avHistory);
      individualVols.push(annualizedVolatility(dailyRets));
      vaultNames.push(vaultData.name ?? vaultData.vaultAddress);
      meanReturns.push(metrics?.annReturn ?? 0);
    }

    return {
      vaults,
      positions,
      perVaultMetrics,
      allDailyReturns,
      allAvHistories,
      individualVols,
      vaultNames,
      meanReturns,
    };
  }, [detailQueries, positionQueries, period]);

  // Correlation matrix
  const correlationData = useMemo(() => {
    if (computed.allDailyReturns.length < 2) {
      return { names: computed.vaultNames, matrix: [], dailyReturns: computed.allDailyReturns };
    }
    const matrix = correlationMatrix(computed.allDailyReturns);
    return { names: computed.vaultNames, matrix, dailyReturns: computed.allDailyReturns };
  }, [computed.allDailyReturns, computed.vaultNames]);

  // Portfolio metrics
  const portfolioMetrics = useMemo(() => {
    if (computed.vaults.length === 0 || weights.length !== computed.vaults.length) return null;

    return computePortfolioMetrics(
      computed.allDailyReturns,
      weights,
      computed.individualVols,
      btcBenchmark?.dailyReturns,
      hypeBenchmark?.dailyReturns,
    );
  }, [computed, weights, btcBenchmark, hypeBenchmark]);

  // Efficient frontier
  const frontierPoints = useMemo(() => {
    if (computed.vaults.length < 2) return [];

    const cov = covarianceMatrix(computed.allDailyReturns);
    return efficientFrontier(computed.meanReturns, cov, constraints, 20);
  }, [computed.allDailyReturns, computed.meanReturns, constraints]);

  // Performance series
  const performanceSeries = useMemo(() => {
    if (computed.vaults.length === 0 || weights.length !== computed.vaults.length) return [];
    return computePortfolioPerformanceSeries(computed.allAvHistories, weights);
  }, [computed.allAvHistories, weights]);

  return {
    vaults: computed.vaults,
    positions: computed.positions,
    perVaultMetrics: computed.perVaultMetrics,
    portfolioMetrics,
    frontierPoints,
    correlationData,
    performanceSeries,
    btcReturns: btcBenchmark?.dailyReturns ?? null,
    isLoading,
  };
}
