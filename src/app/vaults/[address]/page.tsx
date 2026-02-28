"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVaultDetails } from "@/lib/hooks/use-vault-details";
import { VaultHeader } from "@/components/vault-detail/vault-header";
import { MetricsGrid } from "@/components/vault-detail/metrics-grid";
import { PerformanceChart } from "@/components/vault-detail/performance-chart";
import { DrawdownChart } from "@/components/vault-detail/drawdown-chart";
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

  const metrics = useMemo(() => {
    if (!vault) return null;
    const allTime = vault.portfolio.find(([period]) => period === "allTime");
    if (!allTime) return null;
    const avHistory = parseTimeSeries(allTime[1].accountValueHistory);
    const pnlHistory = parseTimeSeries(allTime[1].pnlHistory);
    return computeVaultMetrics(avHistory, pnlHistory);
  }, [vault]);

  const accountValueData = useMemo((): TimeSeries => {
    if (!vault) return [];
    const allTime = vault.portfolio.find(([period]) => period === "allTime");
    if (!allTime) return [];
    return parseTimeSeries(allTime[1].accountValueHistory);
  }, [vault]);

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
          <MetricsGrid metrics={metrics} apr={vault.apr} />
          <PerformanceChart data={accountValueData} />
          <DrawdownChart data={metrics.drawdownSeries} />
        </>
      )}
    </main>
  );
}
