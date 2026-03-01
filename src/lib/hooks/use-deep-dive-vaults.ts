"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useVaults } from "./use-vaults";
import { useBenchmark } from "./use-benchmark";
import type { VaultDetails, VaultListItem } from "@/lib/api/types";
import type { DeepDiveMetrics } from "@/lib/metrics/deep-dive";
import type { TimeSeries } from "@/lib/metrics";
import { dailyReturns } from "@/lib/metrics";
import { beta } from "@/lib/metrics/benchmark";
import {
  filterQualifyingVaults,
  pickTopVaults,
  computeDeepDiveMetrics,
} from "@/lib/metrics/deep-dive";

export interface DeepDiveRow {
  vault: VaultDetails;
  listItem: VaultListItem;
  metrics: DeepDiveMetrics | null;
  accountValueHistory: TimeSeries;
}

function parseTimeSeries(raw: [number, string][]): TimeSeries {
  return raw.map(([ts, val]) => [ts, parseFloat(val)]);
}

async function getVaultDetails(address: string): Promise<VaultDetails> {
  const res = await fetch(`/api/vaults/${address}`);
  if (!res.ok) throw new Error("Failed to fetch vault details");
  return res.json();
}

export function useDeepDiveVaults(minTvl: number, minAgeDays: number) {
  const { data: allVaults, isLoading: listLoading } = useVaults();

  const qualifying = useMemo(() => {
    if (!allVaults) return [];
    const filtered = filterQualifyingVaults(allVaults, minTvl, minAgeDays);
    return pickTopVaults(filtered, 10);
  }, [allVaults, minTvl, minAgeDays]);

  const detailQueries = useQueries({
    queries: qualifying.map((v) => ({
      queryKey: ["vault", v.summary.vaultAddress],
      queryFn: () => getVaultDetails(v.summary.vaultAddress),
      enabled: !!v.summary.vaultAddress,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const detailsLoading = detailQueries.some((q) => q.isLoading);

  // Compute time range across all fetched vaults for benchmark data
  const timeRange = useMemo(() => {
    let minTs = Infinity;
    let maxTs = -Infinity;
    for (const q of detailQueries) {
      if (!q.data) continue;
      const allTime = q.data.portfolio.find(([p]) => p === "allTime");
      if (!allTime) continue;
      const avh = allTime[1].accountValueHistory;
      if (avh.length > 0) {
        const first = avh[0][0];
        const last = avh[avh.length - 1][0];
        if (first < minTs) minTs = first;
        if (last > maxTs) maxTs = last;
      }
    }
    return minTs < Infinity ? { start: minTs, end: maxTs } : undefined;
  }, [detailQueries]);

  const { data: btcBenchmark } = useBenchmark("BTC", timeRange?.start, timeRange?.end);
  const { data: hypeBenchmark } = useBenchmark("HYPE", timeRange?.start, timeRange?.end);

  const rows: DeepDiveRow[] = useMemo(() => {
    return detailQueries
      .map((q, i) => {
        if (!q.data) return null;
        const vault = q.data;
        const listItem = qualifying[i];
        const allTime = vault.portfolio.find(([p]) => p === "allTime");
        if (!allTime) return null;

        const avHistory = parseTimeSeries(allTime[1].accountValueHistory);
        const metrics = computeDeepDiveMetrics(avHistory);

        // Enrich with beta if benchmark data is available
        if (metrics) {
          const vaultDaily = dailyReturns(avHistory);
          if (btcBenchmark) {
            const aligned = alignReturns(vaultDaily, btcBenchmark.dailyReturns);
            metrics.betaBtc = beta(aligned.vault, aligned.benchmark);
          }
          if (hypeBenchmark) {
            const aligned = alignReturns(vaultDaily, hypeBenchmark.dailyReturns);
            metrics.betaHype = beta(aligned.vault, aligned.benchmark);
          }
        }

        return { vault, listItem, metrics, accountValueHistory: avHistory };
      })
      .filter(Boolean) as DeepDiveRow[];
  }, [detailQueries, qualifying, btcBenchmark, hypeBenchmark]);

  return {
    rows,
    qualifying,
    isLoading: listLoading || detailsLoading,
    isListLoading: listLoading,
    isDetailsLoading: detailsLoading,
  };
}

/**
 * Align vault and benchmark daily returns to the same length.
 * Takes the shorter of the two, trimmed from the start.
 */
function alignReturns(
  vault: number[],
  benchmark: number[],
): { vault: number[]; benchmark: number[] } {
  const minLen = Math.min(vault.length, benchmark.length);
  return {
    vault: vault.slice(vault.length - minLen),
    benchmark: benchmark.slice(benchmark.length - minLen),
  };
}
