"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVaultDetails } from "@/lib/hooks/use-vault-details";
import { useVaultPositions } from "@/lib/hooks/use-vault-positions";
import { VaultHeader } from "@/components/vault-detail/vault-header";
import { MetricsGrid } from "@/components/vault-detail/metrics-grid";
import { PerformanceChart } from "@/components/vault-detail/performance-chart";
import { DrawdownChart } from "@/components/vault-detail/drawdown-chart";
import { PositionSummary } from "@/components/vault-detail/position-summary";
import { PositionsTable } from "@/components/vault-detail/positions-table";
import { BenchmarkSection } from "@/components/vault-detail/benchmark-section";
import { AiAnalysis } from "@/components/vault-detail/ai-analysis";
import { computeVaultMetrics } from "@/lib/metrics";
import type { TimeSeries } from "@/lib/metrics";

function parseTimeSeries(raw: [number, string][]): TimeSeries {
  return raw.map(([ts, val]) => [ts, parseFloat(val)]);
}

export default function VaultDetailPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = use(params);
  const { data: vault, isLoading, error } = useVaultDetails(address);
  const { data: positions } = useVaultPositions(address);

  const allTimeSnapshot = useMemo(() => {
    if (!vault) return null;
    return vault.portfolio.find(([period]) => period === "allTime") ?? null;
  }, [vault]);

  const metrics = useMemo(() => {
    if (!allTimeSnapshot) return null;
    const avHistory = parseTimeSeries(allTimeSnapshot[1].accountValueHistory);
    const pnlHistory = parseTimeSeries(allTimeSnapshot[1].pnlHistory);
    return computeVaultMetrics(avHistory, pnlHistory);
  }, [allTimeSnapshot]);

  const accountValueData = useMemo((): TimeSeries => {
    if (!allTimeSnapshot) return [];
    return parseTimeSeries(allTimeSnapshot[1].accountValueHistory);
  }, [allTimeSnapshot]);

  const volume = useMemo(() => {
    if (!allTimeSnapshot) return undefined;
    return parseFloat(allTimeSnapshot[1].vlm);
  }, [allTimeSnapshot]);

  const tvl = useMemo(() => {
    if (!vault) return undefined;
    // Derive TVL from latest account value in the allTime snapshot
    if (!allTimeSnapshot) return undefined;
    const avHistory = allTimeSnapshot[1].accountValueHistory;
    if (avHistory.length === 0) return undefined;
    return parseFloat(avHistory[avHistory.length - 1][1]);
  }, [vault, allTimeSnapshot]);

  if (isLoading) {
    return (
      <main className="container mx-auto py-8 px-4">
        <div className="py-10 text-center text-muted-foreground">Loading vault details...</div>
      </main>
    );
  }

  if (error || !vault) {
    return (
      <main className="container mx-auto py-8 px-4">
        <div className="py-10 text-center text-red-600">
          Failed to load vault: {error?.message ?? "Not found"}
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto py-8 px-4 space-y-6">
      <Link href="/">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to vaults
        </Button>
      </Link>

      <VaultHeader vault={vault} />

      {metrics && (
        <>
          <MetricsGrid metrics={metrics} apr={vault.apr} volume={volume} tvl={tvl} />
          <PerformanceChart data={accountValueData} />
          <DrawdownChart data={metrics.drawdownSeries} />
        </>
      )}

      {accountValueData.length > 0 && (
        <BenchmarkSection accountValueHistory={accountValueData} />
      )}

      {positions && (
        <>
          <PositionSummary
            positions={positions}
            leaderFraction={vault.leaderFraction}
            maxDistributable={vault.maxDistributable}
            maxWithdrawable={vault.maxWithdrawable}
          />
          <PositionsTable positions={positions} />
        </>
      )}

      {metrics && (
        <AiAnalysis
          vault={vault}
          metrics={metrics}
          positions={positions}
          tvl={tvl}
        />
      )}
    </main>
  );
}
