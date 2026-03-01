"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRatio, formatPercent } from "@/lib/utils/format";
import { useBenchmark } from "@/lib/hooks/use-benchmark";
import { beta, alpha, informationRatio } from "@/lib/metrics/benchmark";
import { annualizedReturn, dailyReturns } from "@/lib/metrics/returns";
import type { TimeSeries } from "@/lib/metrics";

function MetricCard({
  title,
  value,
  className,
}: {
  title: string;
  value: string;
  className?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-xl font-bold ${className ?? ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

interface BenchmarkSectionProps {
  accountValueHistory: TimeSeries;
}

export function BenchmarkSection({
  accountValueHistory,
}: BenchmarkSectionProps) {
  const startMs = accountValueHistory.length > 0 ? accountValueHistory[0][0] : undefined;
  const endMs =
    accountValueHistory.length > 0
      ? accountValueHistory[accountValueHistory.length - 1][0]
      : undefined;

  const { data: btcSeries, isLoading: btcLoading, error: btcError } = useBenchmark("BTC", startMs, endMs);
  const { data: hypeSeries, isLoading: hypeLoading, error: hypeError } = useBenchmark("HYPE", startMs, endMs);

  const vaultDaily = useMemo(
    () => dailyReturns(accountValueHistory),
    [accountValueHistory],
  );
  const vaultAnnReturn = useMemo(
    () => annualizedReturn(accountValueHistory),
    [accountValueHistory],
  );

  const btcMetrics = useMemo(() => {
    if (!btcSeries) return null;
    const aligned = alignReturns(vaultDaily, btcSeries.dailyReturns);
    const b = beta(aligned.vault, aligned.benchmark);
    const benchAnnReturn = meanReturn(btcSeries.dailyReturns) * 365;
    return {
      beta: b,
      alpha: alpha(vaultAnnReturn, benchAnnReturn, b),
      ir: informationRatio(aligned.vault, aligned.benchmark),
    };
  }, [btcSeries, vaultDaily, vaultAnnReturn]);

  const hypeMetrics = useMemo(() => {
    if (!hypeSeries) return null;
    const aligned = alignReturns(vaultDaily, hypeSeries.dailyReturns);
    const b = beta(aligned.vault, aligned.benchmark);
    const benchAnnReturn = meanReturn(hypeSeries.dailyReturns) * 365;
    return {
      beta: b,
      alpha: alpha(vaultAnnReturn, benchAnnReturn, b),
      ir: informationRatio(aligned.vault, aligned.benchmark),
    };
  }, [hypeSeries, vaultDaily, vaultAnnReturn]);

  // Don't render the section at all if benchmark data is unavailable (no API key)
  if (btcError && hypeError) {
    return null;
  }

  if (btcLoading || hypeLoading) {
    return (
      <div className="text-sm text-muted-foreground">
        Loading benchmark data...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">Benchmark Analysis</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {btcMetrics && (
          <>
            <MetricCard title="Beta (BTC)" value={formatRatio(btcMetrics.beta)} />
            <MetricCard
              title="Alpha (BTC)"
              value={formatPercent(btcMetrics.alpha)}
              className={btcMetrics.alpha >= 0 ? "text-accent-teal" : "text-[#f85149]"}
            />
            <MetricCard title="IR (BTC)" value={formatRatio(btcMetrics.ir)} />
          </>
        )}
        {hypeMetrics && (
          <>
            <MetricCard title="Beta (HYPE)" value={formatRatio(hypeMetrics.beta)} />
            <MetricCard
              title="Alpha (HYPE)"
              value={formatPercent(hypeMetrics.alpha)}
              className={hypeMetrics.alpha >= 0 ? "text-accent-teal" : "text-[#f85149]"}
            />
            <MetricCard title="IR (HYPE)" value={formatRatio(hypeMetrics.ir)} />
          </>
        )}
      </div>
    </div>
  );
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

function meanReturn(returns: number[]): number {
  if (returns.length === 0) return 0;
  return returns.reduce((s, v) => s + v, 0) / returns.length;
}
